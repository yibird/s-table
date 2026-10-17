import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick, reactive, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableCellRange, STableColumn, STableInstance } from '../../types';
import { createCellRangeClipboard } from '../../utils';

interface Row {
  id: number;
  name: string;
}

let app: App | null = null;
let host: HTMLElement | null = null;

const columns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: 'Name' },
];

const dataSource: Row[] = [
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
];

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('cellRangeSelection', () => {
  it('复制表头只序列化文本，渲染函数或 VNode 回退为列 ID', () => {
    const clipboard = createCellRangeClipboard({
      getRange: () => ({ startRow: 0, startCol: 0, endRow: 0, endCol: 1 }),
      getColumnIds: () => ['name', 'score'],
      getSelectedValues: () => [['Ada', 99]],
      getColumnHeader: (columnId) => (columnId === 'name' ? () => '姓名' : 42),
      isInternalColumn: () => false,
    });

    expect(clipboard.serialize({ includeHeaders: true }, 'api')?.text).toBe('name\t42\r\nAda\t99');
  });

  it('运行时启停框选仍保留简单单元格快路径，不受行级 v-memo 阻断', async () => {
    const state = reactive<{ mode?: 'cell' | 'row' }>({});
    const mounted = mountSTable<Row>(() => ({
      columns,
      dataSource,
      rowKey: 'id',
      cellRangeSelection: state.mode ? { mode: state.mode } : undefined,
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const firstCell = () => host!.querySelector<HTMLElement>('tbody td.s-table-cell')!;
    expect(firstCell().classList.contains('s-table-cell-range-selected')).toBe(false);

    state.mode = 'cell';
    await nextTick();
    const componentName = (
      firstCell() as HTMLElement & {
        __vueParentComponent?: { type?: { __name?: string } };
      }
    ).__vueParentComponent?.type?.__name;
    expect(componentName).not.toBe('BodyCell');
    firstCell().dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await nextTick();
    expect(firstCell().classList.contains('s-table-cell-range-selected')).toBe(true);

    state.mode = undefined;
    await nextTick();
    expect(firstCell().classList.contains('s-table-cell-range-selected')).toBe(false);
  });

  it('row 模式首次点击也会触发 cellRangeSelect', async () => {
    const selected: Array<{ range: STableCellRange; rows: Row[] }> = [];
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      rowKey: 'id',
      cellRangeSelection: { mode: 'row' },
      onCellRangeSelect: (range: STableCellRange, rows: Row[]) => selected.push({ range, rows }),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host.querySelector<HTMLElement>('tbody tr.s-table-row')!.click();
    await nextTick();

    expect(selected).toEqual([
      {
        range: { startRow: 0, startCol: 0, endRow: 0, endCol: 1 },
        rows: [{ id: 1, name: 'A' }],
      },
    ]);
  });

  it('固定行使用 top/center/bottom 视觉顺序计算范围、记录和 mouseleave', async () => {
    const pinnedData: Row[] = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
      { id: 3, name: 'C' },
      { id: 4, name: 'D' },
    ];
    const selected: Array<{ range: STableCellRange; rows: Row[] }> = [];
    const leaves: number[] = [];
    const mounted = mountSTable<Row>({
      columns,
      dataSource: pinnedData,
      rowKey: 'id',
      defaultPinnedRowKeys: { top: [3], bottom: [1] },
      cellRangeSelection: { mode: 'row' },
      onCellRangeSelect: (range: STableCellRange, rows: Row[]) => selected.push({ range, rows }),
      onRowMouseleave: ({ record }: { record: Row }) => leaves.push(record.id),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const rows = [...host.querySelectorAll<HTMLElement>('tbody tr.s-table-row')];
    expect(rows.map((row) => row.dataset.rowKey)).toEqual(['3', '2', '4', '1']);
    rows[1]!.click();
    rows[0]!.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    await nextTick();

    expect(selected).toEqual([
      {
        range: { startRow: 1, startCol: 0, endRow: 1, endCol: 1 },
        rows: [{ id: 2, name: 'B' }],
      },
    ]);
    expect(leaves).toEqual([3]);
  });

  it('运行时启用再关闭固定行后恢复普通显示索引', async () => {
    let instance: STableInstance<Row> | undefined;
    const records: number[][] = [];
    const pinnedData: Row[] = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
      { id: 3, name: 'C' },
    ];
    const mounted = mountSTable<Row>({
      columns,
      dataSource: pinnedData,
      rowKey: 'id',
      cellRangeSelection: { mode: 'row' },
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
      onCellRangeSelect: (_range: STableCellRange, rows: Row[]) =>
        records.push(rows.map((row) => row.id)),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const clickRow = (key: number) =>
      host!.querySelector<HTMLElement>(`tbody tr[data-row-key="${key}"]`)!.click();
    clickRow(2);
    instance!.clearCellRange();
    instance!.pinRow(3, 'top');
    await nextTick();
    clickRow(2);
    instance!.clearCellRange();
    instance!.pinRow(3, false);
    await nextTick();
    clickRow(2);
    await nextTick();

    expect(records).toEqual([[2], [2], [2]]);
    expect(instance!.getCellRange()).toEqual({
      startRow: 1,
      startCol: 0,
      endRow: 1,
      endCol: 1,
    });
  });

  it('row 模式联动行选择时使用公开 rowKey，避免对 TanStack row.id 重复编码', async () => {
    const selections: Array<Array<string | number>> = [];
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      rowKey: 'id',
      rowSelection: {},
      cellRangeSelection: { mode: 'row', selectRowOnClick: true },
      onSelectChange: (keys: Array<string | number>) => selections.push(keys),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host.querySelector<HTMLElement>('tbody tr.s-table-row')!.click();
    await nextTick();

    expect(selections.at(-1)).toEqual([1]);
    expect(host.querySelector('tbody tr.s-table-row')?.classList).toContain('s-table-row-selected');
  });

  it('父组件重渲染并重建同 mode 配置对象时保留范围，公开清除会发null', async () => {
    const state = reactive({ bordered: false });
    const changes: Array<STableCellRange | null> = [];
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>(
      () =>
        ({
          columns,
          dataSource,
          rowKey: 'id',
          bordered: state.bordered,
          // 每次父组件 render 都产生新对象，用于覆盖真实模板中的内联配置写法
          cellRangeSelection: { mode: 'row' },
          ref: (value: unknown) => {
            instance = value as STableInstance<Row>;
          },
          onCellRangeChange: (range: STableCellRange | null) => changes.push(range),
        }) as never
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();
    // TanStack 首次构建 core row model 会用 microtask 执行一次初?auto-reset
    await Promise.resolve();

    host.querySelector<HTMLElement>('tbody tr.s-table-row')!.click();
    await nextTick();

    const selectedCount = () => host!.querySelectorAll('.s-table-cell-range-selected').length;
    expect(instance!.getCellRange()).toEqual({ startRow: 0, startCol: 0, endRow: 0, endCol: 1 });
    const rangeSnapshot = instance!.getCellRange()!;
    rangeSnapshot.endCol = 0;
    expect(instance!.getCellRange()).toEqual({ startRow: 0, startCol: 0, endRow: 0, endCol: 1 });
    expect(selectedCount()).toBe(2);

    state.bordered = true;
    await nextTick();
    expect(instance!.getCellRange()).toEqual({ startRow: 0, startCol: 0, endRow: 0, endCol: 1 });
    expect(selectedCount()).toBe(2);
    expect(changes).toHaveLength(1);

    instance!.clearCellRange();
    await nextTick();
    expect(instance!.getCellRange()).toBeNull();
    expect(changes.at(-1)).toBeNull();

    host.querySelector<HTMLElement>('tbody tr.s-table-row')!.click();
    await nextTick();
    instance!.clearCellRange();
    await nextTick();
    expect(instance!.getCellRange()).toBeNull();
  });

  it('dataSource 重建相同行集合时保留框选；行增删时清空并同步 null', async () => {
    const state = reactive<{ data: Row[] }>({ data: dataSource });
    const changes: Array<STableCellRange | null> = [];
    const mounted = mountSTable<Row>(
      () =>
        ({
          columns,
          dataSource: state.data,
          rowKey: 'id',
          cellRangeSelection: { mode: 'row' },
          onCellRangeChange: (range: STableCellRange | null) => changes.push(range),
        }) as never
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();
    await Promise.resolve();

    host.querySelector<HTMLElement>('tbody tr.s-table-row')!.click();
    await nextTick();
    expect(changes).toHaveLength(1);

    // 数据被重建（新数组引用）但行 key 集合未变：框选应保留，不派发清除。
    state.data = [...dataSource];
    await nextTick();
    expect(changes).toHaveLength(1);

    // 被框选的行被移除：key 集合变化，清空框选并同步 null。
    state.data = dataSource.slice(1);
    await nextTick();
    await Promise.resolve();
    expect(changes.at(-1)).toBeNull();
  });

  it('原生 copy 默认复制框选文本，监听器返回 false 时阻止写入', async () => {
    let blockCopy = false;
    const copyAttempts: Array<{ text: string; source: string }> = [];
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      rowKey: 'id',
      cellRangeSelection: { mode: 'row' },
      onCellRangeCopy: (payload) => {
        copyAttempts.push({ text: payload.text, source: payload.source });
        return !blockCopy;
      },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const row = host.querySelector<HTMLElement>('tbody tr.s-table-row')!;
    const cell = row.querySelector<HTMLElement>('td.s-table-cell')!;
    row.click();
    await nextTick();

    const dispatchCopy = () => {
      const setData = vi.fn();
      const event = new Event('copy', { bubbles: true, cancelable: true }) as ClipboardEvent;
      Object.defineProperty(event, 'clipboardData', { value: { setData } });
      cell.dispatchEvent(event);
      return { event, setData };
    };

    const allowed = dispatchCopy();
    expect(allowed.event.defaultPrevented).toBe(true);
    expect(allowed.setData).toHaveBeenCalledWith('text/plain', '1\tA');
    expect(copyAttempts).toEqual([{ text: '1\tA', source: 'clipboard' }]);

    const shortcut = new KeyboardEvent('keydown', {
      key: 'c',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    cell.dispatchEvent(shortcut);
    expect(shortcut.defaultPrevented).toBe(true);
    expect(copyAttempts.at(-1)).toEqual({ text: '1\tA', source: 'keyboard' });

    blockCopy = true;
    const blocked = dispatchCopy();
    expect(blocked.event.defaultPrevented).toBe(false);
    expect(blocked.setData).not.toHaveBeenCalled();
    expect(copyAttempts).toHaveLength(3);
  });

  it('copyCellRange 被拒绝时返回空串，且不复制内部列', async () => {
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      rowKey: 'id',
      rowSelection: { type: 'checkbox' },
      cellRangeSelection: { mode: 'row' },
      onCellRangeCopy: () => false,
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host.querySelector<HTMLElement>('tbody tr.s-table-row')!.click();
    await nextTick();
    expect(await instance!.copyCellRange({ writeToClipboard: false })).toBe('');
  });

  it('框选复制跳过选择列等内部列', async () => {
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      rowKey: 'id',
      rowSelection: { type: 'checkbox' },
      cellRangeSelection: { mode: 'row' },
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host.querySelector<HTMLElement>('tbody tr.s-table-row')!.click();
    await nextTick();
    const table = instance!.getTanStackTable();
    expect(table.getCellSelectionColumnIds()).toEqual(['id', 'name']);
    expect(table.getSelectedCellRangesData()).toEqual([[[1, 'A']]]);
    expect(
      host.querySelector<HTMLElement>('tbody tr.s-table-row td.s-table-cell')?.classList
    ).not.toContain('s-table-cell-range-selected');
    expect(await instance!.copyCellRange({ writeToClipboard: false })).toBe('1\tA');
  });

  it('复制默认转义公式注入前缀，翻页后清空已离开当前页的框选', async () => {
    const changes: Array<STableCellRange | null> = [];
    let instance: STableInstance<Row> | null = null;
    const rows = Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      name: index === 0 ? '=CMD|calc' : `R${index + 1}`,
    }));
    const mounted = mountSTable<Row>({
      columns,
      dataSource: rows,
      rowKey: 'id',
      pagination: { defaultPageSize: 10 },
      cellRangeSelection: { mode: 'row' },
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
      onCellRangeChange: (range: STableCellRange | null) => changes.push(range),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();
    await Promise.resolve();

    host.querySelector<HTMLElement>('tbody tr.s-table-row')!.click();
    await nextTick();
    expect(instance!.getCellRange()).not.toBeNull();

    const setData = vi.fn();
    const event = new Event('copy', { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(event, 'clipboardData', { value: { setData } });
    host.querySelector<HTMLElement>('tbody td.s-table-cell')!.dispatchEvent(event);
    expect(setData).toHaveBeenCalledWith('text/plain', "1\t'=CMD|calc");

    const raw = await instance!.copyCellRange({
      writeToClipboard: false,
      preventFormulaInjection: false,
    });
    expect(raw).toBe('1\t=CMD|calc');

    host.querySelector<HTMLElement>('.s-pagination-next')!.click();
    await nextTick();
    await Promise.resolve();
    expect(instance!.getCellRange()).toBeNull();
    expect(changes.at(-1)).toBeNull();
  });

  it('编辑输入区的原生 copy 不会被框选复制接管', async () => {
    const onCellRangeCopy = vi.fn();
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      rowKey: 'id',
      cellRangeSelection: { mode: 'row' },
      onCellRangeCopy,
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const row = host.querySelector<HTMLElement>('tbody tr.s-table-row')!;
    row.click();
    await nextTick();
    const input = document.createElement('input');
    row.querySelector('td')!.append(input);
    const event = new Event('copy', { bubbles: true, cancelable: true });
    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(onCellRangeCopy).not.toHaveBeenCalled();
  });
});
