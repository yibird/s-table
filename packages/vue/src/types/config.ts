import type { RowData } from '@tanstack/table-core';
import type { STableColumn } from './column';
import type { PaginationProps, STablePaginationItemRender } from '../ui/pagination';
import type { STableRowKey } from '@zchengfeng/s-table-core';

/**
 * Table 分页扩展属性（在基础 PaginationProps 上增加 Table 专用字段）。
 */
export interface STablePaginationProps extends PaginationProps {
  /**
   * @description 默认当前页码（非受控模式）。
   * @default 1
   */
  defaultCurrent?: number;
  /**
   * @description 默认每页条数（非受控模式）。
   * @default 10
   */
  defaultPageSize?: number;
  /**
   * @description 总页数（服务端分页场景）。设置后优先级高于由 `total / pageSize` 推算的页数，
   * 用于后端只返回当前页数据、无法给出精确 total 但已知总页数时。
   */
  pageCount?: number;
  /**
   * @description 页码或每页条数变化时的回调。
   */
  onChange?: (page: number, pageSize: number) => void;
  /** 简洁模式：仅上一页/下一页与当前页信息。 */
  simple?: boolean;
  /** 页码窗口更小时只显示当前页附近的少量页码。 */
  showLessItems?: boolean;
  /** 只有一页时隐藏整个分页器。 */
  hideOnSinglePage?: boolean;
  /** 自定义分页条目渲染。 */
  itemRender?: STablePaginationItemRender;
}

// 表格大小
export type STableSize = 'small' | 'middle' | 'large';

// 表格列对齐方式
export type STableColumnAlign = 'left' | 'center' | 'right';
// 表格列固定位置
export type STableColumnFixed = 'left' | 'right';
// 表格选择类型
export type { STableSelectionType } from '@zchengfeng/s-table-core';

// 排序方向
export type STableSortOrder = 'ascend' | 'descend';

// 排序状态
export interface STableSortItem {
  columnId: string;
  order: STableSortOrder;
}

// 过滤器选项
export interface STableFilterOption {
  /** 过滤器选项的显示文本。 */
  text: string;
  /** 过滤器选项的值。 */
  value: string | number | boolean;
  /** 子过滤器选项（级联场景）。 */
  children?: STableFilterOption[];
}

// 过滤器模式
export type STableFilterMode = 'checkbox' | 'menu' | 'custom';
export type STableFilterValue = string | number | boolean;

/**
 * 内部桥接到 TanStack 的单列复合过滤值；筛选项与搜索词共享一次 filterFn。
 * 定义属于 core 列管线，这里只做公开面再导出。
 */
export type { STableColumnFilterValue } from '@zchengfeng/s-table-core';
// 表格行键值
/** 公开的行固定状态，以业务 rowKey 表达。 */
export type {
  STablePinnedRowKeys,
  STableRowKey,
  STableRowKeyField,
  STableSelectionIntent,
  STableTree,
} from '@zchengfeng/s-table-core';

/** 分组行的 `groupRow` 插槽作用域。 */
export interface STableGroupRowSlotContext<TData extends RowData = RowData> {
  /** 分组行 id（可传给实例方法 `toggleGroup`）。 */
  groupRowId: string;
  /** 产生该分组的列 id。 */
  columnId: string;
  /** 产生该分组的公开列定义。 */
  column: STableColumn<TData> | undefined;
  /** 分组值。 */
  groupValue: unknown;
  /** 该分组内叶子数据行数量。 */
  count: number;
  /** 分组层级（从 0 开始）。 */
  depth: number;
  /** 当前是否展开。 */
  expanded: boolean;
  /** 切换展开 / 折叠。 */
  toggle: () => void;
}

// 列宽调整模式
export type STableColumnResizeMode = 'onChange' | 'onEnd';

export type PaginationPlacement =
  | 'topStart'
  | 'topCenter'
  | 'topEnd'
  | 'bottomStart'
  | 'bottomCenter'
  | 'bottomEnd';

// 列宽调整事件
export interface STableColumnResizeEvent<TData extends RowData = RowData> {
  columnId: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  column?: STableColumn<TData>;
}

// 虚拟滚动配置
export interface STableVirtualProps<TData extends RowData = RowData> {
  /** 是否启用纵向行虚拟化。 */
  y?: boolean;
  /** 是否启用横向列虚拟化。固定在左右两侧的列始终渲染。 */
  x?: boolean;
  /**
   * @description 预估行高（px）。默认 47（middle 尺寸）。
   * 仅用于「动态行高」模式下的初始估算；实际高度由 ResizeObserver 测量校正。
   * @default 47
   */
  estimateSize?: number;
  /**
   * @description 固定行高（px）。**大数据量（如 50w 行）强烈建议设置。**
   *
   * 设置后进入「固定行高」快路径：跳过每行的 ResizeObserver 动态测量，
   * 直接用该值作为精确行高。收益：
   * - 消除滚动时逐行测量导致的 layout 抖动，是 50w 行流畅滚动、减少白屏的关键；
   * - 占位高度（spacer）计算精确，滚动条不漂移、不跳动。
   *
   * 注意：要求所有主行等高。若行内容会换行 / 高度不一，请勿设置（改用 estimateSize）。
   * 存在展开行时，被展开的「逻辑行块」仍会按需测量以容纳展开内容。
   *
   * 也支持函数形式 `(record, index) => number | undefined`：返回值作为该行的
   * 初始估算；行高仍会按需测量校正，不会进入固定行高快路径。
   */
  rowHeight?: number | ((record: TData, index: number) => number | undefined);
  /**
   * @description 可视区域外额外渲染的行数（上下各 N 行）。
   * 值越大，快速滚动时越不容易出现白屏，但初始渲染的 DOM 节点越多。
   * 固定行高模式下渲染成本低，可适当调大（如 20~30）以进一步减少快速滚动白屏。
   * @default 15
   */
  overscan?: number;
  /**
   * @description 滚动触底阈值（px）。当滚动容器底部距离可视区域小于该值时触发 `scrollToBottom` 事件。
   * 设置为 `0` 表示只有完全滚动到底部才触发。
   * @default 50
   */
  scrollToBottomOffset?: number;
  /** 横向视口外额外渲染的中心列数。 */
  columnOverscan?: number;
  /**
   * @description 统一 buffer 配置；优先于 `overscan` / `columnOverscan`。
   * 数字同时作用于横纵方向，对象可分别配置。
   */
  buffer?: number | { x?: number; y?: number };
  /** 未显式设置列宽时使用的预估宽度（px）。 */
  columnEstimateSize?: number;
}

/** 树形数据配置。树节点与详情展开共用 `expandedRowKeys` 状态。 */
/** 表格编辑模式。 */
export type STableEditMode = 'cell' | 'row';

/** 受控编辑状态；`values` 是当前尚未提交的草稿。 */
export interface STableEditingState {
  mode: STableEditMode;
  rowKey: STableRowKey;
  columnId?: string;
  values: Record<string, unknown>;
}

export interface STableEditPatch<TData extends RowData = RowData> {
  rowKey: STableRowKey;
  values: Readonly<Record<string, unknown>>;
  previousRecord: TData;
  nextRecord: TData;
  revision: number;
}

/** 编辑行为配置。 */
export interface STableEditConfig<TData extends RowData = RowData> {
  /** 单元格或整行编辑。 */
  mode?: STableEditMode;
  /** 进入编辑的交互；`manual` 仅允许通过实例方法进入。 */
  trigger?: 'click' | 'dblclick' | 'manual';
  /** 编辑器失焦时是否提交。行编辑建议使用显式提交。 */
  commitOnBlur?: boolean;
  /**
   * `dataSource` 保持兼容的不可变数组提交；`patch` 仅派发 `editPatch`，适合远端/行级 store。
   * @default 'dataSource'
   */
  updateMode?: 'dataSource' | 'patch';
  /** 按行禁用编辑。 */
  getRowEditable?: (record: TData, rowIndex: number) => boolean;
  /** 提交前校验；返回字符串时作为失败原因。 */
  validate?: (
    values: Readonly<Record<string, unknown>>,
    record: TData,
    rowIndex: number
  ) => boolean | string | Promise<boolean | string>;
}

/** 行事件载荷。 */
export interface STableRowEvent<TData extends RowData = RowData, TEvent extends Event = Event> {
  record: TData;
  rowKey: STableRowKey;
  rowIndex: number;
  event: TEvent;
}

/** 单元格事件载荷。 */
export interface STableCellEvent<
  TData extends RowData = RowData,
  TEvent extends Event = Event,
> extends STableRowEvent<TData, TEvent> {
  columnId: string;
  columnIndex: number;
  value: unknown;
}
