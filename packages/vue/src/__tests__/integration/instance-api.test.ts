import { afterEach, describe, expect, it } from 'vite-plus/test';
import { nextTick, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn, STableInstance } from '../../types';

interface Row {
  id: number;
  name: string;
  dept: string;
}

const columns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  { id: 'name', accessorKey: 'name', header: 'Name', width: 160, editable: true },
  { id: 'dept', accessorKey: 'dept', header: 'Dept', width: 160, groupable: true, sorter: true },
];

const data: Row[] = Array.from({ length: 30 }, (_, index) => ({
  id: index + 1,
  name: `row-${index + 1}`,
  dept: index % 2 === 0 ? 'tech' : 'product',
}));

let app: App | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

const mount = async (extra: Record<string, unknown> = {}) => {
  let instance: STableInstance<Row> | null = null;
  const mounted = mountSTable<Row>({
    columns,
    dataSource: data,
    rowKey: 'id',
    rowSelection: { type: 'checkbox' },
    pagination: { defaultPageSize: 10 },
    ref: (value: unknown) => {
      instance = value as STableInstance<Row>;
    },
    ...extra,
  } as never);
  app = mounted.app;
  host = mounted.host;
  await nextTick();
  return instance!;
};

describe('实例 API 集成', () => {
  it('选择、排序、分组、固定行与列顺序', async () => {
    const instance = await mount();

    instance.selectAll();
    await nextTick();
    expect(instance.getSelectedRowKeys()).toHaveLength(30);
    expect(instance.getSelectedRows()).toHaveLength(30);
    instance.toggleRowSelection(data[0]!, false);
    expect(instance.getSelectedRowKeys()).toHaveLength(29);
    instance.clearSelection();
    expect(instance.getSelectedRowKeys()).toHaveLength(0);
    expect(instance.getSelectionIntent()).toEqual({ mode: 'include', includedRowKeys: [] });

    instance.setSorting([{ columnId: 'dept', order: 'ascend' }]);
    await nextTick();
    expect(instance.getSorting()).toEqual([{ columnId: 'dept', order: 'ascend' }]);
    instance.clearSort();
    expect(instance.getSorting()).toEqual([]);

    instance.setGroupBy(['dept']);
    await nextTick();
    expect(instance.getGroupBy()).toEqual(['dept']);
    instance.expandAllGroups();
    instance.collapseAllGroups();
    instance.toggleGroup('missing-group');
    instance.setGroupBy([]);

    expect(instance.pinRow(2, 'top')).toBe(true);
    expect(instance.getPinnedRowKeys().top).toEqual([2]);
    expect(instance.pinRow(999, 'bottom')).toBe(false);
    instance.pinRow(2, false);

    expect(instance.getColumnOrder()).toEqual(['id', 'name', 'dept']);
    instance.swapColumns('id', 'dept');
    expect(instance.getColumnOrder()).toEqual(['dept', 'name', 'id']);
    instance.moveColumn('name', 'id');
    instance.moveColumnByIndex(0, 2);
    instance.setColumnOrder(['name', 'id']);
    expect(instance.getColumnOrder()).toEqual(['name', 'id', 'dept']);
    instance.resetColumnOrder();
    expect(instance.getColumnOrder()).toEqual(['id', 'name', 'dept']);
    instance.swapColumns('missing', 'id');
    instance.moveColumnByIndex(-1, 99);
    expect(instance.getTanStackTable()).toBeTruthy();
  });

  it('导出、展开、编辑与框选 API 安全可调用', async () => {
    const instance = await mount({ editConfig: { mode: 'cell', trigger: 'manual' } });

    const csv = instance.exportCsv({ bom: false, dataSource: 'currentPage' });
    expect(csv.split('\r\n')[0]).toBe('ID,Name,Dept');
    expect(instance.getExportColumns().map((column) => column.columnId)).toEqual([
      'id',
      'name',
      'dept',
    ]);
    expect(instance.getExportRows('all')).toHaveLength(30);
    expect(instance.getExportRows('currentPage')).toHaveLength(10);
    expect(instance.getExportRows([data[0]!])).toEqual([data[0]]);

    expect(instance.getExpandedRowKeys()).toEqual([]);
    instance.expandRow(1);
    instance.collapseRow(1);
    instance.toggleExpand(1);
    instance.expandAll();
    instance.collapseAll();
    expect(instance.getExpandedRowKeys()).toEqual([]);

    expect(instance.getEditing()).toBeNull();
    instance.startCellEdit(1, 'name');
    instance.setEditValue('name', 'updated');
    expect(instance.getEditing()?.values).toEqual({ name: 'updated' });
    instance.cancelEdit();
    expect(instance.getEditing()).toBeNull();
    expect(instance.startCellEdit(999, 'name')).toBe(false);

    expect(instance.getCellRange()).toBeNull();
    expect(instance.setCellRange({ startRow: 0, startCol: 0, endRow: 1, endCol: 1 })).toBe(true);
    expect(instance.getCellRange()).toEqual({ startRow: 0, startCol: 0, endRow: 1, endCol: 1 });
    instance.addCellRange({ startRow: 2, startCol: 0, endRow: 2, endCol: 0 });
    expect(instance.getCellRanges().length).toBeGreaterThanOrEqual(1);
    instance.clearCellRange();
    expect(instance.getCellRanges()).toEqual([]);
    instance.focusCell(0, 0);

    expect(instance.scrollToRow(5)).toBe(true);
    expect(instance.scrollToRow(9999)).toBe(false);
    expect(instance.scrollToColumn('name')).toBe(true);
    expect(instance.scrollToColumn('missing')).toBe(false);
    instance.scrollToTop();
    instance.scrollToBottom();
    instance.scrollTo({ top: 20, behavior: 'auto' });
    const position = instance.getScrollPosition();
    expect(position.left).toBeGreaterThanOrEqual(0);
    expect(position.top).toBeGreaterThanOrEqual(0);
  });
});
