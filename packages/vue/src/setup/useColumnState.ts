import { computed } from 'vue';
import type { ColumnDef, Row, RowData, TableFeatures } from '@tanstack/vue-table';
import { useColumnDrag, useColumns, useRowDrag, useSeq } from '../hooks';
import type { useDataState } from './useDataState';
import type { STableSetupContext } from './types';

/**
 * 列模型状态：列拖拽、行拖拽句柄列、序号列、注入列与列归一化。
 *
 * `getRows` 由调用方以闭包传入（table model 创建晚于本模块），
 * 与拆分前组件内的惰性读取行为一致。
 */
export const useColumnState = <TData extends RowData>(
  context: STableSetupContext<TData>,
  dataState: ReturnType<typeof useDataState<TData>>,
  options: { getRows: () => Row<TableFeatures, TData>[] }
) => {
  const {
    columns,
    tree,
    dataSource,
    columnDrag,
    rowDragEnabled,
    rowDragConfig,
    resolvedLocale,
    seq,
    slots,
    emit,
    cellRangeSelection,
  } = context;
  const {
    leafColumnIds,
    selectionColumn,
    expandColumn,
    sortingState,
    groupingActive,
    rowPinningState,
    currentPage,
    currentPageSize,
    paginationEnabled,
    columnMap,
  } = dataState;

  // 列拖拽排序
  const {
    isDragging: isColumnDragging,
    dragFromIndex: dragColumnFromIndex,
    dragOverIndex: dragColumnOverIndex,
    columnOrder,
    onTanStackColumnOrderChange,
    handleColumnDragStart,
    handleColumnDragOver,
    handleColumnDragEnd,
    handleColumnDrop: handleColumnOrderDrop,
    getColumnOrder,
    setColumnOrder,
    resetColumnOrder,
    swapColumns,
    moveColumn,
    moveColumnByIndex,
  } = useColumnDrag<TData>({
    columns,
    leafColumnIds,
    columnDrag,
    onColumnOrderChange: (payload) => emit('columnOrderChange', payload),
  });

  // 行拖拽排序
  const {
    isDragging: isRowDragging,
    dragFromIndex: dragRowFromIndex,
    dragOverIndex: dragRowOverIndex,
    dropPosition: dragRowDropPosition,
    dragColumn: dragHandleColumn,
    handleRowDragOver,
    handleRowDragEnd,
    handleRowDrop,
  } = useRowDrag<TData>({
    enabled: rowDragEnabled,
    config: rowDragConfig,
    tree,
    getDataSource: () => dataSource.value,
    getRows: () => options.getRows(),
    // 排序后的视觉位置不等于原始 dataSource 顺序，此时手工重排没有稳定语义。
    canReorder: () =>
      sortingState.value.length === 0 &&
      !groupingActive.value &&
      rowPinningState.value.top.length === 0 &&
      rowPinningState.value.bottom.length === 0,
    onRowOrderChange: (payload) => {
      emit('update:dataSource', payload.dataSource);
      emit('rowOrderChange', payload);
    },
    renderDragHandle: slots.rowDragHandle ? (scope) => slots.rowDragHandle!(scope) : undefined,
  });

  // 内置序号列（序号随分页联动）。
  const { seqColumn } = useSeq<TData>({
    seq,
    currentPage,
    currentPageSize,
    paginationEnabled,
    defaultTitle: computed(() => resolvedLocale.value.table.sequence),
  });

  // 将拖拽句柄列、选择列、展开列、序号列收集为注入列。
  // 与用户列分离传递：注入列随交互状态（如页码变化导致序号列重建）高频更新，
  // 不再连带重新归一化用户列树（见 useColumns.internalColumns）。
  const composedInternalColumns = computed<ColumnDef<TableFeatures, TData, unknown>[]>(() => {
    const extraCols: ColumnDef<TableFeatures, TData, unknown>[] = [];
    if (dragHandleColumn.value) extraCols.push(dragHandleColumn.value);
    if (selectionColumn.value) extraCols.push(selectionColumn.value);
    if (expandColumn.value) extraCols.push(expandColumn.value);
    if (seqColumn.value) extraCols.push(seqColumn.value);
    // row 模式需要整行高亮（含选择/展开/拖拽/序号），内部列必须参与框选；
    // cell 模式仍通过 columnDef opt-out 排除内部列，保持复制与范围索引对齐。
    const enableCellSelection = cellRangeSelection.value?.mode === 'row';
    return extraCols.map((column) => ({ ...column, enableCellSelection }));
  });

  const tanstackColumnOrder = computed(() => {
    const userOrder = columnOrder.value;
    const userIds = new Set(userOrder);
    const internalLeafIds = composedInternalColumns.value.flatMap((column) => {
      const id = column.id;
      return id ? [id] : [];
    });
    const allLeafIds = [...internalLeafIds, ...leafColumnIds.value];
    const allLeafIdSet = new Set(allLeafIds);
    const nextOrder: string[] = [];
    for (const id of allLeafIds) if (!userIds.has(id)) nextOrder.push(id);
    for (const id of userOrder) if (allLeafIdSet.has(id)) nextOrder.push(id);
    return nextOrder;
  });

  const {
    normalizedColumns,
    cellRenderToken,
    rowModelDependencyToken,
    columnPinning,
    columnVisibility,
    hasCellSpanning,
    getColumnById,
    explicitMinWidth,
    explicitWidthIds,
  } = useColumns<TData>({
    columns,
    columnMap,
    internalColumns: composedInternalColumns,
  });

  return {
    // 列拖拽
    isColumnDragging,
    dragColumnFromIndex,
    dragColumnOverIndex,
    columnOrder,
    onTanStackColumnOrderChange,
    handleColumnDragStart,
    handleColumnDragOver,
    handleColumnDragEnd,
    handleColumnOrderDrop,
    getColumnOrder,
    setColumnOrder,
    resetColumnOrder,
    swapColumns,
    moveColumn,
    moveColumnByIndex,
    // 行拖拽
    isRowDragging,
    dragRowFromIndex,
    dragRowOverIndex,
    dragRowDropPosition,
    dragHandleColumn,
    handleRowDragOver,
    handleRowDragEnd,
    handleRowDrop,
    // 序号 / 注入列
    seqColumn,
    composedInternalColumns,
    tanstackColumnOrder,
    // 列归一化
    normalizedColumns,
    cellRenderToken,
    rowModelDependencyToken,
    columnPinning,
    columnVisibility,
    hasCellSpanning,
    getColumnById,
    explicitMinWidth,
    explicitWidthIds,
  };
};
