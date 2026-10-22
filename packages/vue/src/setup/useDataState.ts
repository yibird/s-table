import { computed } from 'vue';
import type { RowData } from '@tanstack/vue-table';
import { useEditing, useExpandable, usePagination, useRowSelection, useSortFilter } from '../hooks';
import { useGrouping } from '../features/grouping';
import { useRowPinning } from '../features/row-pinning';
import type { STableSetupContext } from './types';

/**
 * 数据模型状态：排序 / 过滤、编辑、分页、行选择、展开、分组与固定行。
 *
 * 纯 setup 编排层：自身不产生新的状态语义，只负责调用各功能 hook 并聚合返回值。
 */
export const useDataState = <TData extends RowData>(context: STableSetupContext<TData>) => {
  const {
    columns,
    tree,
    expandable,
    dataSource,
    rowKey,
    sorting: sortingProp,
    defaultSorting: defaultSortingProp,
    multiSort,
    editConfig,
    editing: editingProp,
    defaultEditing,
    pagination,
    paginationPlacement,
    rowSelection,
    selectedRowKeys: selectedRowKeysProp,
    defaultSelectedRowKeys: defaultSelectedRowKeysProp,
    selectionIntent: selectionIntentProp,
    defaultSelectionIntent: defaultSelectionIntentProp,
    expandedRowKeys: expandedRowKeysProp,
    defaultExpandedRowKeys: defaultExpandedRowKeysProp,
    groupBy: groupByProp,
    defaultGroupBy: defaultGroupByProp,
    pinnedRowKeys: pinnedRowKeysProp,
    defaultPinnedRowKeys: defaultPinnedRowKeysProp,
    resolvedLocale,
    tableInstance,
    getTable,
    emit,
  } = context;

  const {
    columnMap,
    leafColumnIds,
    sorting,
    filterState,
    searchState,
    sortingState,
    onSortingChange,
    columnFiltersState,
    onColumnFiltersChange,
    toggleSort,
    setSorting,
    clearSort,
    setFilter,
    clearFilterByColumn,
    clearFilter,
    setSearch,
    clearSearchByColumn,
    clearSearch,
  } = useSortFilter<TData>({
    columns,
    sorting: sortingProp,
    defaultSorting: defaultSortingProp,
    multiSort,
    getTable,
    onUpdateSorting: (next) => emit('update:sorting', next),
    onSortChange: (next, reason) => {
      const first = next[0];
      emit('sortChange', {
        columnId: first?.columnId ?? null,
        order: first?.order ?? null,
        sorting: next.map((item) => ({ ...item })),
        reason,
      });
    },
    onFilterChange: (nextFilters, nextSearches) => {
      const filters: Record<string, (string | number | boolean)[]> = {};
      for (const [id, values] of nextFilters) filters[id] = [...values];
      const searches: Record<string, string> = {};
      for (const [id, keyword] of nextSearches) if (keyword) searches[id] = keyword;
      emit('filterChange', { filters, searches });
    },
  });
  const {
    editingState,
    startCellEdit,
    startRowEdit,
    setEditValue,
    commitEdit,
    cancelEdit,
    handleEditTrigger,
  } = useEditing<TData>({
    editConfig,
    editing: editingProp,
    defaultEditing,
    columnMap,
    dataSource,
    tree,
    getTable,
    onUpdateEditing: (editing) => emit('update:editing', editing),
    onUpdateDataSource: (next) => emit('update:dataSource', next),
    onStart: (editing, record) => emit('editStart', editing, record),
    onChange: (editing, record) => emit('editChange', editing, record),
    onCommit: (editing, record, nextRecord) => emit('editCommit', editing, record, nextRecord),
    onPatch: (patch) => emit('editPatch', patch),
    onCancel: (editing, record) => emit('editCancel', editing, record),
    onValidateError: (message, editing, record) =>
      emit('editValidateError', message, editing, record),
  });
  const {
    tanstackPaginationState,
    onTanStackPaginationChange,
    topPaginationPlacements,
    bottomPaginationPlacements,
    paginationState,
    paginationEnabled,
    currentPage,
    currentPageSize,
    tanstackRowCount,
    tanstackPageCount,
    handlePageChange,
    handlePaginationChange,
    resetPage,
  } = usePagination({
    pagination,
    paginationPlacement,
    getFilteredTotal: () => {
      const source = dataSource.value;
      // TanStack row model 自身不是 Vue ref；显式读取桥接状态，保证连续数据/过滤更新都能使总数失效。
      const table = tableInstance.value;
      // `getRowCount()` 读取分页前的最终模型，内部已包含过滤、排序、分组和展开等
      // row-model 依赖；不再由组件按“是否有过滤器”分支重复选择 row model。
      return table?.getRowCount() ?? source.length;
    },
    onPageChange: (page, pageSize) => emit('pageChange', { page, pageSize }),
  });
  const {
    selectedRowKeys,
    selectedRows,
    selectionIntent,
    rowSelectionState,
    onRowSelectionChange,
    selectionColumn,
    selectRow,
    deselectRow,
    selectAll,
    clearSelection,
    toggleRow,
    toggleRows,
    setSelectionIntent,
    isRowSelected,
  } = useRowSelection<TData>({
    rowSelection,
    selectedRowKeys: selectedRowKeysProp,
    defaultSelectedRowKeys: defaultSelectedRowKeysProp,
    selectionIntent: selectionIntentProp,
    defaultSelectionIntent: defaultSelectionIntentProp,
    dataSource,
    paginationEnabled,
    rowKey,
    getTable,
    onUpdateSelectedRowKeys: (keys) => emit('update:selectedRowKeys', keys),
    onSelectChange: (keys, rows, info) => emit('selectChange', keys, rows, info),
    onUpdateSelectionIntent: (intent) => emit('update:selectionIntent', intent),
    onSelectionIntentChange: (intent, info) => emit('selectionIntentChange', intent, info),
  });
  const {
    expandedRowKeys,
    expandedState,
    onExpandedChange,
    expandColumn,
    toggleExpand,
    expandRow,
    collapseRow,
    expandAll,
    collapseAll,
  } = useExpandable<TData>({
    expandable,
    tree,
    expandedRowKeys: expandedRowKeysProp,
    defaultExpandedRowKeys: defaultExpandedRowKeysProp,
    dataSource,
    rowKey,
    getTable,
    getExpandAriaLabel: () => resolvedLocale.value.accessibility.expandTrigger,
    onUpdateExpandedRowKeys: (keys) => emit('update:expandedRowKeys', keys),
    onExpandChange: (expanded, record) => emit('expandChange', expanded, record),
  });
  const {
    groupingState,
    groupingActive,
    onGroupingChange,
    groupExpandedState,
    onGroupExpandedChange,
    setGroupBy,
    getGroupBy,
    expandAllGroups,
    collapseAllGroups,
    toggleGroup,
  } = useGrouping<TData>({
    groupBy: groupByProp,
    defaultGroupBy: defaultGroupByProp,
    columnMap,
    tree,
    getTable,
    onUpdateGroupBy: (groupBy) => emit('update:groupBy', groupBy),
    onGroupByChange: (groupBy) => emit('groupByChange', groupBy),
  });
  const tableExpandedState = computed(() =>
    groupingActive.value ? groupExpandedState.value : expandedState.value
  );
  const onTableExpandedChange = (updater: Parameters<typeof onExpandedChange>[0]) => {
    if (groupingActive.value) onGroupExpandedChange(updater);
    else onExpandedChange(updater);
  };
  const { rowPinningState, onRowPinningChange, pinRow, getPinnedRowKeys } = useRowPinning<TData>({
    pinnedRowKeys: pinnedRowKeysProp,
    defaultPinnedRowKeys: defaultPinnedRowKeysProp,
    dataSource,
    getTable,
    onUpdatePinnedRowKeys: (keys) => emit('update:pinnedRowKeys', keys),
    onPinnedRowsChange: (keys) => emit('pinnedRowsChange', keys),
  });

  return {
    // 排序 / 过滤
    columnMap,
    leafColumnIds,
    sorting,
    filterState,
    searchState,
    sortingState,
    onSortingChange,
    columnFiltersState,
    onColumnFiltersChange,
    toggleSort,
    setSorting,
    clearSort,
    setFilter,
    clearFilterByColumn,
    clearFilter,
    setSearch,
    clearSearchByColumn,
    clearSearch,
    // 编辑
    editingState,
    startCellEdit,
    startRowEdit,
    setEditValue,
    commitEdit,
    cancelEdit,
    handleEditTrigger,
    // 分页
    tanstackPaginationState,
    onTanStackPaginationChange,
    topPaginationPlacements,
    bottomPaginationPlacements,
    paginationState,
    paginationEnabled,
    currentPage,
    currentPageSize,
    tanstackRowCount,
    tanstackPageCount,
    handlePageChange,
    handlePaginationChange,
    resetPage,
    // 行选择
    selectedRowKeys,
    selectedRows,
    selectionIntent,
    rowSelectionState,
    onRowSelectionChange,
    selectionColumn,
    selectRow,
    deselectRow,
    selectAll,
    clearSelection,
    toggleRow,
    toggleRows,
    setSelectionIntent,
    isRowSelected,
    // 展开
    expandedRowKeys,
    expandedState,
    onExpandedChange,
    expandColumn,
    toggleExpand,
    expandRow,
    collapseRow,
    expandAll,
    collapseAll,
    // 分组
    groupingState,
    groupingActive,
    onGroupingChange,
    groupExpandedState,
    onGroupExpandedChange,
    setGroupBy,
    getGroupBy,
    expandAllGroups,
    collapseAllGroups,
    toggleGroup,
    // 展开 / 分组统一入口
    tableExpandedState,
    onTableExpandedChange,
    // 固定行
    rowPinningState,
    onRowPinningChange,
    pinRow,
    getPinnedRowKeys,
  };
};
