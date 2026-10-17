import type { RowData, Table, TableFeatures } from '@tanstack/table-core';
import type {
  STablePinnedRowKeys,
  STableRowKey,
  STableSelectionIntent,
} from '@zchengfeng/s-table-core';
import type {
  STableCellRange,
  STableCopyOptions,
  STableEditingState,
  STableSortItem,
} from './features';

// 表格实例
export interface STableInstance<TData extends RowData = RowData> {
  /**
   * @desc 获取底层 TanStack Table 稳定版实例，供高级能力直接复用官方 API。
   */
  getTanStackTable(): Table<TableFeatures, TData>;
  // ============ 选择方法 ============
  /**
   * @desc 获取当前可解析的选中行。intent `all` 模式只物化当前已加载行（不含 excluded / disabled）。
   */
  getSelectedRows(): TData[];
  /**
   * @desc 获取选中键快照。intent `all` 模式返回空数组，请改用 `getSelectionIntent()`。
   */
  getSelectedRowKeys(): STableRowKey[];
  /** 获取当前选择意图；key 模式返回 include 意图。 */
  getSelectionIntent(): STableSelectionIntent;
  /** 设置选择意图；intent 模式或传入 selectionIntent 后可用。 */
  setSelectionIntent(intent: STableSelectionIntent): void;
  /**
   * @desc 全选
   */
  selectAll(): void;
  /**
   * @desc 清除所有选中行
   */
  clearSelection(): void;
  /**
   * @desc 切换某行选中状态
   */
  toggleRowSelection(row: TData, selected?: boolean): void;

  // ============ 排序/过滤/搜索 ============
  /**
   * @desc 清除排序
   */
  clearSort(): void;
  /** 获取完整有序排序状态。 */
  getSorting(): STableSortItem[];
  /** 设置完整有序排序状态。 */
  setSorting(sorting: STableSortItem[]): void;
  /**
   * @desc 清除筛选
   */
  clearFilter(): void;
  /**
   * @desc 清除搜索
   */
  clearSearch(): void;

  // ============ 编辑方法 ============
  getEditing(): STableEditingState | null;
  startCellEdit(rowKey: STableRowKey, columnId: string): boolean;
  startRowEdit(rowKey: STableRowKey): boolean;
  setEditValue(columnId: string, value: unknown): void;
  commitEdit(): Promise<boolean>;
  cancelEdit(): void;
  /** 复制当前框选范围。监听器拒绝或没有范围时返回空串。 */
  copyCellRange(options?: STableCopyOptions): Promise<string>;

  // ============ 展开方法 ============
  /**
   * @desc 获取当前展开行键值集合
   */
  getExpandedRowKeys(): STableRowKey[];
  /**
   * @desc 切换某行的展开/收起状态
   */
  toggleExpand(rowKey: STableRowKey): void;
  /**
   * @desc 展开指定行
   */
  expandRow(rowKey: STableRowKey): void;
  /**
   * @desc 收起指定行
   */
  collapseRow(rowKey: STableRowKey): void;
  /**
   * @desc 展开所有行
   */
  expandAll(): void;
  /**
   * @desc 收起所有行
   */
  collapseAll(): void;

  // ============ 分组方法 ============
  /** 获取当前分组列 ID 快照。 */
  getGroupBy(): string[];
  /** 设置分组列 ID；数组顺序即分组层级。 */
  setGroupBy(groupBy: string[]): void;
  /** 展开全部分组。 */
  expandAllGroups(): void;
  /** 折叠全部分组。 */
  collapseAllGroups(): void;
  /** 按 TanStack 分组行 ID 切换展开状态。 */
  toggleGroup(groupRowId: string): void;

  // ============ 行固定方法 ============
  /** 固定到顶部/底部，或传 false 取消固定。行不存在时返回 false。 */
  pinRow(rowKey: STableRowKey, position: 'top' | 'bottom' | false): boolean;
  /** 获取当前固定行键值快照。 */
  getPinnedRowKeys(): Required<STablePinnedRowKeys>;

  // ============ 滚动方法 ============
  /**
   * @desc 滚动到某行
   * @returns 找到目标行并发起滚动时返回 true，否则返回 false。
   */
  scrollToRow(rowKey: STableRowKey): boolean;
  /**
   * @desc 滚动到顶部
   */
  scrollToTop(): void;
  /**
   * @desc 滚动到底部
   */
  scrollToBottom(): void;
  /** 横向滚动到指定列；列不存在时返回 false。 */
  scrollToColumn(columnId: string): boolean;
  /** 获取当前滚动位置快照。 */
  getScrollPosition(): { left: number; top: number };
  /** 同时设置横纵滚动位置。 */
  scrollTo(position: { left?: number; top?: number; behavior?: ScrollBehavior }): void;

  // ============ 框选方法 ============
  /**
   * @desc 获取当前框选范围
   */
  getCellRange(): STableCellRange | null;
  /**
   * @desc 清除框选范围
   */
  clearCellRange(): void;
  /** 返回当前框选范围；保留用于兼容选择型表格 API。 */
  getSelectedRange(): STableCellRange | null;
  /** 清除当前框选范围；保留用于兼容选择型表格 API。 */
  clearAllSelectedRange(): void;

  // ============ 列顺序方法 ============
  /**
   * @desc 获取当前用户叶子列 ID 顺序快照。
   * 注入的拖拽、选择、展开和序号列由组件固定管理，不包含在该 API 中。
   */
  getColumnOrder(): string[];
  /**
   * @desc 设置用户叶子列顺序；无效 ID 会被剔除，缺失 ID 按列定义声明顺序补入末尾。
   */
  setColumnOrder(nextOrder: string[]): void;
  /**
   * @desc 重置列顺序为列定义的声明顺序。
   */
  resetColumnOrder(): void;
  /**
   * @desc 按列 ID 交换两列位置；任一 ID 不存在时不做任何操作。
   */
  swapColumns(columnIdA: string, columnIdB: string): void;
  /**
   * @desc 将指定列移动到目标列 ID 的位置。
   */
  moveColumn(columnId: string, targetColumnId: string): void;
  /**
   * @desc 按叶子列索引移动列；越界索引不做任何操作。
   */
  moveColumnByIndex(fromIndex: number, toIndex: number): void;
}
