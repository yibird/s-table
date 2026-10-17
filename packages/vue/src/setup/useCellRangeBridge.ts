import { computed, toRef } from 'vue';
import type { RowData } from '@tanstack/vue-table';
import { createCellRangeClipboard, decodeRowKey } from '../utils';
import { useCellRange } from '../hooks';
import { isInternalColumn } from '../utils/column';
import type { STableCellRange, STableCellRangeCopyEvent, STableCopyOptions } from '../types';
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
  const { toggleRow } = dataState;
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
    for (let index = minRow; index <= maxRow; index++) {
      const row = rows.value[index];
      if (row) records.push(row.original);
    }
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

  /**
   * 剪贴板列 id 会过滤内部列；row 模式下值矩阵包含内部列，
   * 必须按同一组列索引过滤，避免复制结果错位。
   */
  const getCopySelectedValues = () => {
    const grid = table.getSelectedCellRangesData().at(-1);
    if (!grid || cellRangeSelection.value?.mode !== 'row') return grid;
    const keepIndexes: number[] = [];
    const columnIds = table.getCellSelectionColumnIds();
    for (let index = 0; index < columnIds.length; index++) {
      if (!isInternalColumn(columnIds[index]!)) keepIndexes.push(index);
    }
    return grid.map((row) => keepIndexes.map((index) => row[index]));
  };

  const { serialize: serializeCellRange } = createCellRangeClipboard({
    getRange: () => (cellRange.value ? { ...cellRange.value } : null),
    getColumnIds: () => table.getCellSelectionColumnIds(),
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
    copyCellRange,
    handleCellRangeCopy,
    handleCellRangeCopyShortcut,
    handleRowClick,
  };
};
