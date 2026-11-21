import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { nextTick, ref, shallowRef, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn, STableInstance } from '../../types';

interface Row {
  id: number;
  name: string;
}

const columns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: 'Name' },
];

let app: App | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('customRow / customCell / customHeaderCell', () => {
  it.each(['row', 'simple-cell', 'complex-cell'] as const)(
    '%s 稳定回调持续追踪外部 ref，并移除旧属性和事件',
    async (target) => {
      const phase = shallowRef(0);
      const clicked = vi.fn();
      const customAttrs = vi.fn(() => {
        const value = phase.value;
        return value === 3
          ? undefined
          : {
              class: `phase-${value}`,
              style: { color: ['red', 'blue', 'green'][value] },
              title: `title-${value}`,
              'data-phase': value,
              onClick: clicked,
            };
      });
      const mounted = mountSTable<Row>({
        columns: [
          {
            id: 'name',
            accessorKey: 'name',
            header: 'Name',
            ...(target === 'complex-cell' ? { onCell: () => ({ colSpan: 1 }) } : {}),
          },
        ],
        dataSource: [{ id: 1, name: 'a' }],
        rowKey: 'id',
        ...(target === 'row' ? { customRow: customAttrs } : { customCell: customAttrs }),
      });
      app = mounted.app;
      host = mounted.host;
      await nextTick();

      const element = () =>
        host!.querySelector<HTMLElement>(
          target === 'row' ? 'tbody tr.s-table-row' : 'tbody td[data-column-id="name"]'
        )!;
      expect(element().dataset.phase).toBe('0');
      customAttrs.mockClear();
      for (let value = 1; value <= 2; value++) {
        phase.value = value;
        await nextTick();
        expect(element().classList).toContain(`phase-${value}`);
        expect(element().classList).not.toContain(`phase-${value - 1}`);
        expect(element().style.color).toBe(['red', 'blue', 'green'][value]);
        expect(element().title).toBe(`title-${value}`);
        expect(element().dataset.phase).toBe(String(value));
        expect(customAttrs).toHaveBeenCalledTimes(value);
      }
      element().click();
      expect(clicked).toHaveBeenCalledTimes(1);

      phase.value = 3;
      await nextTick();
      expect(element().className).not.toContain('phase-');
      expect(element().style.color).toBe('');
      expect(element().hasAttribute('title')).toBe(false);
      expect(element().hasAttribute('data-phase')).toBe(false);
      element().click();
      expect(clicked).toHaveBeenCalledTimes(1);

      phase.value = 0;
      await nextTick();
      expect(element().dataset.phase).toBe('0');
      element().click();
      expect(clicked).toHaveBeenCalledTimes(2);
    }
  );

  it.each(['row', 'simple-cell', 'complex-cell'] as const)(
    '%s 回调替换、移除和恢复不复用旧属性或事件',
    async (target) => {
      const firstClick = vi.fn();
      const secondClick = vi.fn();
      const first = () => ({ class: 'first', title: 'first', onClick: firstClick });
      const second = () => ({ class: 'second', title: 'second', onClick: secondClick });
      const callback = shallowRef<typeof first | undefined>(first);
      const dataSource = [{ id: 1, name: 'a' }];
      const renderColumns: STableColumn<Row>[] = [
        {
          id: 'name',
          accessorKey: 'name',
          header: 'Name',
          ...(target === 'complex-cell' ? { onCell: () => ({ colSpan: 1 }) } : {}),
        },
      ];
      const mounted = mountSTable<Row>(() => ({
        columns: renderColumns,
        dataSource,
        rowKey: 'id',
        ...(target === 'row' ? { customRow: callback.value } : { customCell: callback.value }),
      }));
      app = mounted.app;
      host = mounted.host;
      await nextTick();
      const element = () =>
        host!.querySelector<HTMLElement>(
          target === 'row' ? 'tbody tr.s-table-row' : 'tbody td[data-column-id="name"]'
        )!;
      element().click();
      expect(firstClick).toHaveBeenCalledTimes(1);

      callback.value = second;
      await nextTick();
      expect(element().classList).toContain('second');
      expect(element().classList).not.toContain('first');
      expect(element().title).toBe('second');
      element().click();
      expect(firstClick).toHaveBeenCalledTimes(1);
      expect(secondClick).toHaveBeenCalledTimes(1);

      callback.value = undefined;
      await nextTick();
      expect(element().classList).not.toContain('second');
      expect(element().hasAttribute('title')).toBe(false);
      element().click();
      expect(secondClick).toHaveBeenCalledTimes(1);

      callback.value = first;
      await nextTick();
      expect(element().classList).toContain('first');
      expect(element().title).toBe('first');
      element().click();
      expect(firstClick).toHaveBeenCalledTimes(2);
    }
  );

  it('同一 Cell 排序后使用当前索引，列替换后使用当前原始列', async () => {
    const tableRef = ref<STableInstance<Row>>();
    const renderColumns = shallowRef<STableColumn<Row>[]>([
      { id: 'name', accessorKey: 'name', header: 'First', sorter: true },
    ]);
    const dataSource = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ];
    const customCell = vi.fn((record: Row, index: number, column: STableColumn<Row>) => ({
      title: `${record.id}:${index}:${column.header}`,
    }));
    const mounted = mountSTable<Row>(() => ({
      columns: renderColumns.value,
      dataSource,
      rowKey: 'id',
      customCell,
      ref: tableRef,
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();
    const table = tableRef.value!.getTanStackTable();
    const before = table.getRow('n:1').getAllCells()[0];
    const titles = () =>
      [...host!.querySelectorAll<HTMLElement>('tbody td')].map((cell) => cell.title);
    expect(titles()).toEqual(['1:0:First', '2:1:First']);

    table.getColumn('name')!.toggleSorting(true);
    await nextTick();
    expect(table.getRow('n:1').getAllCells()[0]).toBe(before);
    expect(titles()).toEqual(['2:0:First', '1:1:First']);
    renderColumns.value = [{ ...renderColumns.value[0]!, header: 'Second' }];
    await nextTick();
    expect(titles()).toEqual(['2:0:Second', '1:1:Second']);
    expect(customCell.mock.calls.at(-1)![2]).toBe(renderColumns.value[0]);
  });

  it('customCell 每轮只求值窗口内的真实单元格，不求值列 spacer', async () => {
    const phase = shallowRef(0);
    const customCell = vi.fn((record: Row, rowIndex: number, column: STableColumn<Row>) => ({
      class: `phase-${phase.value}`,
      style: { color: 'red' },
      title: `${record.id}:${rowIndex}:${column.id}:${phase.value}`,
    }));
    const mounted = mountSTable<Row>({
      columns: Array.from({ length: 100 }, (_, index) => ({
        id: `name-${index}`,
        accessorKey: 'name',
        header: String(index),
        width: 120,
      })),
      dataSource: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
      rowKey: 'id',
      virtual: { x: true, y: false, columnOverscan: 1 },
      customCell,
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();
    const cells = [...host.querySelectorAll<HTMLElement>('tbody td[data-column-id]')];
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.length).toBeLessThan(40);
    expect(host.querySelector('tbody .s-table-column-virtual-spacer')).not.toBeNull();
    customCell.mockClear();
    phase.value++;
    await nextTick();
    expect(customCell).toHaveBeenCalledTimes(cells.length);
    expect(customCell.mock.calls.map(([record, , column]) => `${record.id}:${column.id}`)).toEqual(
      cells.map(
        (cell) => `${cell.closest<HTMLElement>('tr')!.dataset.rowKey}:${cell.dataset.columnId}`
      )
    );
    expect(cells.every((cell) => cell.title.endsWith(':1'))).toBe(true);
  });

  it('groupRow 插槽替代分组单元格时不求值其 customCell', async () => {
    const customCell = vi.fn((_record: Row, _index: number) => ({ title: 'leaf' }));
    const mounted = mountSTable<Row>(
      {
        columns: [{ id: 'name', accessorKey: 'name', groupable: true }],
        dataSource: [{ id: 1, name: 'a' }],
        rowKey: 'id',
        defaultGroupBy: ['name'],
        customCell,
      },
      { groupRow: () => 'Group' }
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();
    expect(host.querySelectorAll('tbody td[data-column-id]')).toHaveLength(1);
    expect(customCell.mock.calls.every(([, index]) => index === 1)).toBe(true);
  });

  it('注入 tr / td / th 属性并合并 class、style 与事件', async () => {
    const cellClick = vi.fn();
    const rowClick = vi.fn();
    const mounted = mountSTable<Row>({
      columns,
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
      customRow: () => ({
        'data-test-row': 'yes',
        class: 'user-row',
        style: { outline: '1px solid red' },
        onClick: rowClick,
        'data-row-id': 'hijacked',
        colspan: 99,
      }),
      customCell: (record: Row, rowIndex: number, column: STableColumn<Row>) =>
        column.id === 'name'
          ? {
              'data-test-cell': `${rowIndex}-${record.id}`,
              class: 'user-cell',
              onClick: cellClick,
              colspan: 99,
            }
          : undefined,
      customHeaderCell: (column: STableColumn<Row>) =>
        column.id === 'name' ? { 'data-test-header': 'yes', title: 'Name column' } : undefined,
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const row = host.querySelector<HTMLElement>('tbody tr.s-table-row')!;
    expect(row.getAttribute('data-test-row')).toBe('yes');
    expect(row.classList.contains('user-row')).toBe(true);
    expect(row.style.outline).toContain('red');
    // 保留属性不可被覆盖。
    expect(row.getAttribute('data-row-id')).toBe('n:1');
    row.click();
    expect(rowClick).toHaveBeenCalledTimes(1);

    const nameCell = row.querySelector<HTMLElement>('td[data-column-id="name"]')!;
    expect(nameCell.getAttribute('data-test-cell')).toBe('0-1');
    expect(nameCell.classList.contains('user-cell')).toBe(true);
    expect(nameCell.getAttribute('colspan')).toBeNull();
    nameCell.click();
    expect(cellClick).toHaveBeenCalledTimes(1);

    const header = host.querySelector<HTMLElement>('th[data-column-id="name"]')!;
    expect(header.getAttribute('data-test-header')).toBe('yes');
    expect(header.getAttribute('title')).toBe('Name column');
  });
});
