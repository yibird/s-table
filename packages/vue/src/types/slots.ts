import type { VNodeChild } from 'vue';
import type { RowData } from '@tanstack/table-core';
import type { STableRowKey } from '@zchengfeng/s-table-core';
import type {
  STableColumn,
  STableFooterContext,
  STableGroupRowSlotContext,
  STableTitleContext,
} from './features';

// 表格插槽
export interface STableContextMenuSlotContext<TData extends RowData = RowData> {
  /** 右键点击的行原始数据。 */
  row: TData;
  /** 当前可见行中的索引。 */
  rowIndex: number;
  /** 关闭菜单。 */
  close: () => void;
}

export interface STableCellEditorSlotContext<TData extends RowData = RowData> {
  record: TData;
  rowKey: STableRowKey;
  rowIndex: number;
  column: STableColumn<TData>;
  columnId: string;
  value: unknown;
  setValue: (value: unknown) => void;
  commit: () => Promise<boolean>;
  cancel: () => void;
}

export interface STableFilterPanelSlotContext<TData extends RowData = RowData> {
  column: STableColumn<TData>;
  columnId: string;
  selectedKeys: (string | number | boolean)[];
  setSelectedKeys: (values: (string | number | boolean)[]) => void;
  confirm: () => void;
  reset: () => void;
  close: () => void;
}

export interface STableSlots<TData extends RowData = RowData> {
  /**
   * @desc 表格标题。参数为 `{ currentPageData }`。
   */
  title?: (scope: STableTitleContext<TData>) => VNodeChild;
  /**
   * @desc 表格页脚。参数为当前页数据与分页信息。
   */
  footer?: (scope: STableFooterContext<TData>) => VNodeChild;
  /**
   * @desc 表格汇总行（渲染为 tfoot，位于 body 之后、footer 之前）。
   */
  summary?: () => VNodeChild;
  /**
   * @desc 上下文菜单（右键菜单）。
   */
  contextMenu?: (scope: STableContextMenuSlotContext<TData>) => VNodeChild;
  /**
   * @desc 表格空状态。
   */
  empty?: () => VNodeChild;
  /**
   * @desc 空状态操作区（渲染在默认空状态描述之后，如"新增数据"按钮）。
   */
  emptyAction?: () => VNodeChild;
  /**
   * @desc 表格加载状态。
   */
  loading?: () => VNodeChild;
  /**
   * @desc 展开行内容。参数为 `{ record, index, expanded }`。
   */
  expandedRowRender?: (scope: { record: TData; index: number; expanded: boolean }) => VNodeChild;
  /**
   * @desc 滚动触底时显示的内容（如加载指示器）。
   */
  scrollToBottom?: () => VNodeChild;
  /**
   * @desc 行拖拽句柄内容（替换默认拖拽图标）。
   */
  rowDragHandle?: (scope: { record: TData; index: number }) => VNodeChild;
  /** 自定义单元格编辑器。 */
  cellEditor?: (scope: STableCellEditorSlotContext<TData>) => VNodeChild;
  /** 自定义列过滤面板。 */
  filterPanel?: (scope: STableFilterPanelSlotContext<TData>) => VNodeChild;
  /** 自定义整行分组内容。 */
  groupRow?: (scope: STableGroupRowSlotContext<TData>) => VNodeChild;
}
