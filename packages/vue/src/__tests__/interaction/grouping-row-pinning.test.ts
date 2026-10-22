import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { h, nextTick, reactive, ref, type App } from 'vue';
import type {
  STableColumn,
  STableGroupRowSlotContext,
  STableInstance,
  STablePinnedRowKeys,
} from '../../types';
import { mountSTable } from '../helpers';

interface Row {
  id: number;
  department: string;
  name: string;
  amount: number;
}

const dataSource: Row[] = [
  { id: 1, department: '研发', name: 'Ada', amount: 10 },
  { id: 2, department: '研发', name: 'Grace', amount: 20 },
  { id: 3, department: '销售', name: 'Linus', amount: 30 },
  { id: 4, department: '销售', name: 'Ken', amount: 40 },
];

const columns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'department', accessorKey: 'department', header: '部门', groupable: true },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  {
    id: 'amount',
    accessorKey: 'amount',
    header: '金额',
    aggregation: 'sum',
    aggregatedCell: ({ cell }) => `合计 ${cell.getValue()}`,
  },
];

let app: App | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('分组与行固定集成', () => {
  it('最小表格与默认分组均可挂载，聚合单元格和展开状态可用', async () => {
    const tableRef = ref<STableInstance<Row>>();
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      rowKey: 'id',
      defaultGroupBy: ['department'],
      ref: tableRef,
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(tableRef.value!.getGroupBy()).toEqual(['department']);
    expect(host.querySelectorAll('.s-table-row-grouped')).toHaveLength(2);
    expect(host.querySelector('.s-table-group-cell')?.textContent).toContain('研发');
    expect(host.querySelector('.s-table-group-cell')?.textContent).toContain('(2)');
    expect(host.querySelector('.s-table-row-grouped')?.textContent).toContain('合计 30');

    tableRef.value!.collapseAllGroups();
    await nextTick();
    expect(host.querySelectorAll('.s-table-row')).toHaveLength(2);
    tableRef.value!.expandAllGroups();
    await nextTick();
    expect(host.querySelectorAll('.s-table-row')).toHaveLength(6);

    const firstGroupId = tableRef.value!.getTanStackTable().getGroupedRowModel().rows[0]!.id;
    tableRef.value!.toggleGroup(firstGroupId);
    await nextTick();
    expect(host.querySelectorAll('.s-table-row')).toHaveLength(4);
  });

  it('groupRow 插槽收到稳定上下文并可切换分组', async () => {
    const mounted = mountSTable<Row>(
      {
        columns,
        dataSource,
        rowKey: 'id',
        defaultGroupBy: ['department'],
      },
      {
        groupRow: (scope: STableGroupRowSlotContext<Row>) =>
          h(
            'button',
            { class: 'custom-group-row', onClick: scope.toggle },
            `${String(scope.groupValue)}:${scope.count}:${scope.depth}`
          ),
      }
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const groups = host.querySelectorAll<HTMLButtonElement>('.custom-group-row');
    expect(groups).toHaveLength(2);
    expect(groups[0]!.textContent).toBe('研发:2:0');
    groups[0]!.click();
    await nextTick();
    expect(host.querySelectorAll('.s-table-row')).toHaveLength(4);
  });

  it('受控分组只派发事件，不越过父级状态所有权', async () => {
    const tableRef = ref<STableInstance<Row>>();
    const updates: string[][] = [];
    const changes: string[][] = [];
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      rowKey: 'id',
      groupBy: [],
      ref: tableRef,
      'onUpdate:groupBy': (value: string[]) => updates.push(value),
      onGroupByChange: (value: string[]) => changes.push(value),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    tableRef.value!.setGroupBy(['department']);
    expect(updates).toEqual([['department']]);
    expect(changes).toEqual([['department']]);
    expect(tableRef.value!.getGroupBy()).toEqual([]);
  });

  it('只接受启用 groupable 且有 accessor 的列，并去除重复分组列', async () => {
    const updates: string[][] = [];
    const tableRef = ref<STableInstance<Row>>();
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      rowKey: 'id',
      groupBy: [],
      ref: tableRef,
      'onUpdate:groupBy': (value: string[]) => updates.push(value),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    tableRef.value!.setGroupBy(['id']);
    expect(updates).toEqual([]);
    expect(tableRef.value!.getGroupBy()).toEqual([]);

    tableRef.value!.setGroupBy(['department', 'department']);
    expect(updates).toEqual([['department']]);
  });

  it('全部列非法的 setGroupBy 调用不会清除现有分组', async () => {
    const updates: string[][] = [];
    const tableRef = ref<STableInstance<Row>>();
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      rowKey: 'id',
      defaultGroupBy: ['department'],
      ref: tableRef,
      'onUpdate:groupBy': (value: string[]) => updates.push(value),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    tableRef.value!.setGroupBy(['name']);
    expect(updates).toEqual([]);
    expect(tableRef.value!.getGroupBy()).toEqual(['department']);
    expect(host.querySelectorAll('.s-table-row-grouped')).toHaveLength(2);

    // 空数组仍然表示显式清除分组。
    tableRef.value!.setGroupBy([]);
    expect(updates).toEqual([[]]);
    expect(tableRef.value!.getGroupBy()).toEqual([]);
  });

  it('仅配置 getGroupingValue 的展示列也可分组，并响应函数热替换', async () => {
    const tableRef = ref<STableInstance<Row>>();
    const state = reactive({
      columns: [
        {
          id: 'bucket',
          header: '分组',
          groupable: true,
          getGroupingValue: (record: Row) => record.department,
        },
        { id: 'name', accessorKey: 'name', header: '姓名' },
      ] as STableColumn<Row>[],
    });
    const mounted = mountSTable<Row>(
      () =>
        ({
          columns: state.columns,
          dataSource,
          rowKey: 'id',
          defaultGroupBy: ['bucket'],
          ref: tableRef,
        }) as never
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(host.querySelectorAll('.s-table-row-grouped')).toHaveLength(2);

    state.columns[0]!.getGroupingValue = (record) => (record.amount <= 20 ? 'small' : 'large');
    await nextTick();

    const groupedRows = tableRef.value!.getTanStackTable().getGroupedRowModel().rows;
    expect(groupedRows).toHaveLength(2);
    expect(groupedRows.map((row) => row.groupingValue)).toEqual(['small', 'large']);
  });

  it('tree 激活时 setGroupBy 不派发被忽略的分组状态', async () => {
    const tableRef = ref<STableInstance<Row>>();
    const updates: string[][] = [];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const mounted = mountSTable<Row>({
      columns,
      dataSource: dataSource.map((row) => ({ ...row, children: [] })),
      rowKey: 'id',
      tree: {},
      ref: tableRef,
      'onUpdate:groupBy': (value: string[]) => updates.push(value),
      onGroupByChange: (value: string[]) => updates.push(value),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    tableRef.value!.setGroupBy(['department']);
    expect(updates).toEqual([]);
    expect(tableRef.value!.getGroupBy()).toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('groupBy` 与 `tree` 互斥'));
    warn.mockRestore();
  });

  it('固定行按 top/center/bottom 渲染且没有重复行', async () => {
    const tableRef = ref<STableInstance<Row>>();
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      rowKey: 'id',
      defaultPinnedRowKeys: { top: [3], bottom: [1] },
      ref: tableRef,
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const rows = [...host.querySelectorAll<HTMLElement>('.s-table-row')];
    expect(rows.map((row) => row.dataset.rowKey)).toEqual(['3', '2', '4', '1']);
    expect(new Set(rows.map((row) => row.dataset.rowKey)).size).toBe(4);
    expect(rows[0]!.classList.contains('s-table-row-pinned-top')).toBe(true);
    expect(rows[3]!.classList.contains('s-table-row-pinned-bottom')).toBe(true);
    expect(rows[0]!.style.position).toBe('sticky');
    expect(tableRef.value!.getPinnedRowKeys()).toEqual({ top: [3], bottom: [1] });

    expect(tableRef.value!.pinRow(2, 'top')).toBe(true);
    await nextTick();
    expect(tableRef.value!.getPinnedRowKeys()).toEqual({ top: [3, 2], bottom: [1] });
    expect(tableRef.value!.pinRow(99, 'top')).toBe(false);
  });

  it('受控固定状态派发快照，虚拟模式仍常驻固定行 DOM', async () => {
    const updates: Array<Required<STablePinnedRowKeys>> = [];
    const changes: Array<Required<STablePinnedRowKeys>> = [];
    const tableRef = ref<STableInstance<Row>>();
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      rowKey: 'id',
      pinnedRowKeys: { top: [3], bottom: [1] },
      virtual: true,
      ref: tableRef,
      'onUpdate:pinnedRowKeys': (value: Required<STablePinnedRowKeys>) => updates.push(value),
      onPinnedRowsChange: (value: Required<STablePinnedRowKeys>) => changes.push(value),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(host.querySelector('[data-row-key="3"]')).not.toBeNull();
    expect(host.querySelector('[data-row-key="1"]')).not.toBeNull();
    tableRef.value!.pinRow(2, 'top');
    expect(updates).toEqual([{ top: [3, 2], bottom: [1] }]);
    expect(changes).toEqual([{ top: [3, 2], bottom: [1] }]);
    expect(tableRef.value!.getPinnedRowKeys()).toEqual({ top: [3], bottom: [1] });
  });

  it('固定行冲突只渲染一次，并在数据删除后清理非受控 key', async () => {
    const state = reactive({ data: [...dataSource] });
    const tableRef = ref<STableInstance<Row>>();
    const mounted = mountSTable<Row>(() => ({
      columns,
      dataSource: state.data,
      rowKey: 'id',
      defaultPinnedRowKeys: { top: [2, 2], bottom: [2, 3] },
      ref: tableRef,
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(tableRef.value!.getPinnedRowKeys()).toEqual({ top: [2], bottom: [3] });
    expect(host.querySelectorAll('[data-row-key="2"]')).toHaveLength(1);

    state.data = state.data.filter((row) => row.id !== 2);
    await nextTick();

    expect(tableRef.value!.getPinnedRowKeys()).toEqual({ top: [], bottom: [3] });
    expect(host.querySelector('[data-row-key="2"]')).toBeNull();
  });
});
