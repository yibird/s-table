import type { RowData } from '@tanstack/table-core';
import type { STableColumn, STableColumns } from './column';
import type { VNodeChild } from 'vue';
import type { STableRowKey } from '@zchengfeng/s-table-core';
import type { STableColumnAlign } from './config';

export type STableDropPosition = 'before' | 'after' | 'inside';

/** 行拖拽开关：布尔值、按行判定函数或完整配置。 */
export type STableRowDrag<TData extends RowData = RowData> =
  | boolean
  | ((context: STableRowDragStartContext<TData>) => boolean)
  | STableRowDragConfig<TData>;

/** 高级行拖拽配置。 */
export interface STableRowDragConfig<TData extends RowData = RowData> {
  /**
   * @description 拖拽触发区域：`handle` 仅手柄；`row` 整行可拖（交互控件除外）。
   * @default 'handle'
   */
  trigger?: 'handle' | 'row';
  /** 自定义拖拽预览；返回 VNode 或已有 HTMLElement。 */
  ghost?: (context: STableRowDragStartContext<TData>) => VNodeChild | HTMLElement | null;
  /** 是否启用行位置变化的 FLIP 动画。 */
  animation?: boolean;
  /** 拖动已选中行时，将所有选中行作为一个有序块移动。 */
  multiple?: boolean;
  /** 是否允许树节点投放到另一个节点内部。 */
  allowTreeReparent?: boolean;
  /**
   * 拖拽开始前的同步判定；返回 false 阻止本次拖拽。
   * @default undefined（不限制）
   */
  canDrag?: (context: STableRowDragStartContext<TData>) => boolean;
  /** Drop 前同步或异步拦截。 */
  beforeDrop?: (payload: STableRowOrderChangeEvent<TData>) => boolean | Promise<boolean>;
}

/** 行拖拽开始前的判定上下文。 */
export interface STableRowDragStartContext<TData extends RowData = RowData> {
  /** 被拖拽的行数据。 */
  record: TData;
  /** 行在当前可见行模型中的索引。 */
  index: number;
}

/** 高级列拖拽配置。 */
export interface STableColumnDragConfig<TData extends RowData = RowData> {
  /** 是否启用列位置变化的 FLIP 动画。 */
  animation?: boolean;
  /** 自定义列拖拽预览；返回 VNode 或已有 HTMLElement。 */
  ghost?: (context: STableColumnDragStartContext<TData>) => VNodeChild | HTMLElement | null;
  /**
   * 拖拽开始前的同步判定；返回 false 阻止本次拖拽。
   * @default undefined（不限制）
   */
  canDrag?: (context: STableColumnDragStartContext<TData>) => boolean;
  /** Drop 前同步或异步拦截。 */
  beforeDrop?: (payload: STableColumnOrderChangeEvent<TData>) => boolean | Promise<boolean>;
}

/** 列拖拽开始前的判定上下文。 */
export interface STableColumnDragStartContext<TData extends RowData = RowData> {
  /** 被拖拽的列定义。 */
  column: STableColumn<TData>;
  /** 被拖拽的列 ID。 */
  columnId: string;
  /** 列在用户列顺序中的索引。 */
  index: number;
}

export interface STableRowOrderChangeEvent<TData extends RowData = RowData> {
  dataSource: TData[];
  fromIndex: number;
  toIndex: number;
  fromIndices: number[];
  rowKeys: STableRowKey[];
  targetRowKey: STableRowKey;
  targetParentKey: STableRowKey | null;
  position: STableDropPosition;
}

export interface STableColumnOrderChangeEvent<TData extends RowData = RowData> {
  columns: STableColumns<TData>;
  columnOrder: string[];
  fromIndex: number;
  toIndex: number;
}

/** 表格标题渲染上下文。 */
export type STableTitleContext<TData extends RowData = RowData> = Pick<
  STableFooterContext<TData>,
  'currentPageData'
>;

/** 表格页脚渲染上下文。 */
export interface STableFooterContext<TData extends RowData = RowData> {
  /** 当前页数据（无分页时为过滤排序后的全部数据）。 */
  currentPageData: TData[];
  currentPage: number;
  pageSize: number;
  total: number;
}

/** 单元格 Tooltip 渲染上下文。 */
export interface STableCellTooltipContext<TData extends RowData = RowData> {
  record: TData;
  rowIndex: number;
  columnId: string;
}

/** 响应式列断点。 */
export type STableBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/** 表头通用菜单渲染上下文。 */
export interface STableHeaderMenuContext<TData extends RowData = RowData> {
  column: STableColumn<TData>;
  columnId: string;
  /** 关闭菜单。 */
  close: () => void;
}

/** 自定义筛选图标渲染上下文。 */
export interface STableFilterIconContext<TData extends RowData = RowData> {
  /** 当前列定义。 */
  column: STableColumn<TData>;
  /** 列 ID。 */
  columnId: string;
  /** 已确认的过滤值。 */
  filteredValues: (string | number | boolean)[];
  /** 当前列是否存在已确认的过滤值。 */
  active: boolean;
}

export interface STableCopyOptions {
  /** 复制活动区间或全部区间。 @default 'active' */
  ranges?: 'active' | 'all';
  delimiter?: string;
  includeHeaders?: boolean;
  writeToClipboard?: boolean;
  /**
   * 是否防止字段被电子表格解释为公式。
   * 开启后，以 `= + - @`、制表符或回车开头的字段会添加单引号前缀。
   * @default true
   */
  preventFormulaInjection?: boolean;
}

/** 单元格范围复制尝试的载荷。 */
export interface STableCellRangeCopyEvent {
  /** 当前框选范围快照。 */
  readonly range: STableCellRange;
  /** 按当前分隔符序列化后的二维文本。 */
  readonly text: string;
  /** 参与复制的可见列 ID，顺序与文本列一致。 */
  readonly columnIds: readonly string[];
  /** 复制来源：键盘快捷键、浏览器原生 copy 事件或实例 API。 */
  readonly source: 'keyboard' | 'clipboard' | 'api';
  /** 用户交互触发复制时对应的原生事件；实例 API 调用时不存在。 */
  readonly nativeEvent?: KeyboardEvent | ClipboardEvent;
}

// 表格展开配置（配置项）。
// 展开状态用顶层 `v-model:expandedRowKeys` 管理（见 STableProps）；此处仅保留「展开列的行为配置」。
export interface STableExpandable<TData extends RowData> {
  /**
   * @description 是否允许多行同时展开。
   * @default true
   */
  multiple?: boolean;
  /**
   * @description 展开列的宽度（px）。
   * @default 40
   */
  columnWidth?: number;
  /**
   * @description 是否固定展开列（兼容别名，优先使用 `expandFixed`）。
   * @default true
   */
  fixed?: boolean;
  /**
   * @description 展开列固定方向；`true` 等价于 `'left'`，`false` 不固定。
   * 优先级高于 `fixed`。
   * @default true
   */
  expandFixed?: boolean | 'left' | 'right';
  /** 自定义展开图标。 */
  expandIcon?: (context: STableExpandIconContext<TData>) => VNodeChild;
  /**
   * @description 展开列在可见业务叶子列中的插入位置；默认保持内置列顺序。
   * @default 0
   */
  expandIconColumnIndex?: number;
  /** 判断指定行是否允许展开。 */
  isRowExpandable?: (record: TData) => boolean;
}

/** 自定义展开图标渲染上下文。 */
export interface STableExpandIconContext<TData extends RowData = RowData> {
  expanded: boolean;
  expandable: boolean;
  record: TData;
  rowIndex: number;
  toggle: () => void;
}

// 表格序号列（配置项）。
// 在表格最左侧（拖拽 / 选择 / 展开列之后）插入一个自增序号列，序号随分页联动。
export interface STableSeq<TData extends RowData = RowData> {
  /**
   * @description 序号列表头标题。
   * @default '序号'
   */
  title?: string;
  /**
   * @description 序号列宽度（px）。
   * @default 60
   */
  columnWidth?: number;
  /**
   * @description 序号列对齐方式。
   * @default 'center'
   */
  align?: STableColumnAlign;
  /**
   * @description 是否固定序号列到左侧。
   * @default true
   */
  fixed?: boolean;
  /**
   * @description 序号起始值。
   * @default 1
   */
  startIndex?: number;
  /**
   * @description 是否随分页联动。为 `true` 时序号跨页连续（第 2 页从上一页末尾续算）；
   * 为 `false` 时每页均从 `startIndex` 重新计数。服务端分页（manualPagination）下，
   * 传入的 `dataSource` 即当前页数据，需开启此项才能得到跨页连续序号。
   * @default true
   */
  paginate?: boolean;
  /**
   * @description 自定义序号单元格渲染。返回值将作为单元格内容。
   * @param index 计算后的序号（已含分页偏移与 startIndex）。
   * @param record 行数据。
   */
  renderCell?: (index: number, record: TData) => VNodeChild;
}

// 单元格框选范围（矩形区域，O(1) 存储）
export interface STableCellRange {
  /** 起始行索引（数据行索引）。 */
  startRow: number;
  /** 起始列索引（visibleLeafColumns 索引）。 */
  startCol: number;
  /** 结束行索引。 */
  endRow: number;
  /** 结束列索引。 */
  endCol: number;
}

// 单元格框选配置
export interface STableCellRangeSelection {
  /**
   * @description 框选模式。
   * - `cell`：Excel 式拖拽框选单元格。
   * - `row`：单击行选中整行范围。
   */
  mode: 'cell' | 'row';
  /** 是否允许 Ctrl/Cmd 多区间选择。 @default true */
  multi?: boolean;
  /**
   * @description 仅 `mode='row'` 时有效。为 `true` 时单击行同时触发 `rowSelection` 选中行。
   * @default false
   */
  selectRowOnClick?: boolean;
}

// 单元格合并属性
export interface STableCellProps {
  /**
   * @description 合并列数，0 表示隐藏该单元格。
   * @default 1
   */
  colSpan?: number;
  /**
   * @description 合并行数，0 表示隐藏该单元格。
   * @default 1
   */
  rowSpan?: number;
}
