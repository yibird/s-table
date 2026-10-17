import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick, reactive, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn, STableRowOrderChangeEvent } from '../../types';

interface Row {
  id: number;
  name: string;
}

let app: App | null = null;
let host: HTMLElement | null = null;

const columns: STableColumn<Row>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Name' },
];

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('行拖拽排', () => {
  it('客户端分页后使用可见索引拖拽，并保留完整数据', async () => {
    const dataSource: Row[] = Array.from({ length: 5 }, (_, index) => ({
      id: index + 1,
      name: `row-${index + 1}`,
    }));
    const events: Array<{ dataSource: Row[]; fromIndex: number; toIndex: number }> = [];
    const dataUpdates: Row[][] = [];
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      rowKey: 'id',
      rowDrag: true,
      pagination: { defaultCurrent: 2, defaultPageSize: 2 },
      'onUpdate:dataSource': (value: Row[]) => dataUpdates.push(value),
      onRowOrderChange: (payload: { dataSource: Row[]; fromIndex: number; toIndex: number }) =>
        events.push(payload),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const rows = Array.from(host.querySelectorAll<HTMLElement>('tbody tr.s-table-row'));
    expect(rows.map((row) => row.dataset.rowKey)).toEqual(['3', '4']);

    const firstHandle = rows[0]!.querySelector<HTMLElement>('.s-table-drag-handle')!;
    expect(firstHandle.querySelectorAll('svg.s-table-icon > circle')).toHaveLength(6);
    firstHandle.dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }));
    rows[1]!.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    rows[1]!.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    await nextTick();

    expect(events).toHaveLength(1);
    expect(events[0]!.fromIndex).toBe(0);
    expect(events[0]!.toIndex).toBe(1);
    expect(events[0]!.dataSource.map((row) => row.id)).toEqual([1, 2, 4, 3, 5]);
    expect(dataUpdates.at(-1)?.map((row) => row.id)).toEqual([1, 2, 4, 3, 5]);
  });

  it('多选拖拽一次收集来源索引并保持可见顺序', async () => {
    const dataSource: Row[] = Array.from({ length: 4 }, (_, index) => ({
      id: index + 1,
      name: `row-${index + 1}`,
    }));
    const events: STableRowOrderChangeEvent<Row>[] = [];
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      rowKey: 'id',
      rowSelection: { type: 'checkbox' },
      defaultSelectedRowKeys: [2, 3],
      rowDrag: { multiple: true },
      onRowOrderChange: (payload: STableRowOrderChangeEvent<Row>) => events.push(payload),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const rows = Array.from(host.querySelectorAll<HTMLElement>('tbody tr.s-table-row'));
    const sourceRow = rows.find((row) => row.dataset.rowKey === '2')!;
    const targetRow = rows.find((row) => row.dataset.rowKey === '4')!;
    sourceRow
      .querySelector<HTMLElement>('.s-table-drag-handle')!
      .dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }));
    targetRow.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    targetRow.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    await nextTick();

    expect(events).toHaveLength(1);
    expect(events[0]!.fromIndices).toEqual([1, 2]);
    expect(events[0]!.rowKeys).toEqual([2, 3]);
    expect(events[0]!.dataSource.map((row) => row.id)).toEqual([1, 4, 2, 3]);
  });

  it('行拖拽句柄按下时不启动单元格框选', async () => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource: [
        { id: 1, name: 'row-1' },
        { id: 2, name: 'row-2' },
      ],
      rowKey: 'id',
      rowDrag: true,
      cellRangeSelection: { mode: 'cell' },
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const handle = host.querySelector<HTMLElement>('.s-table-drag-handle')!;
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    handle.dispatchEvent(event);
    await nextTick();

    expect(event.defaultPrevented).toBe(false);
    expect(host.querySelectorAll('.s-table-cell-range-selected')).toHaveLength(0);
  });

  it('排序激活时禁用手工行重排，避免视觉顺序dataSource 顺序错配', async () => {
    const sortableColumns: STableColumn<Row>[] = [
      { accessorKey: 'id', header: 'ID', sorter: true },
      { accessorKey: 'name', header: 'Name' },
    ];
    const events: unknown[] = [];
    const mounted = mountSTable<Row>({
      columns: sortableColumns,
      dataSource: [
        { id: 2, name: 'row-2' },
        { id: 1, name: 'row-1' },
      ],
      rowKey: 'id',
      rowDrag: true,
      onRowOrderChange: (payload: unknown) => events.push(payload),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host.querySelector<HTMLElement>('.s-table-column-sorter')!.click();
    await nextTick();

    const rows = Array.from(host.querySelectorAll<HTMLElement>('tbody tr.s-table-row'));
    const firstHandle = rows[0]!.querySelector<HTMLElement>('.s-table-drag-handle')!;
    expect(firstHandle.getAttribute('draggable')).toBe('false');
    expect(firstHandle.getAttribute('aria-disabled')).toBe('true');

    firstHandle.dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }));
    rows[1]!.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    rows[1]!.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    await nextTick();

    expect(events).toHaveLength(0);
  });

  it.each([
    {
      name: '分组',
      props: {
        columns: [
          { id: 'name', accessorKey: 'name', header: 'Name', groupable: true },
        ] as STableColumn<Row>[],
        defaultGroupBy: ['name'],
      },
    },
    {
      name: '固定行',
      props: { columns, defaultPinnedRowKeys: { top: [2] } },
    },
  ])('$name 激活时禁用行拖拽', async ({ props }) => {
    const mounted = mountSTable<Row>({
      ...props,
      dataSource: [
        { id: 1, name: 'row-1' },
        { id: 2, name: 'row-2' },
      ],
      rowKey: 'id',
      rowDrag: true,
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const handles = [...host.querySelectorAll<HTMLElement>('.s-table-drag-handle')];
    expect(handles.length).toBeGreaterThan(0);
    expect(handles.every((handle) => handle.getAttribute('draggable') === 'false')).toBe(true);
  });

  it('非本表行拖拽经过时不阻止默认行为，也不读取行布局', async () => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource: [
        { id: 1, name: 'row-1' },
        { id: 2, name: 'row-2' },
      ],
      rowKey: 'id',
      rowDrag: true,
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const row = host.querySelector<HTMLElement>('tbody tr.s-table-row')!;
    const readLayout = vi.spyOn(row, 'getBoundingClientRect');
    const event = new Event('dragover', { bubbles: true, cancelable: true });
    row.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(readLayout).not.toHaveBeenCalled();
  });

  it('异步 beforeDrop 等待期间数据变化时放弃过期行重排', async () => {
    const state = reactive({
      data: [
        { id: 1, name: 'row-1' },
        { id: 2, name: 'row-2' },
      ] as Row[],
    });
    const events: STableRowOrderChangeEvent<Row>[] = [];
    let resolveDrop!: (accepted: boolean) => void;
    const beforeDrop = () =>
      new Promise<boolean>((resolve) => {
        resolveDrop = resolve;
      });
    const mounted = mountSTable<Row>(() => ({
      columns,
      dataSource: state.data,
      rowKey: 'id',
      rowDrag: { beforeDrop },
      onRowOrderChange: (payload: STableRowOrderChangeEvent<Row>) => events.push(payload),
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const rows = Array.from(host.querySelectorAll<HTMLElement>('tbody tr.s-table-row'));
    rows[0]!
      .querySelector<HTMLElement>('.s-table-drag-handle')!
      .dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }));
    rows[1]!.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    rows[1]!.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));

    state.data = [...state.data, { id: 3, name: 'row-3' }];
    await nextTick();
    resolveDrop(true);
    await Promise.resolve();
    await nextTick();

    expect(events).toEqual([]);
    expect(state.data.map((row) => row.id)).toEqual([1, 2, 3]);
  });
});
