import type { Cell, RowData, TableFeatures } from '@tanstack/vue-table';
import type { STableCellRange } from '../../types';
import type { RenderItem } from './useRowRenderItems';

const CELL_RANGE_SELECTED = 1;
const CELL_RANGE_EDGE_TOP = 1 << 1;
const CELL_RANGE_EDGE_BOTTOM = 1 << 2;
const CELL_RANGE_EDGE_LEFT = 1 << 3;
const CELL_RANGE_EDGE_RIGHT = 1 << 4;
const CELL_RANGE_FOCUSED = 1 << 5;

const RANGE_CLASS_CACHE = Array.from({ length: 64 }, (_, state) => ({
  's-table-cell-range-selected': Boolean(state & CELL_RANGE_SELECTED),
  's-table-cell-range-edge-top': Boolean(state & CELL_RANGE_EDGE_TOP),
  's-table-cell-range-edge-bottom': Boolean(state & CELL_RANGE_EDGE_BOTTOM),
  's-table-cell-range-edge-left': Boolean(state & CELL_RANGE_EDGE_LEFT),
  's-table-cell-range-edge-right': Boolean(state & CELL_RANGE_EDGE_RIGHT),
  's-table-cell-range-focused': Boolean(state & CELL_RANGE_FOCUSED),
}));

/**
 * 单元格框选呈现缓存：把边界状态位组合为稳定类名对象，
 * 命中缓存时返回同一引用，避免 v-memo 因类名对象重建而失效。
 */
type CellRangePresentation = {
  rowMemoKey: string;
  state: number;
  classes: Record<string, boolean>;
};

const EMPTY_RANGE_PRESENTATION: CellRangePresentation = {
  rowMemoKey: '',
  state: 0,
  classes: RANGE_CLASS_CACHE[0]!,
};

type CellRangePresentationOptions = {
  /** 当前框选范围（context ref 解包后的值）。 */
  getCellRange: () => STableCellRange | null;
  /** 框选模式；未启用框选时热路径完全不进入 range 计算。 */
  getCellRangeMode: () => 'cell' | 'row' | undefined;
  /** 读取 TanStack 当前焦点角点；不物化整张选区。 */
  getFocusedCell: () => { rowId: string; columnId: string } | undefined;
};

/**
 * 框选呈现的纯计算模块：
 * 成员关系和四条边完全复用 TanStack Cell API，避免在渲染层重复实现固定列顺序与范围算法。
 */
export const createCellRangePresentation = <TData extends RowData>({
  getCellRange,
  getCellRangeMode,
  getFocusedCell,
}: CellRangePresentationOptions) => {
  const cellRangePresentationCache = new WeakMap<
    Cell<TableFeatures, TData>,
    CellRangePresentation
  >();

  const getCellRangePresentation = (
    cell: Cell<TableFeatures, TData>,
    item: RenderItem<TData>
  ): CellRangePresentation => {
    if (!getCellRange()) return EMPTY_RANGE_PRESENTATION;
    const cached = cellRangePresentationCache.get(cell);
    if (cached?.rowMemoKey === item.rangeMemoKey) return cached;
    if (!cell.getIsSelected()) {
      const presentation = { ...EMPTY_RANGE_PRESENTATION, rowMemoKey: item.rangeMemoKey };
      cellRangePresentationCache.set(cell, presentation);
      return presentation;
    }
    const edges = cell.getSelectionEdges();
    let state = CELL_RANGE_SELECTED;
    if (edges.top) state |= CELL_RANGE_EDGE_TOP;
    if (edges.bottom) state |= CELL_RANGE_EDGE_BOTTOM;
    if (edges.left) state |= CELL_RANGE_EDGE_LEFT;
    if (edges.right) state |= CELL_RANGE_EDGE_RIGHT;
    if (cell.getIsFocused()) state |= CELL_RANGE_FOCUSED;
    const presentation = {
      rowMemoKey: item.rangeMemoKey,
      state,
      classes: RANGE_CLASS_CACHE[state]!,
    };
    cellRangePresentationCache.set(cell, presentation);
    return presentation;
  };

  const getRangeClasses = (cell: Cell<TableFeatures, TData>, item: RenderItem<TData>) =>
    getCellRangePresentation(cell, item).classes;

  /**
   * 生成某一行的框选渲染键。
   *
   * 框选拖动时仅起止边界行、新进入/离开的行需要失效；范围外行返回同一个空键，
   * 避免把完整 range 对象放进 `v-memo` 后导致每帧所有可见行都重建单元格子树。
   */
  const getRowRangeMemoKey = (rowIndex: number, rowId?: string): string => {
    // 未启用框选时不读取 currentRange，避免首次渲染触发 TanStack 范围派生计算。
    if (getCellRangeMode() === undefined) return '';
    const range = getCellRange();
    if (!range) return '';
    const minRow = Math.min(range.startRow, range.endRow);
    const maxRow = Math.max(range.startRow, range.endRow);
    if (rowIndex < minRow || rowIndex > maxRow) return '';
    const minCol = Math.min(range.startCol, range.endCol);
    const maxCol = Math.max(range.startCol, range.endCol);
    const focused = getFocusedCell();
    // 焦点移动但矩形边界不变时，只让旧/新焦点所在行的 memo 失效，保留大选区的渲染收益。
    const focusedColumn = focused && focused.rowId === rowId ? focused.columnId : '';
    return `${minCol}:${maxCol}:${rowIndex === minRow ? 1 : 0}:${rowIndex === maxRow ? 1 : 0}:${focusedColumn}`;
  };

  return { getRangeClasses, getRowRangeMemoKey };
};
