import { computed, watch } from 'vue';
import type { RowData } from '@tanstack/vue-table';
import { useSTable, useResize } from '../hooks';
import type { useColumnState } from './useColumnState';
import type { useDataState } from './useDataState';
import type { STableSetupContext } from './types';

/**
 * TanStack Table 实例与派生行模型：创建 table、同步默认展开、重置页码、
 * 维护可见列 ID 与列宽拖拽状态。
 */
export const useTableModel = <TData extends RowData>(
  context: STableSetupContext<TData>,
  dataState: ReturnType<typeof useDataState<TData>>,
  columnState: ReturnType<typeof useColumnState<TData>>
) => {
  const { props, emit, tableInstance, dataSource, expandable } = context;
  const {
    normalizedColumns,
    rowModelDependencyToken,
    hasCellSpanning,
    columnPinning,
    tanstackColumnOrder,
    onTanStackColumnOrderChange,
    columnVisibility,
    explicitMinWidth,
    explicitWidthIds,
    getColumnById,
  } = columnState;
  const {
    sortingState,
    onSortingChange,
    columnFiltersState,
    onColumnFiltersChange,
    filterState,
    searchState,
    tanstackPaginationState,
    onTanStackPaginationChange,
    tanstackRowCount,
    tanstackPageCount,
    rowSelectionState,
    onRowSelectionChange,
    tableExpandedState,
    onTableExpandedChange,
    groupingState,
    onGroupingChange,
    groupingActive,
    rowPinningState,
    onRowPinningChange,
    expandAll,
    resetPage,
  } = dataState;

  const manualSortingEnabled = computed(() => props.manualSorting === true);
  const manualFilteringEnabled = computed(() => props.manualFiltering === true);
  const manualPaginationEnabled = computed(() => props.manualPagination === true);

  const {
    table,
    cellSelectionState,
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
  } = useSTable<TData>({
    props,
    normalizedColumns,
    expandable,
    rowModelDependencyToken,
    hasCellSpanning,
    columnPinning,
    columnOrder: tanstackColumnOrder,
    onColumnOrderChange: onTanStackColumnOrderChange,
    columnVisibility,
    explicitMinWidth,
    explicitWidthIds,
    dataSource,
    sortingState,
    onSortingChange,
    columnFiltersState,
    onColumnFiltersChange,
    paginationState: tanstackPaginationState,
    onPaginationChange: onTanStackPaginationChange,
    paginationRowCount: tanstackRowCount,
    paginationPageCount: tanstackPageCount,
    manualPagination: manualPaginationEnabled,
    manualSorting: manualSortingEnabled,
    manualFiltering: manualFilteringEnabled,
    rowSelectionState,
    onRowSelectionChange,
    expandedState: tableExpandedState,
    onExpandedChange: onTableExpandedChange,
    groupingState,
    onGroupingChange,
    groupingActive,
    rowPinningState,
    onRowPinningChange,
  });

  /** 横向虚拟化的 colgroup 只查询窗口列；完整 ID 索引已在列模型同一次遍历中建立。 */
  tableInstance.value = table;
  let defaultExpandAllApplied = false;
  watch(
    [
      () => props.defaultExpandAllRows,
      () => props.expandedRowKeys,
      () => dataSource.value.length,
      () => tableInstance.value,
    ],
    ([enabled, controlledKeys, rowCount, currentTable]) => {
      if (defaultExpandAllApplied || !enabled || !currentTable) return;
      if (controlledKeys !== undefined) {
        defaultExpandAllApplied = true;
        return;
      }
      // 空数据不消耗默认行为，允许异步首批数据到达后完成一次初始化。
      if (rowCount === 0) return;
      expandAll();
      // Vue adapter 的 option watch 在 SSR 首次 render 前不会再次 flush；同步一次公开
      // state 选项，保证服务端 HTML 与客户端首屏都使用刚初始化的展开状态。
      currentTable.setOptions((previous) => ({
        ...previous,
        state: { ...previous.state, expanded: tableExpandedState.value },
      }));
      defaultExpandAllApplied = true;
    },
    { immediate: true }
  );

  // ==================== 服务端数据模型：状态变化事件（点 7）====================
  // 排序 / 过滤 / 分页状态变化时对外派发事件，供服务端模式请求后端数据。
  // 这些事件在所有模式下都会派发（客户端模式下同样有用，便于外部感知交互）；
  // 服务端模式（manual*）下配合 dataSource 回填即可实现后端排序 / 过滤 / 分页。
  watch(sortingState, () => {
    if (!manualSortingEnabled.value && !manualPaginationEnabled.value) resetPage();
  });

  watch([() => filterState.value, () => searchState.value], () => {
    if (!manualFilteringEnabled.value && !manualPaginationEnabled.value) resetPage();
  });
  const visibleColumnIds = computed<string[]>((previous) => {
    const columns = visibleLeafColumns.value;
    if (
      previous?.length === columns.length &&
      columns.every((column, index) => column.id === previous[index])
    ) {
      return previous;
    }
    return columns.map((column) => column.id);
  });
  const { isColumnResizing } = useResize<TData>({
    onResizeStart: (payload) => emit('columnResizeStart', payload),
    onResizeEnd: (payload) => emit('columnResizeEnd', payload),
    table,
    columnResizingState,
    getColumnById,
  });

  return {
    table,
    cellSelectionState,
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
    visibleColumnIds,
    isColumnResizing,
  };
};
