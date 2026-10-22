import { computed, toRef } from 'vue';
import type { RowData } from '@tanstack/vue-table';
import { serializeDelimitedRows } from '@zchengfeng/s-table-core';
import { createCellRangeClipboard, decodeRowKey } from '../utils';
import { useCellRange } from '../hooks';
import { isInternalColumn } from '../utils/column';
import type {
  STableCellRange,
  STableCellRangeCopyEvent,
  STableCopyOptions,
  STableRowKey,
} from '../types';
import type { useColumnState } from './useColumnState';
import type { useDataState } from './useDataState';
import type { useTableModel } from './useTableModel';
import type { STableSetupContext } from './types';

/**
 * 单元格框选桥接层：TanStack cellSelectionFeature 状态 → 公开范围 / 剪贴板 / 行点击。
 */
export const useCellRangeBridge = <TData extends RowData>(
  context: STableSetupContext<TData>,
  dataState: ReturnType<typeof useDataState<TData>>,
  tableModel: ReturnType<typeof useTableModel<TData>>,
  columnState: ReturnType<typeof useColumnState<TData>>
) => {
  const { props, cellRangeSelection, dataSource, rowKey, tree, rowSelection, emit } = context;
  const { toggleRow, toggleRows } = dataState;
  const { table, rows, cellSelectionState } = tableModel;
  const { getColumnById } = columnState;

  /**
   * 对外派发一次完整框选结果。范围计算由 TanStack 完成，这里只按现有公开契约补充行数据。
   */
  const emitCellRangeSelection = (range: STableCellRange) => {
    emit('cellRangeChange', range);
    const minRow = Math.min(range.startRow, range.endRow);
    const maxRow = Math.max(range.startRow, range.endRow);
    const records: TData[] = [];
    // cell 模式且存在 checkbox 选择列时，范围覆盖行的选择状态同步取反。
    // radio 模式只能保留一个值，不参与批量切换。
    const toggleSelection =
      cellRangeSelection.value?.mode === 'cell' &&
      rowSelection.value !== undefined &&
      rowSelection.value.type !== 'radio';
    const rowKeysToToggle: STableRowKey[] = [];
    for (let index = minRow; index <= maxRow; index++) {
      const row = rows.value[index];
      if (!row) continue;
      records.push(row.original);
      if (toggleSelection && row.getCanSelect()) rowKeysToToggle.push(decodeRowKey(row.id));
    }
    if (rowKeysToToggle.length > 0) toggleRows(rowKeysToToggle);
    emit('cellRangeSelect', range, records);
  };

  // 单元格框选：状态、成员关系和边界均由 TanStack cellSelectionFeature 托管。
  // 清除订阅原始数据源引用；hook 内部按行 key 集合比较，数据重建但行未增删时不清空框选。
  const {
    currentRange: cellRange,
    isDragging: isCellRangeDragging,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleRowClick: handleCellRangeRowClick,
    clearRange: clearCellRange,
  } = useCellRange<TData>({
    table,
    enabled: toRef(() => cellRangeSelection.value !== undefined),
    cellSelectionState,
    rows,
    cellRangeSelection,
    dataSource,
    rowKey,
    tree,
    onSelectionEnd: emitCellRangeSelection,
    onRangeClear: () => emit('cellRangeChange', null),
  });

  // TanStack 将焦点角点与选区一起存储；直接读取最后一个 range 的 anchor，避免调用
  // getFocusedCell() 时为返回完整 Cell 物化整行全部列，尤其不能破坏横向虚拟化的收益。
  // 这里只投影两个字符串坐标，同时让框选焦点在同一矩形内移动时只刷新旧/新焦点所在行。
  const focusedCell = computed<{ rowId: string; columnId: string } | undefined>(() => {
    const range = cellSelectionState.value.at(-1);
    return range ? { rowId: range.anchorRowId, columnId: range.anchorColumnId } : undefined;
  });

  // 两个公开查询入口共享同一份不可变快照，避免调用方修改内部响应式对象。
  const getCellRangeSnapshot = () => (cellRange.value ? { ...cellRange.value } : null);

  // ==================== 多区间 API ====================
  /** 按固定列分组后的视觉顺序获取全部可见叶子列。 */
  const getDisplayColumns = () => [
    ...table.getStartVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getEndVisibleLeafColumns(),
  ];
  const getColumnIdByIndex = (columnIndex: number) => getDisplayColumns()[columnIndex]?.id;

  const toPublicRange = (bounds: {
    minRowIndex: number;
    maxRowIndex: number;
    minColumnIndex: number;
    maxColumnIndex: number;
  }): STableCellRange | null => {
    const renderedRows = rows.value;
    if (renderedRows.length === 0) return null;
    const firstRenderedRowIndex = renderedRows[0]?.getDisplayIndex() ?? 0;
    const startRow = bounds.minRowIndex - firstRenderedRowIndex;
    const endRow = bounds.maxRowIndex - firstRenderedRowIndex;
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
      startCol: bounds.minColumnIndex,
      endRow,
      endCol: bounds.maxColumnIndex,
    };
  };

  /** 获取全部公开区间快照。 */
  const getCellRanges = (): STableCellRange[] =>
    table
      .getCellSelectionBounds()
      .map(toPublicRange)
      .filter((range): range is STableCellRange => range !== null);

  const toSelectionRange = (range: STableCellRange) => {
    const startRow = rows.value[Math.min(range.startRow, range.endRow)];
    const endRow = rows.value[Math.max(range.startRow, range.endRow)];
    const startColumnId = getColumnIdByIndex(Math.min(range.startCol, range.endCol));
    const endColumnId = getColumnIdByIndex(Math.max(range.startCol, range.endCol));
    if (!startRow || !endRow || !startColumnId || !endColumnId) return undefined;
    return {
      anchorRowId: startRow.id,
      anchorColumnId: startColumnId,
      focusRowId: endRow.id,
      focusColumnId: endColumnId,
    };
  };

  /** 设置区间；mode 支持 replace / include / exclude。 */
  const setCellRange = (
    range: STableCellRange | null,
    options: { mode?: 'replace' | 'include' | 'exclude' } = {}
  ): boolean => {
    if (range === null) {
      clearCellRange();
      return true;
    }
    const selection = toSelectionRange(range);
    if (!selection) return false;
    table.selectCellRange(selection, { mode: options.mode ?? 'replace' });
    emit('cellRangeChange', range);
    return true;
  };

  const addCellRange = (
    range: STableCellRange,
    options: { mode?: 'include' | 'exclude' } = {}
  ): boolean => setCellRange(range, { mode: options.mode ?? 'include' });

  /** 清除全部区间，或按下标清除单个区间。 */
  const clearCellRangeAt = (index?: number) => {
    if (index === undefined) {
      clearCellRange();
      return;
    }
    table.setCellSelection((previous) => previous.filter((_, current) => current !== index));
  };

  /** 聚焦单个单元格（同时建立单格选区）。 */
  const focusCell = (rowIndex: number, columnIndex: number): boolean =>
    setCellRange({
      startRow: rowIndex,
      endRow: rowIndex,
      startCol: columnIndex,
      endCol: columnIndex,
    });

  /** 全选当前行模型中的可选单元格。 */
  const selectAllCellRange = () => {
    if (!cellRangeSelection.value) return;
    table.selectAllCells();
    const active = cellRange.value;
    if (active) emit('cellRangeChange', active);
  };

  /** Shift+方向键：扩展当前区间，并同步公开的范围变化事件。 */
  const extendCellRange = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!cellRangeSelection.value) return;
    table.extendCellSelection(direction);
    const active = cellRange.value;
    if (active) emit('cellRangeChange', active);
  };

  /** 活动区间的列 ID 切片；多区间时不能使用全局列并集，否则值矩阵会错位。 */
  const getActiveRangeColumnIds = (): string[] => {
    const bounds = table.getCellSelectionBounds().at(-1);
    if (!bounds) return [];
    return getDisplayColumns()
      .slice(bounds.minColumnIndex, bounds.maxColumnIndex + 1)
      .map((column) => column.id);
  };

  /**
   * 剪贴板列 id 会过滤内部列；row 模式下值矩阵包含内部列，
   * 必须按同一组列索引过滤，避免复制结果错位。
   */
  const getCopySelectedValues = () => {
    const grid = table.getSelectedCellRangesData().at(-1);
    if (!grid) return grid;
    const columnIds = getActiveRangeColumnIds();
    const keepIndexes: number[] = [];
    for (let index = 0; index < columnIds.length; index++) {
      if (!isInternalColumn(columnIds[index]!)) keepIndexes.push(index);
    }
    if (keepIndexes.length === columnIds.length) return grid;
    return grid.map((row) => keepIndexes.map((index) => row[index]));
  };

  const { serialize: serializeCellRange } = createCellRangeClipboard({
    getRange: () => (cellRange.value ? { ...cellRange.value } : null),
    getColumnIds: getActiveRangeColumnIds,
    getSelectedValues: getCopySelectedValues,
    getColumnHeader: (columnId) => getColumnById(columnId)?.header,
    isInternalColumn,
  });

  /**
   * Vue 的 emit 不会返回监听器结果，因此可取消监听器声明为 onCellRangeCopy callback prop；
   * 模板仍可使用标准的 `@cell-range-copy`，组件内部则直接调用它来读取 `false`。
   */
  const canCopyCellRange = (payload: STableCellRangeCopyEvent) =>
    props.onCellRangeCopy?.(payload) !== false;

  const isEditableCopyTarget = (target: EventTarget | null) =>
    Boolean(
      (target as Element | null)?.closest?.(
        'input, textarea, [contenteditable]:not([contenteditable="false"])'
      )
    );

  /** 将当前框选写入系统剪贴板，并返回生成的文本。 */
  const copyCellRange = async (options: STableCopyOptions = {}): Promise<string> => {
    if (options.ranges === 'all') {
      const grids = table.getSelectedCellRangesData();
      const bounds = table.getCellSelectionBounds();
      if (grids.length === 0) return '';
      const displayColumns = getDisplayColumns();
      const text = grids
        .map((grid, rangeIndex) => {
          const rangeBounds = bounds[rangeIndex];
          if (!rangeBounds) return '';
          const keepIndexes: number[] = [];
          for (let index = 0; index < (grid[0]?.length ?? 0); index++) {
            const column = displayColumns[rangeBounds.minColumnIndex + index];
            if (column && !isInternalColumn(column.id)) keepIndexes.push(index);
          }
          return serializeDelimitedRows(
            grid.map((row) => keepIndexes.map((index) => row[index])),
            {
              delimiter: options.delimiter ?? '\t',
              preventFormulaInjection: options.preventFormulaInjection,
            }
          );
        })
        .filter(Boolean)
        .join('\r\n\r\n');
      if (!text) return '';
      // 与单区间复制保持一致：监听器仍可拒绝写入剪贴板。
      if (
        !canCopyCellRange({
          range: { ...cellRange.value! },
          text,
          columnIds: getActiveRangeColumnIds(),
          source: 'api',
        })
      ) {
        return '';
      }
      if (options.writeToClipboard !== false && typeof navigator !== 'undefined') {
        await navigator.clipboard?.writeText?.(text);
      }
      return text;
    }
    const payload = serializeCellRange(options, 'api');
    if (!payload) return '';
    if (!canCopyCellRange(payload)) return '';
    if (options.writeToClipboard !== false && typeof navigator !== 'undefined') {
      await navigator.clipboard?.writeText?.(payload.text);
    }
    return payload.text;
  };

  /**
   * 接管浏览器原生 copy 事件可同步写入 ClipboardEvent，无需额外剪贴板权限。
   * 编辑器内的文本选择不属于表格框选，继续交由浏览器处理。
   */
  const handleCellRangeCopy = (event: ClipboardEvent) => {
    if (isEditableCopyTarget(event.target)) return;
    const payload = serializeCellRange({}, 'clipboard', event);
    if (!payload) return;

    const allowed = canCopyCellRange(payload) && !event.defaultPrevented;
    if (!allowed) return;
    event.preventDefault();
    event.clipboardData?.setData('text/plain', payload.text);
  };

  /** 普通表格单元格没有浏览器文本选区时不会稳定触发 copy，因此快捷键需显式写入剪贴板。 */
  const handleCellRangeCopyShortcut = (event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      event.key.toLowerCase() !== 'c' ||
      (!event.ctrlKey && !event.metaKey) ||
      event.altKey ||
      isEditableCopyTarget(event.target)
    ) {
      return;
    }
    const payload = serializeCellRange({}, 'keyboard', event);
    if (!payload) return;
    if (!canCopyCellRange(payload)) return;

    event.preventDefault();
    if (typeof navigator === 'undefined') return;
    // 键盘事件不能 await；失败时保持现有选区，调用方仍可通过实例 API 显式处理权限错误。
    const writePromise = navigator.clipboard?.writeText?.(payload.text);
    writePromise?.catch(() => undefined);
  };
  // 行点击处理（row 模式，可能联动行选择）
  /** 处理整行框选，并按配置联动行选择状态。 */
  const handleRowClick = (rowIndex: number) => {
    const config = cellRangeSelection.value;
    if (!config || config.mode !== 'row') return;
    handleCellRangeRowClick(rowIndex);
    if (config.selectRowOnClick && rowSelection.value) {
      const row = rows.value[rowIndex];
      if (row) {
        // row.id 已由 STable 编码，直接恢复公开 key，避免再次执行用户 rowKey 函数。
        toggleRow(decodeRowKey(row.id));
      }
    }
  };

  return {
    cellRange,
    isCellRangeDragging,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCellRangeRowClick,
    clearCellRange,
    focusedCell,
    getCellRangeSnapshot,
    getCellRanges,
    setCellRange,
    addCellRange,
    clearCellRangeAt,
    focusCell,
    selectAllCellRange,
    extendCellRange,
    copyCellRange,
    handleCellRangeCopy,
    handleCellRangeCopyShortcut,
    handleRowClick,
  };
};
