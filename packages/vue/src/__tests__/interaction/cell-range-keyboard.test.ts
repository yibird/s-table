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

const mount = async () => {
  let instance: STableInstance<Row> | null = null;
  const mounted = mountSTable<Row>({
    columns,
    dataSource: [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ],
    rowKey: 'id',
    cellRangeSelection: { mode: 'cell' },
    ref: (value: unknown) => {
      instance = value as STableInstance<Row>;
    },
  } as never);
  app = mounted.app;
  host = mounted.host;
  await nextTick();
  return instance!;
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
});
