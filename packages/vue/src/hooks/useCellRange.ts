import { computed, onBeforeUnmount, shallowRef, watch, type Ref } from 'vue';
import {
  type Cell,
  type CellSelectionState,
  type Row,
  type RowData,
  type Table,
  type TableFeatures,
} from '@tanstack/vue-table';
import type {
  STableCellRange,
  STableCellRangeSelection,
  STableRowKey,
  STableRowKeyField,
  STableTree,
} from '../types';
import { getCachedCell, getOwnerDocument } from '../utils';

type STableInstance<TData extends RowData> = Table<TableFeatures, TData>;

/** `useCellRange` 的入参约束。 */
type UseSTableCellRangeOptions<TData extends RowData> = {
  /** TanStack 表格实例，框选状态与范围计算均由其内置 feature 托管。 */
  table: STableInstance<TData>;
  /** 框选未启用时不建立行身份快照，也不响应数据变化。 */
  enabled?: Readonly<Ref<boolean>>;
  /** 当前实际渲染的最终行模型，用于兼容公开的页内索引范围。 */
  rows: Readonly<Ref<Row<TableFeatures, TData>[]>>;
  /** 通过 adapter 桥接后的 TanStack 框选 atom。 */
  cellSelectionState: Readonly<Ref<CellSelectionState>>;
  /** 框选配置（来自 props.cellRangeSelection）。 */
  cellRangeSelection: Readonly<Ref<STableCellRangeSelection | undefined>>;
  /** 原始数据源；行 key 集合变化（增删 / 重排）时清空公开范围。 */
  dataSource?: Readonly<Ref<readonly TData[]>>;
  /** 行标识配置，用于把行解析为 key 参与集合比较。 */
  rowKey?: Readonly<Ref<STableRowKeyField<TData> | ((record: TData) => STableRowKey) | undefined>>;
  /** 树形配置；框选身份集合需包含嵌套子行。 */
  tree?: Readonly<Ref<STableTree<TData> | undefined>>;
  /** 一次拖拽或 row 模式选择完成后的通知。 */
  onSelectionEnd?: (range: STableCellRange) => void;
  /** 已有范围被清除后的通知，用于同步公开的受控事件。 */
  onRangeClear?: () => void;
};

/**
 * TanStack cellSelectionFeature 的 Vue 交互适配层。
 *
 * 范围状态、固定列后的显示顺序、成员判断和边界判断全部复用 TanStack；这里仅维护
 * 自动滚动需要的拖拽标记，并把官方的行/列 ID 角点转换为 STable 既有的索引 API。
 */
export const useCellRange = <TData extends RowData>({
  table,
  enabled,
  rows,
  cellSelectionState,
  cellRangeSelection,
  dataSource,
  rowKey: rowKeyConfig,
  tree,
  onSelectionEnd,
  onRangeClear,
}: UseSTableCellRangeOptions<TData>) => {
  const isDragging = shallowRef(false);
  const isEnabled = () => enabled?.value ?? Boolean(cellRangeSelection.value);
  let removeInteractionListeners: (() => void) | undefined;
  let previousRowKeys: string[] | undefined;

  /** 从 TanStack 当前行模型中按 ID 懒创建单个单元格，避免物化整行的所有 Cell。 */
  const getCell = (rowId: string, columnId: string) => {
    const row =
      table.getPrePaginatedRowModel().rowsById[rowId] ?? table.getCoreRowModel().rowsById[rowId];
    const column = table.getColumn(columnId);
    if (!row || !column) return undefined;
    return getCachedCell(row, column);
  };

  /**
   * 将 TanStack 的 ID 角点转换为公开索引范围。
   * 行索引相对当前渲染页，列索引直接复用官方按 pinning 后视觉顺序生成的索引表。
   */
  const currentRange = computed<STableCellRange | null>(() => {
    const renderedRows = rows.value;
    if (cellSelectionState.value.length === 0) return null;
    const bounds = table.getCellSelectionBounds();
    const activeBounds = bounds[bounds.length - 1];
    if (!activeBounds || renderedRows.length === 0) return null;

    // 使用 TanStack 已解析的最终正选矩形，天然处理排序、过滤、固定列和排除操作。
    const firstRenderedRowIndex = renderedRows[0]?.getDisplayIndex() ?? 0;
    const startRow = activeBounds.minRowIndex - firstRenderedRowIndex;
    const endRow = activeBounds.maxRowIndex - firstRenderedRowIndex;
    if (
      startRow < 0 ||
      endRow < 0 ||
      startRow >= renderedRows.length ||
      endRow >= renderedRows.length
    ) {
      return null;
    }

    return {
      startRow,
      startCol: activeBounds.minColumnIndex,
      endRow,
      endCol: activeBounds.maxColumnIndex,
    };
  });

  const finishDragging = () => {
    removeInteractionListeners?.();
    removeInteractionListeners = undefined;
    if (!isDragging.value) return;
    isDragging.value = false;
    const range = currentRange.value;
    if (range) onSelectionEnd?.(range);
  };

  /** cell 模式按下：通过适配层调用 TanStack 内置开始处理器。 */
  const handleCellMouseDown = (rowId: string, columnId: string, event: MouseEvent) => {
    if (!isEnabled() || cellRangeSelection.value?.mode !== 'cell') return;
    const cell = getCell(rowId, columnId);
    if (!cell?.getCanSelect()) return;

    removeInteractionListeners?.();
    const contextDocument = getOwnerDocument(event.currentTarget as Node | null)!;
    const contextWindow = contextDocument.defaultView;

    cell.getSelectionStartHandler(contextDocument)(event);
    if (dataSource) previousRowKeys ??= collectRowKeys();
    isDragging.value = true;

    // 官方 handler 管理选择状态；这里仅同步组件 UI 和公开完成事件。
    const handleMouseUp = () => finishDragging();
    const handleWindowBlur = () => {
      const MouseEventCtor = contextWindow?.MouseEvent ?? MouseEvent;
      contextDocument.dispatchEvent(new MouseEventCtor('mouseup'));
    };
    contextDocument.addEventListener('mouseup', handleMouseUp, { once: true });
    contextWindow?.addEventListener('blur', handleWindowBlur, { once: true });
    removeInteractionListeners = () => {
      contextDocument.removeEventListener('mouseup', handleMouseUp);
      contextWindow?.removeEventListener('blur', handleWindowBlur);
    };
  };

  /** cell 模式移入：直接调用 TanStack 内置扩展处理器。 */
  const handleCellMouseEnter = (rowId: string, columnId: string, event?: MouseEvent) => {
    if (!isEnabled() || !isDragging.value || cellRangeSelection.value?.mode !== 'cell') return;
    const cell = getCell(rowId, columnId);
    if (cell) cell.getSelectionExtendHandler()(event);
  };

  /** row 模式仍是 STable 扩展语义，但范围写入统一走官方 selectCellRange。 */
  const handleRowClick = (rowIndex: number) => {
    if (!isEnabled() || cellRangeSelection.value?.mode !== 'row') return;
    const row = rows.value[rowIndex];
    if (!row) return;
    const columnGroups = [
      table.getStartVisibleLeafColumns(),
      table.getCenterVisibleLeafColumns(),
      table.getEndVisibleLeafColumns(),
    ];
    let firstCell: Cell<TableFeatures, TData> | undefined;
    let lastCell: Cell<TableFeatures, TData> | undefined;
    for (const columns of columnGroups) {
      for (const column of columns) {
        const cell = getCachedCell(row, column);
        if (cell.getCanSelect()) {
          firstCell = cell;
          break;
        }
      }
      if (firstCell) break;
    }
    for (let groupIndex = columnGroups.length - 1; groupIndex >= 0; groupIndex--) {
      const columns = columnGroups[groupIndex]!;
      for (let columnIndex = columns.length - 1; columnIndex >= 0; columnIndex--) {
        const column = columns[columnIndex];
        if (!column) continue;
        const cell = getCachedCell(row, column);
        if (cell.getCanSelect()) {
          lastCell = cell;
          break;
        }
      }
      if (lastCell) break;
    }
    if (!firstCell || !lastCell) return;

    table.selectCellRange({
      anchorRowId: row.id,
      anchorColumnId: firstCell.column.id,
      focusRowId: row.id,
      focusColumnId: lastCell.column.id,
    });
    if (dataSource) previousRowKeys ??= collectRowKeys();
    const range = currentRange.value;
    if (range) onSelectionEnd?.(range);
  };

  /** 清除框选时使用适配层 reset API，并同步结束组件侧拖拽。 */
  const clearRange = () => {
    // 行被删除后解析边界会先变空，但原始选择操作仍存在；读取 v9 公开 atom 才能可靠判断是否需要通知清除。
    const hadRange = cellSelectionState.value.length > 0;
    removeInteractionListeners?.();
    removeInteractionListeners = undefined;
    isDragging.value = false;
    table.resetCellSelection(true);
    previousRowKeys = undefined;
    if (hadRange) onRangeClear?.();
  };

  const collectRowKeys = (): string[] => {
    // 直接复用 Core Row Model 的真实 id：它已包含父路径 fallback、重复 key 消歧和
    // 自定义 rowKey 结果，避免在这里用局部 sibling index 构造另一套行身份。
    return table.getCoreRowModel().flatRows.map((row) => row.id);
  };

  // 配置对象常以内联字面量传入；只监听真正影响选择语义的 mode，避免父组件重渲染
  // 产生新对象引用时误清空 TanStack 已维护的范围。
  watch(
    () => cellRangeSelection.value?.mode,
    () => clearRange()
  );
  if (dataSource) {
    // 只在数据身份或行身份配置变化时检查范围；不要把 TanStack atom 放进 getter，
    // 否则拖拽每次更新选区都可能触发一次 O(n) 数据扫描。
    // 拆成独立的单值 source：watch 数组里的数组 getter 每次求值都会新建数组引用，
    // 任一依赖触发都产生无谓的 O(3) 分配。
    watch([dataSource, () => rowKeyConfig?.value, () => tree?.value], () => {
      if (!isEnabled() || !cellRangeSelection.value || cellSelectionState.value.length === 0) {
        return;
      }
      const nextKeys = collectRowKeys();
      const previousKeys = previousRowKeys;
      previousRowKeys = nextKeys;
      if (!previousKeys) return;
      if (nextKeys.length !== previousKeys.length) {
        clearRange();
        return;
      }
      for (let index = 0; index < nextKeys.length; index++) {
        if (nextKeys[index] !== previousKeys[index]) {
          clearRange();
          return;
        }
      }
    });
    watch(
      () => cellSelectionState.value.length > 0,
      (hasSelection) => {
        if (!isEnabled()) return;
        if (hasSelection) previousRowKeys ??= collectRowKeys();
        else previousRowKeys = undefined;
      }
    );
  }
  watch(
    () =>
      isEnabled() &&
      !isDragging.value &&
      currentRange.value === null &&
      cellSelectionState.value.length > 0,
    (stale) => {
      if (stale) clearRange();
    }
  );
  onBeforeUnmount(() => {
    removeInteractionListeners?.();
    removeInteractionListeners = undefined;
    isDragging.value = false;
  });

  return {
    currentRange,
    isDragging,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleRowClick,
    clearRange,
  };
};
