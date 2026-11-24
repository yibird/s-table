import { afterEach, describe, expect, it } from 'vite-plus/test';
import { nextTick, type App } from 'vue';
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

const mount = async (cellRangeSelection: Record<string, unknown> = {}) => {
  let instance: STableInstance<Row> | null = null;
  const mounted = mountSTable<Row>({
    columns,
    dataSource: [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ],
    rowKey: 'id',
    cellRangeSelection,
    ref: (value: unknown) => {
      instance = value as STableInstance<Row>;
    },
  } as never);
  app = mounted.app;
  host = mounted.host;
  await nextTick();
  return instance!;
};

const cellAt = (rowIndex: number, columnIndex: number) =>
  host!.querySelector<HTMLElement>(
    `tbody td[data-row-index="${rowIndex}"][data-col-index="${columnIndex}"]`
  )!;

const mousedown = (cell: HTMLElement, init: MouseEventInit = {}) => {
  cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, ...init }));
  document.dispatchEvent(new MouseEvent('mouseup'));
};

describe('框选键盘与多区间 API', () => {
  it('Ctrl+A 全选当前行模型的单元格', async () => {
    const instance = await mount();
    const cell = host!.querySelector<HTMLElement>('tbody td[tabindex]')!;
    cell.focus();
    cell.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true })
    );
    await nextTick();

    expect(instance.getCellRange()).toEqual({
      startRow: 0,
      startCol: 0,
      endRow: 1,
      endCol: 1,
    });
  });

  it('setCellRange / addCellRange / getCellRanges / clearCellRange', async () => {
    const instance = await mount();

    expect(instance.setCellRange({ startRow: 0, startCol: 0, endRow: 0, endCol: 1 })).toBe(true);
    await nextTick();
    expect(instance.getCellRanges()).toHaveLength(1);

    expect(instance.addCellRange({ startRow: 1, startCol: 0, endRow: 1, endCol: 0 })).toBe(true);
    await nextTick();
    expect(instance.getCellRanges()).toHaveLength(2);

    instance.clearCellRange(0);
    await nextTick();
    expect(instance.getCellRanges()).toHaveLength(1);

    instance.clearCellRange();
    await nextTick();
    expect(instance.getCellRanges()).toHaveLength(0);
  });

  it('focusCell 选中单个单元格', async () => {
    const instance = await mount();
    expect(instance.focusCell(1, 1)).toBe(true);
    await nextTick();
    expect(instance.getCellRange()).toEqual({
      startRow: 1,
      startCol: 1,
      endRow: 1,
      endCol: 1,
    });
  });

  it('Shift+Click 扩展区间，Ctrl+Click 追加区间', async () => {
    const instance = await mount();
    mousedown(cellAt(0, 0), { clientX: 0, clientY: 0 });
    await nextTick();
    mousedown(cellAt(1, 1), { shiftKey: true });
    await nextTick();

    expect(instance.getCellRange()).toEqual({
      startRow: 0,
      startCol: 0,
      endRow: 1,
      endCol: 1,
    });

    mousedown(cellAt(0, 1), { ctrlKey: true });
    await nextTick();
    expect(instance.getCellRanges()).toHaveLength(2);
  });

  it('方向键移动选区，Tab / Shift+Tab 移动到相邻单元格', async () => {
    const instance = await mount();
    const firstCell = cellAt(0, 0);
    mousedown(firstCell);
    await nextTick();
    expect(instance.getCellRange()).toEqual({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });

    firstCell.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    );
    await nextTick();
    expect(instance.getCellRange()).toEqual({ startRow: 0, startCol: 1, endRow: 0, endCol: 1 });

    cellAt(0, 0).focus();
    cellAt(0, 0).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    );
    await nextTick();
    expect(instance.getCellRange()).toEqual({ startRow: 0, startCol: 1, endRow: 0, endCol: 1 });

    cellAt(0, 1).focus();
    cellAt(0, 1).dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    await nextTick();
    expect(instance.getCellRange()).toEqual({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
  });

  it('Shift+Click 后 DOM 焦点保持在锚点单元格', async () => {
    await mount();
    const anchor = cellAt(0, 0);
    const corner = cellAt(1, 1);
    anchor.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    document.dispatchEvent(new MouseEvent('mouseup'));
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, shiftKey: true }));
    await nextTick();

    corner.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, shiftKey: true })
    );
    document.dispatchEvent(new MouseEvent('mouseup'));
    corner.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, shiftKey: true }));
    await nextTick();

    expect(document.activeElement).toBe(anchor);
  });

  it('Ctrl+Shift+方向键扩展到该方向最后一个单元格', async () => {
    const instance = await mount();
    mousedown(cellAt(0, 0));
    await nextTick();
    cellAt(0, 0).dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        shiftKey: true,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    await nextTick();

    expect(instance.getCellRange()).toEqual({
      startRow: 0,
      startCol: 0,
      endRow: 1,
      endCol: 0,
    });
  });

  it('formatRangeCellText 覆盖复制文本', async () => {
    const instance = await mount({
      formatRangeCellText: ({ values }: { values: readonly (readonly unknown[])[] }) =>
        values.map((row) => row.join('|')).join(';'),
    });
    instance.setCellRange({ startRow: 0, startCol: 0, endRow: 1, endCol: 1 });
    const text = await instance.copyCellRange({ writeToClipboard: false });
    expect(text).toBe('1|a;2|b');
  });
});
