import { computed, shallowRef, watch, type ComputedRef, type Ref } from 'vue';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnOrderState,
  type ColumnPinningState,
  type HeaderGroup,
  type Row,
  type RowData,
  type RowSelectionState,
  type ExpandedState,
  type GroupingState,
  type PaginationState,
  type RowPinningState,
  type SortingState,
  type Updater,
  type TableFeatures,
  columnPinningFeature,
  columnOrderingFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  rowSortingFeature,
  createSortedRowModel,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  columnFilteringFeature,
  createFilteredRowModel,
  rowPaginationFeature,
  rowSelectionFeature,
  rowExpandingFeature,
  cellSelectionFeature,
  cellSpanningFeature,
  columnGroupingFeature,
  rowAggregationFeature,
  rowPinningFeature,
  createPaginatedRowModel,
  createExpandedRowModel,
  createGroupedRowModel,
  aggregationFn_sum,
  aggregationFn_min,
  aggregationFn_max,
  aggregationFn_extent,
  aggregationFn_mean,
  aggregationFn_median,
  aggregationFn_unique,
  aggregationFn_uniqueCount,
  aggregationFn_count,
  aggregationFn_first,
  aggregationFn_last,
  tableFeatures,
  useTable,
} from '@tanstack/vue-table';
import type { STableExpandable, STableProps } from '../types';
import type { STableColumnMeta } from '../types/column';
import { createRowIdAllocator, encodeRowKey, resolveRowKey } from '../utils';
import { getTreeChildren } from '@zchengfeng/s-table-core';
import { useColumnMetrics } from './useColumnMetrics';
import { installPinnedRowsDisplayOrder, useTableAtoms } from '../adapter';

/**
 * `useSTable` 的入参约束，统一描述创建表格实例所需的核心依赖。
 *
 * @template TData 表格行数据类型。
 */
type UseSTableOptions<TData extends RowData> = {
  /** 表格组件 props。 */
  props: Readonly<STableProps<TData>>;
  /** 归一化后的内部列定义。 */
  normalizedColumns: Readonly<Ref<ColumnDef<TableFeatures, TData, unknown>[]>>;
  /** 展开配置，作为行是否可展开的唯一业务判断入口。 */
  expandable: Readonly<Ref<STableExpandable<TData> | undefined>>;
  /** 真正影响 Row 值缓存、排序和过滤结果的稳定列依赖 token。 */
  rowModelDependencyToken: Readonly<Ref<readonly unknown[]>>;
  /** 列归一化阶段产出的单元格合并能力标记，避免再次扫描列树。 */
  hasCellSpanning: Readonly<Ref<boolean>>;
  /** 固定列状态。 */
  columnPinning: Readonly<Ref<ColumnPinningState>>;
  /** TanStack 叶子列顺序。 */
  columnOrder: Readonly<Ref<ColumnOrderState>>;
  /** TanStack 列顺序变更入口。 */
  onColumnOrderChange: (updater: Updater<ColumnOrderState>) => void;
  /** 列可见性状态（来自 column.hidden，隐藏列 id → false）。 */
  columnVisibility: Readonly<Ref<Record<string, boolean>>>;
  /** 显式设宽列的宽度总和，作为表格 min-width。 */
  explicitMinWidth: Readonly<Ref<number>>;
  /** 显式设宽的列 ID 集合（用于 `<col>` 是否输出固定宽度）。 */
  explicitWidthIds: Readonly<Ref<ReadonlySet<string>>>;
  /** 表格原始数据源。排序 / 过滤 / 分页由 table 内置 row model 处理。 */
  dataSource: Readonly<Ref<TData[]>>;
  /** 桥接的排序状态（TanStack SortingState 形状）。 */
  sortingState: Readonly<Ref<SortingState>>;
  /** TanStack 排序 Updater 写回入口。 */
  onSortingChange: (updater: Updater<SortingState>) => void;
  /** 桥接的列过滤状态（TanStack ColumnFiltersState 形状）。 */
  columnFiltersState: Readonly<Ref<ColumnFiltersState>>;
  /** TanStack 过滤 Updater 写回入口。 */
  onColumnFiltersChange: (updater: Updater<ColumnFiltersState>) => void;
  /** 桥接的分页状态（TanStack PaginationState 形状）；不分页时为 undefined。 */
  paginationState: Readonly<Ref<PaginationState | undefined>>;
  /** TanStack 分页 Updater 写回入口。 */
  onPaginationChange: (updater: Updater<PaginationState>) => void;
  /** 服务端分页显式总行数；仅 manualPagination 时传给 TanStack。 */
  paginationRowCount: Readonly<Ref<number | undefined>>;
  /** 服务端分页显式总页数；仅 manualPagination 时传给 TanStack。 */
  paginationPageCount: Readonly<Ref<number | undefined>>;
  /** 服务端分页：为 true 时 TanStack 不再客户端切片，直接渲染传入数据。 */
  manualPagination: Readonly<Ref<boolean>>;
  /** 服务端排序：为 true 时 TanStack 保留排序状态但不做客户端排序。 */
  manualSorting: Readonly<Ref<boolean>>;
  /** 服务端过滤：为 true 时 TanStack 保留过滤状态但不做客户端过滤。 */
  manualFiltering: Readonly<Ref<boolean>>;
  /** TanStack 行选择状态。 */
  rowSelectionState: Readonly<Ref<RowSelectionState>>;
  /** TanStack 行选择状态变更入口。 */
  onRowSelectionChange: (updater: Updater<RowSelectionState>) => void;
  /** TanStack 行展开状态。 */
  expandedState: Readonly<Ref<ExpandedState>>;
  /** TanStack 行展开状态变更入口。 */
  onExpandedChange: (updater: Updater<ExpandedState>) => void;
  /** 行分组状态（列 id 有序数组）。 */
  groupingState: Readonly<Ref<GroupingState>>;
  /** TanStack 分组状态变更入口。 */
  onGroupingChange: (updater: Updater<GroupingState>) => void;
  /** 分组是否激活（决定 expandedRowModel 是否参与行扁平化）。 */
  groupingActive: Readonly<Ref<boolean>>;
  /** 行固定状态（内部 row id）。 */
  rowPinningState: Readonly<Ref<RowPinningState>>;
  /** TanStack 行固定状态变更入口。 */
  onRowPinningChange: (updater: Updater<RowPinningState>) => void;
};

// Feature 集合固定在组件内部：产品能力通过 options 开关，避免实例或全局覆盖核心状态合同。
// columnMeta 为类型槽（runtime 被 TanStack 剥离），使 columnDef.meta 与公开 STableColumnMeta 对齐。
const defaultFeatures = tableFeatures({
  columnVisibilityFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnResizingFeature,
  rowSortingFeature,
  columnFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowExpandingFeature,
  cellSelectionFeature,
  cellSpanningFeature,
  columnGroupingFeature,
  rowAggregationFeature,
  rowPinningFeature,
  columnMeta: {} as STableColumnMeta,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  expandedRowModel: createExpandedRowModel(),
  groupedRowModel: createGroupedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
  aggregationFns: {
    sum: aggregationFn_sum,
    min: aggregationFn_min,
    max: aggregationFn_max,
    extent: aggregationFn_extent,
    mean: aggregationFn_mean,
    median: aggregationFn_median,
    unique: aggregationFn_unique,
    uniqueCount: aggregationFn_uniqueCount,
    count: aggregationFn_count,
    first: aggregationFn_first,
    last: aggregationFn_last,
  },
});

/**
 * 创建 `STable` 对应的 TanStack Table 实例，并收敛模板层真正需要消费的响应式状态。
 *
 * @template TData 表格行数据类型。
 * @param {UseSTableOptions<TData>} options hook 入参，包含组件 props、归一化后的列定义和固定列状态。
 * @param {Readonly<STableProps<TData>>} options.props 表格组件 props。
 * @param options.normalizedColumns 供 TanStack 使用的内部列定义。
 * @param options.columnPinning 固定列状态。
 * @returns 返回 table 实例
 */
export const useSTable = <TData extends RowData>({
  props,
  normalizedColumns,
  expandable,
  rowModelDependencyToken,
  hasCellSpanning,
  columnPinning,
  columnOrder,
  onColumnOrderChange,
  columnVisibility,
  explicitMinWidth,
  explicitWidthIds,
  dataSource: externalDataSource,
  sortingState,
  onSortingChange,
  columnFiltersState,
  onColumnFiltersChange,
  paginationState,
  onPaginationChange,
  paginationRowCount,
  paginationPageCount,
  manualPagination,
  manualSorting,
  manualFiltering,
  rowSelectionState,
  onRowSelectionChange,
  expandedState,
  onExpandedChange,
  groupingState,
  onGroupingChange,
  groupingActive,
  rowPinningState,
  onRowPinningChange,
}: UseSTableOptions<TData>) => {
  const isResizeOnChange = computed(() => props.columnResizeMode === 'onChange');
  // `manualPagination` 只描述分页模式，不应随 pageIndex/pageSize 变化。单独收敛为
  // 值稳定的 computed，避免 Vue adapter 的 options watcher 与 state watcher 重复同步。
  const manualPaginationOption = computed(() => !paginationState.value || manualPagination.value);
  // computed 内写闭包状态会让求值带副作用、且依赖 Vue 的脏检查语义；
  // 改为显式 watch + shallowRef 状态机：依赖变化时同步推导下一份数据引用。
  const tableData = shallowRef<TData[]>([]);
  let previousSource: TData[] | undefined;
  watch(
    [
      () => externalDataSource.value,
      rowModelDependencyToken,
      () => props.rowKey,
      () => props.tree?.getChildren,
      () => props.tree?.childrenColumnName,
    ],
    ([source]) => {
      if (source !== previousSource) {
        // STable 上层已为 push/splice 生成新数组，普通数据更新直接复用，避免第二次 O(n) 复制。
        tableData.value = source;
      } else {
        // TanStack 核心行模型仅按 data 引用缓存；真正影响取值、排序、过滤或行标识的
        // 配置变化时才换引用，清空 Row 值缓存并按最新规则重建 rowsById。
        tableData.value = [...source];
      }
      previousSource = source;
    },
    { immediate: true }
  );
  const rowIdAllocator = createRowIdAllocator();
  /** 判断指定行是否允许被选择。 */
  const canSelectRow = (row: Row<TableFeatures, TData>) =>
    !props.rowSelection?.getCheckboxProps?.(row.original)?.disabled;

  // v9 adapter 会同时观察 options 级依赖和受控 state 切片。
  // 使用稳定对象 + getter，让 options 级依赖只看到同一个 state 引用，切片变化只走
  // adapter 的受控 state watcher，避免一次排序 / 筛选触发两次 setOptions。
  const tableState = {
    get columnPinning() {
      return columnPinning.value;
    },
    get columnOrder() {
      return columnOrder.value;
    },
    get columnVisibility() {
      return columnVisibility.value;
    },
    get sorting() {
      return sortingState.value;
    },
    get columnFilters() {
      return columnFiltersState.value;
    },
    get rowSelection() {
      return rowSelectionState.value;
    },
    get expanded() {
      return expandedState.value;
    },
    get grouping() {
      return groupingState.value;
    },
    get rowPinning() {
      return rowPinningState.value;
    },
    get pagination() {
      return paginationState.value;
    },
  };

  const table = useTable({
    features: defaultFeatures,
    data: tableData,
    get columns() {
      return normalizedColumns.value;
    },
    // 业务 rowKey 直接作为 TanStack row.id，后续选择、展开和定位统一复用 rowsById。
    getRowId: (record: TData, index: number, parentRow?: Row<TableFeatures, TData>) => {
      // TanStack 可能在 data 引用不变时重建 Core Row Model；根首行是一次遍历的稳定边界，
      // 在这里重置重复 key 后缀，避免同一行因跨次构建累计为 `\0\2`、`\0\3` 等新 ID。
      if (!parentRow && index === 0) rowIdAllocator.resetForBuild(tableData.value);
      else rowIdAllocator.resetIfSourceChanged(tableData.value);
      if (props.rowKey) {
        const publicKey = resolveRowKey(record, index, props.rowKey);
        return rowIdAllocator.alloc(encodeRowKey(publicKey), publicKey);
      }
      // TanStack 会为每个父节点从 0 重新计算子行索引。没有 rowKey 时把父路径纳入
      // fallback，避免不同分支的子节点互相覆盖 rowsById。
      const fallbackId = parentRow
        ? `s:__s_table_path__${parentRow.id}/${index}`
        : encodeRowKey(index);
      return rowIdAllocator.alloc(fallbackId);
    },
    getSubRows: (record: TData) => {
      const tree = props.tree;
      if (!tree) return undefined;
      return getTreeChildren(record, tree);
    },
    state: tableState,
    // 状态由外部（组件）通过 computed 完全托管，这里只需接收变更（无操作即可，Vue 响应式驱动重算）。
    // manual* 为 true 时，TanStack 保留对应状态但不做客户端计算，交由外部（服务端）处理后回填 data。
    // 未启用分页时让官方最终 row model 直接返回预分页结果，其他 feature（如 cell spanning）
    // 也能与实际渲染行保持同一个数据窗口。
    manualPagination: manualPaginationOption,
    get rowCount() {
      return manualPagination.value ? paginationRowCount.value : undefined;
    },
    get pageCount() {
      return manualPagination.value ? paginationPageCount.value : undefined;
    },
    get manualSorting() {
      return manualSorting.value;
    },
    get manualFiltering() {
      return manualFiltering.value;
    },
    // STable 公开排序约定始终从升序开始；方向循环、修饰键多列与移除排序交给 TanStack。
    sortDescFirst: false,
    get enableMultiSort() {
      return props.multiSort === true;
    },
    // 分页由 usePagination 完全托管（含受控语义与越界修正）。关闭 TanStack 的
    // 自动重置可防止 row model 首次求值后把其内部 atom 改回第 1 页，与外部状态分叉。
    autoResetPageIndex: false,
    onRowSelectionChange,
    onExpandedChange,
    onColumnOrderChange,
    onSortingChange,
    onColumnFiltersChange,
    onPaginationChange,
    onGroupingChange,
    onRowPinningChange,
    // 分组列保持用户声明的列顺序，避免分组瞬间发生大规模列重排。
    groupedColumnMode: false,
    // 固定行在过滤 / 分页后仍然可见（对齐 AG Grid 默认行为）。
    keepPinnedRows: true,
    get enableRowSelection() {
      return props.rowSelection ? canSelectRow : false;
    },
    get enableMultiRowSelection() {
      return props.rowSelection?.type !== 'radio';
    },
    // 单元格范围只由 TanStack 管理；组件层仅把 ID 角点适配成公开的索引范围。
    get enableCellSelection() {
      return Boolean(props.cellRangeSelection);
    },
    get enableCellRangeSelection() {
      return props.cellRangeSelection?.mode === 'cell';
    },
    get enableCellSelectionDrag() {
      return props.cellRangeSelection?.mode === 'cell';
    },
    get enableCellSpanning() {
      return hasCellSpanning.value;
    },
    // STable 当前公开 API 只表达一个矩形，关闭 Ctrl/Meta 多范围以保持契约一致。
    enableMultiCellRangeSelection: false,
    getRowCanExpand: (row) => {
      // 分组行始终允许展开 / 折叠，不受业务 isRowExpandable 影响。
      if (row.getIsGrouped()) return true;
      const config = expandable.value;
      if (config?.isRowExpandable?.(row.original) === false) return false;
      const detailExpandable = Boolean(props.expandable);
      const treeExpandable = Boolean(props.tree) && row.subRows.length > 0;
      return detailExpandable || treeExpandable;
    },
    // 详情内容由 Body 渲染为兄弟行，不让 expanding feature 改写数据行模型；
    // 树形与分组模式下则由 expandedRowModel 负责把子行 / 组内行扁平化进视图。
    get manualExpanding() {
      return !props.tree && !groupingActive.value;
    },
    // 展开状态由组件完全托管：数据 / 分组变化后的清理由各 hook 自行判断，
    // 关闭 TanStack 的自动重置避免其经由回调把状态改回初始值。
    autoResetExpanded: false,
    // 关闭 TanStack 按 data 引用自动清空框选：改由 useCellRange 按行 key
    // 集合判定——数据重建但行未增删时保留框选，行集合变化才清空。
    autoResetCellSelection: false,
    enableColumnPinning: true,
    get columnResizeMode() {
      return props.columnResizeMode;
    },
  });

  // 通过适配层桥接 TanStack atoms，业务代码不再直接访问 table.atoms.*
  const atomBridge = useTableAtoms(table);

  const columnResizingState = atomBridge.columnResizing;
  const shouldRafSyncSizing = computed(
    () => isResizeOnChange.value && Boolean(columnResizingState.value?.isResizingColumn)
  );

  // TanStack v9 的派生模型由 Vue-aware atoms 驱动，直接查询即可完整追踪列、数据和状态；
  // 不再维护一份容易随上游 feature 演进而漏项的手工依赖清单。
  const headerGroups = computed(() => table.getHeaderGroups()) as ComputedRef<
    HeaderGroup<TableFeatures, TData>[]
  >;
  const unpinnedRows = computed(() => table.getRowModel().rows) as ComputedRef<
    Row<TableFeatures, TData>[]
  >;
  const pinningActive = computed(
    () => rowPinningState.value.top.length > 0 || rowPinningState.value.bottom.length > 0
  );
  const topRows = computed(() => (pinningActive.value ? table.getTopRows() : []));
  const centerRows = computed(() =>
    pinningActive.value ? table.getCenterRows() : unpinnedRows.value
  );
  const bottomRows = computed(() => (pinningActive.value ? table.getBottomRows() : []));
  const rows = computed(() =>
    pinningActive.value
      ? [...topRows.value, ...centerRows.value, ...bottomRows.value]
      : unpinnedRows.value
  );
  installPinnedRowsDisplayOrder({ table, rows, enabled: pinningActive });

  // 可见列度量（宽度、固定标记、sticky 变量与根样式）独立成 hook。
  const { visibleLeafColumns, visibleLeafColumnById, tableStyle, fixedColumnStyles } =
    useColumnMetrics<TData>({
      table,
      columnSizing: atomBridge.columnSizing,
      explicitWidthIds,
      explicitMinWidth,
      getVirtual: () => props.virtual,
      shouldRafSyncSizing,
    });

  return {
    table,
    cellSelectionState: atomBridge.cellSelection,
    columnResizingState,
    headerGroups,
    rows,
    topRows,
    centerRows,
    bottomRows,
    visibleLeafColumns,
    visibleLeafColumnById,
    tableStyle,
    fixedColumnStyles,
  };
};
