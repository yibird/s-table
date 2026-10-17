import { nextTick } from 'vue';
import type { RowData } from '@tanstack/vue-table';
import { encodeRowKey, resolveRowKey } from '../utils';
import type { STableInstance, STableRowKey } from '../types';
import type { useCellRangeBridge } from './useCellRangeBridge';
import type { useColumnState } from './useColumnState';
import type { useDataState } from './useDataState';
import type { useTableModel } from './useTableModel';
import type { useView } from './useView';
import type { STableSetupContext } from './types';

/**
 * 实例 API：把各模块能力收敛为 `defineExpose` 使用的对象。
 *
 * 查询类接口一律返回快照，避免调用方修改内部响应式对象。
 */
export const useApi = <TData extends RowData>(options: {
  context: STableSetupContext<TData>;
  dataState: ReturnType<typeof useDataState<TData>>;
  columnState: ReturnType<typeof useColumnState<TData>>;
  tableModel: ReturnType<typeof useTableModel<TData>>;
  cellRange: ReturnType<typeof useCellRangeBridge<TData>>;
  view: ReturnType<typeof useView<TData>>;
}): STableInstance<TData> => {
  const { context, dataState, columnState, tableModel, cellRange, view } = options;
  const { rowKey, dataSource } = context;
  const {
    selectedRowKeys,
    selectedRows,
    selectionIntent,
    setSelectionIntent,
    selectAll,
    clearSelection,
    toggleRow,
    selectRow,
    deselectRow,
    sorting,
    setSorting,
    clearSort,
    clearFilter,
    clearSearch,
    editingState,
    startCellEdit,
    startRowEdit,
    setEditValue,
    commitEdit,
    cancelEdit,
    expandedRowKeys,
    toggleExpand,
    expandRow,
    collapseRow,
    expandAll,
    collapseAll,
    getGroupBy,
    setGroupBy,
    expandAllGroups,
    collapseAllGroups,
    toggleGroup,
    pinRow,
    getPinnedRowKeys,
    tanstackPaginationState,
    handlePageChange,
  } = dataState;
  const { table, topRows, centerRows, bottomRows } = tableModel;
  const { getCellRangeSnapshot, clearCellRange, copyCellRange } = cellRange;
  const { scrollToIndex, scrollToTop, scrollToEnd, scrollToColumn, scrollContainerRef } = view;
  const {
    getColumnOrder,
    setColumnOrder,
    resetColumnOrder,
    swapColumns,
    moveColumn,
    moveColumnByIndex,
  } = columnState;

  const getSelectionIntentSnapshot = () => {
    const intent = selectionIntent.value;
    return intent.mode === 'all'
      ? { mode: 'all' as const, excludedRowKeys: [...intent.excludedRowKeys] }
      : { mode: 'include' as const, includedRowKeys: [...intent.includedRowKeys] };
  };

  // 暴露行选择相关方法供外部通过 ref 调用
  const api = {
    getTanStackTable: () => table,
    // 实例查询统一返回快照，避免调用方修改 computed 缓存或受控 props 数组。
    getSelectedRowKeys: () => [...selectedRowKeys.value],
    getSelectedRows: () => [...selectedRows.value],
    getSelectionIntent: getSelectionIntentSnapshot,
    setSelectionIntent,
    selectAll,
    clearSelection,
    clearSort,
    getSorting: () => sorting.value.map((item) => ({ ...item })),
    setSorting,
    clearFilter,
    clearSearch,
    getEditing: () =>
      editingState.value
        ? { ...editingState.value, values: { ...editingState.value.values } }
        : null,
    startCellEdit,
    startRowEdit,
    setEditValue,
    commitEdit,
    cancelEdit,
    copyCellRange,
    toggleRowSelection: (row: TData, selected?: boolean) => {
      const keyConfig = rowKey.value;
      let key: STableRowKey;
      if (keyConfig) {
        key = resolveRowKey(row, 0, keyConfig);
        // 稳定 rowKey 场景直接复用 TanStack 的 O(1) 行索引，并校验记录身份仍属于当前表格。
        if (table.getCoreRowModel().rowsById[encodeRowKey(key)]?.original !== row) return;
      } else {
        const index = dataSource.value.indexOf(row);
        if (index === -1) return;
        key = index;
      }
      if (selected === undefined) {
        toggleRow(key);
      } else if (selected) {
        selectRow(key);
      } else {
        deselectRow(key);
      }
    },
    // 展开相关方法
    getExpandedRowKeys: () => [...expandedRowKeys.value],
    toggleExpand,
    expandRow,
    collapseRow,
    expandAll,
    collapseAll,
    getGroupBy,
    setGroupBy,
    expandAllGroups,
    collapseAllGroups,
    toggleGroup,
    pinRow,
    getPinnedRowKeys,
    // 虚拟滚动相关方法
    scrollToRow: (targetKey: STableRowKey): boolean => {
      // 虚拟器和 data-index 都以 centerRows 为坐标；顶/底固定行 sticky 常驻，不能再按
      // 全表 displayIndex 换算，否则 pin 两行后会把目标滚到错误的中间行。
      const targetId = encodeRowKey(targetKey);
      if (
        !table.getPrePaginatedRowModel().rowsById[targetId] &&
        !table.getCoreRowModel().rowsById[targetId]
      ) {
        return false;
      }

      const isPinnedTarget = () =>
        topRows.value.some((row) => row.id === targetId) ||
        bottomRows.value.some((row) => row.id === targetId);

      const doScroll = (): boolean => {
        if (isPinnedTarget()) return true;
        const index = centerRows.value.findIndex((row) => row.id === targetId);
        if (index < 0) return false;
        scrollToIndex(index);
        return true;
      };

      const pagination = tanstackPaginationState.value;
      if (pagination && !isPinnedTarget()) {
        const preIndex = table
          .getPrePaginatedRowModel()
          .rows.findIndex((row) => row.id === targetId);
        if (preIndex >= 0) {
          const targetPageIndex = Math.floor(preIndex / pagination.pageSize);
          if (targetPageIndex !== pagination.pageIndex) {
            handlePageChange(targetPageIndex + 1);
            nextTick(doScroll);
            return true;
          }
        }
      }
      return doScroll();
    },
    scrollToTop,
    scrollToBottom: scrollToEnd,
    scrollToColumn,
    getScrollPosition: () => {
      const element = scrollContainerRef.value;
      return element ? { left: element.scrollLeft, top: element.scrollTop } : { left: 0, top: 0 };
    },
    scrollTo: (position: { left?: number; top?: number; behavior?: ScrollBehavior }) =>
      scrollContainerRef.value?.scrollTo?.(position),
    // 框选相关方法
    getCellRange: getCellRangeSnapshot,
    clearCellRange,
    getSelectedRange: getCellRangeSnapshot,
    clearAllSelectedRange: clearCellRange,
    // 列顺序方法直接复用 TanStack columnOrderingFeature 的状态入口。
    getColumnOrder,
    setColumnOrder,
    resetColumnOrder,
    swapColumns,
    moveColumn,
    moveColumnByIndex,
  } satisfies STableInstance<TData>;

  return api;
};
