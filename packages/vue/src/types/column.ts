import type { VNodeChild } from 'vue';
import type {
  ColumnDef_CellSpanning,
  DeepKeys,
  RowData,
  TableFeatures,
} from '@tanstack/table-core';
import type { STableCellProps } from './interaction';
import type {
  STableColumnAlign,
  STableColumnFixed,
  STableFilterMode,
  STableFilterOption,
  STableSortOrder,
} from './config';

/**
 * 稳定的、与 TanStack 解耦的公开列 API。
 *
 * 设计目标：
 * - 公开的 `STableColumn` 不再 `extends` TanStack `ColumnDef`，避免上游类型变化
 *   直接成为破坏性 API 变更、以及复杂联合类型泄漏给用户。
 * - 只暴露我们真正支持的字段；渲染回调的上下文用「我们自己的稳定形状」描述，
 *   而非 TanStack 的 `CellContext` / `HeaderContext` 全量类型。
 * - 内部通过 `normalizeColumn`（见 useColumns.ts）这一「唯一适配边界」把
 *   `STableColumn` 转成 TanStack `ColumnDef`；TanStack 忽略未知字段，运行时行为不变。
 */

// TypeScript 缺少存在类型，异构列数组无法同时保留每列不同的 TValue；any 仅允许出现在此聚合边界。
export type STableAnyValueColumn<TData extends RowData> = STableColumn<TData, any>;

/**
 * 列元数据。内置字段有明确类型；业务方可声明合并扩展：
 *
 * ```ts
 * declare module '@zchengfeng/s-table-vue' {
 *   interface STableColumnMeta {
 *     tooltip?: string;
 *   }
 * }
 * ```
 *
 * 同时作为 TanStack `features.columnMeta` 的类型槽，使 `columnDef.meta` 与公开 API 一致。
 */
export interface STableColumnMeta {
  /** 列对齐；内置选择/序号/拖拽列会写入，表头与单元格可读取。 */
  align?: STableColumnAlign;
}

export type STableColumnBaseAlign = {
  align?: STableColumnAlign;
  meta?: STableColumnMeta;
};

// ==================== 渲染上下文（稳定形状，仅暴露必要字段）====================

/** 公开渲染上下文中的行模型，不泄露 TanStack 的完整 Row 类型。 */
export interface STableRowRenderModel<TData extends RowData> {
  id: string;
  /** 原始 dataSource 中的索引；排序和过滤不会改变它。 */
  index: number;
  original: TData;
  /** 动态列 ID 无法证明值类型；精确类型由当前 Cell context 的 getValue() 提供。 */
  getValue: (columnId: string) => unknown;
  getIsSelected: () => boolean;
  getIsExpanded: () => boolean;
}

/** 公开渲染上下文中的列模型。 */
export interface STableColumnRenderModel<TData extends RowData> {
  id: string;
  depth: number;
  // 列集合天然包含不同 TValue；columnDef 是配置查询入口，精确值类型由 getValue 保留。
  columnDef: Readonly<STableAnyValueColumn<TData>>;
  getSize: () => number;
  getIsVisible: () => boolean;
}

/** 公开渲染上下文中的单元格模型。 */
export interface STableCellRenderModel<TData extends RowData, TValue = unknown> {
  id: string;
  row: STableRowRenderModel<TData>;
  column: STableColumnRenderModel<TData>;
  getValue: () => TValue;
  renderValue: () => TValue | null;
  /** 当前单元格是否允许进入范围选择。 */
  getCanSelect: () => boolean;
  /** 当前单元格是否是最近选择范围的焦点。 */
  getIsFocused: () => boolean;
  /** 当前单元格是否位于最终选择范围内。 */
  getIsSelected: () => boolean;
  /** 当前单元格位于最终选择范围的哪些边缘。 */
  getSelectionEdges: () => {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
  };
}

/** 公开渲染上下文中的表头模型。 */
export interface STableHeaderRenderModel<TData extends RowData> {
  id: string;
  index: number;
  depth: number;
  column: STableColumnRenderModel<TData>;
  isPlaceholder: boolean;
  colSpan: number;
  rowSpan: number;
}

/** 公开渲染上下文中的表格模型，仅保留常用只读查询。 */
export interface STableRenderModel<TData extends RowData> {
  getRowModel: () => { rows: STableRowRenderModel<TData>[] };
  getColumn: (columnId: string) => STableColumnRenderModel<TData> | undefined;
  getAllLeafColumns: () => STableColumnRenderModel<TData>[];
}

/**
 * 单元格渲染上下文。是 TanStack `CellContext` 的稳定子集——只暴露我们承诺长期支持的字段。
 * 运行时对象实际是 TanStack 的完整 context（字段更多），此处收窄以隔离上游细节。
 *
 * @template TData 行数据类型。
 * @template TValue 该列的值类型。
 */
export interface STableCellRenderContext<TData extends RowData, TValue = unknown> {
  /** 当前行模型（`row.original` 为原始数据，`row.index` 为原始数据索引）。 */
  row: STableRowRenderModel<TData>;
  /** 当前单元格模型。 */
  cell: STableCellRenderModel<TData, TValue>;
  /** 当前列模型。 */
  column: STableColumnRenderModel<TData>;
  /** 表格实例。 */
  table: STableRenderModel<TData>;
  /** 取当前单元格的值。 */
  getValue: () => TValue;
  /** 取渲染用的值；空值时与 TanStack 运行时一致返回 null。 */
  renderValue: () => TValue | null;
}

/**
 * 表头渲染上下文。TanStack `HeaderContext` 的稳定子集。
 *
 * @template TData 行数据类型。
 * @template TValue 该列的值类型。
 */
export interface STableHeaderRenderContext<TData extends RowData> {
  /** 当前表头模型。 */
  header: STableHeaderRenderModel<TData>;
  /** 当前列模型。 */
  column: STableColumnRenderModel<TData>;
  /** 表格实例。 */
  table: STableRenderModel<TData>;
}

type STableRenderCallback<TContext> = {
  bivarianceHack(context: TContext): VNodeChild;
}['bivarianceHack'];

/** 单元格渲染器：静态节点或基于上下文的渲染函数。 */
export type STableCellRender<TData extends RowData, TValue = unknown> =
  | VNodeChild
  | STableRenderCallback<STableCellRenderContext<TData, TValue>>;

/** 表头渲染器：静态节点或基于上下文的渲染函数。 */
export type STableHeaderRender<TData extends RowData> =
  | VNodeChild
  | STableRenderCallback<STableHeaderRenderContext<TData>>;

// ==================== 列定义 ====================

export type StringKeyOf<TData> = Extract<keyof TData, string>;

/**
 * 直接属性名或以真实顶层属性开头的嵌套路径。
 * 绑定具体 TData 后复用 TanStack DeepKeys，拦截不存在的嵌套路径；未绑定具体 TData 时回退为 string。
 */
export type STableAccessorKey<TData extends RowData> = [StringKeyOf<TData>] extends [never]
  ? string
  : Extract<DeepKeys<TData>, string>;

/**
 * 所有列形状共享的产品配置。取值方式与分组关系由下方互斥联合表达。
 *
 * @template TData 行数据类型。
 * @template TValue 该列的值类型。
 */
interface STableColumnBase<TData extends RowData = RowData, TValue = unknown> {
  /**
   * @description 列唯一标识。带 `accessorKey` 时可省略（回退为 accessorKey）；
   * 分组列 / 自定义渲染列建议显式设置。
   */
  id?: string;
  /**
   * @description 表头渲染。支持字符串、VNode 或 `(ctx) => VNodeChild`。
   */
  header?: STableHeaderRender<TData>;
  /**
   * @description 表尾（summary/footer 单元格）渲染。
   */
  footer?: STableHeaderRender<TData>;
  /**
   * @description 列元数据（透传给 TanStack `columnDef.meta`；内置列用于携带 align 等）。
   * 可通过模块声明合并扩展字段，见 {@link STableColumnMeta}。
   */
  meta?: STableColumnMeta;
  /**
   * @description 子列集合。存在时该列作为分组表头，不承载数据取值。
   */
  columns?: STableAnyValueColumn<TData>[];
  /**
   * @description 取值属性名（`keyof TData`）。与 `accessorFn` 二选一。
   */
  accessorKey?: STableAccessorKey<TData>;
  /**
   * @description Ant Design 风格取值别名，等价于 `accessorKey`；同时提供时 `accessorKey` 优先。
   */
  dataIndex?: STableAccessorKey<TData>;
  /**
   * @description 自定义取值函数。与 `accessorKey` 二选一。
   */
  accessorFn?: (record: TData, index: number) => TValue;
  /**
   * @description 单元格渲染。支持字符串、VNode 或 `(ctx) => VNodeChild`。
   */
  cell?: STableCellRender<TData, TValue>;
  /**
   * @description 列宽度（px）。
   */
  width?: number;
  /**
   * @description 列最小宽度（px）。
   */
  minWidth?: number;
  /**
   * @description 列最大宽度（px）。
   */
  maxWidth?: number;
  /**
   * @description 列对齐方式。
   * @default 'left'
   */
  align?: STableColumnAlign;
  /**
   * @description 列固定位置。
   */
  fixed?: STableColumnFixed;
  /**
   * @description 是否可拖动排序。
   * @default false
   */
  draggable?: boolean;
  /**
   * @description 是否允许调整列宽。
   * @default false
   */
  resizable?: boolean;
  /**
   * @description 是否隐藏列。
   * @default false
   */
  hidden?: boolean;
  /**
   * @description 排序：`true` 使用默认比较；函数自定义排序规则。
   */
  sorter?: boolean | ((a: TData, b: TData) => number);
  /**
   * @description 允许的排序方向。
   * @default ['ascend', 'descend']
   */
  sortDirections?: STableSortOrder[];
  /**
   * @description 默认排序方向。
   */
  defaultSortOrder?: STableSortOrder;
  /** 受控排序方向；由父层改变列定义驱动，`null` 表示受控但无排序。 */
  sortOrder?: STableSortOrder | null;
  /**
   * @description 过滤器选项列表。配置后表头显示过滤图标。
   */
  filters?: STableFilterOption[];
  /**
   * @description 过滤函数，判断每行是否匹配过滤值。
   */
  onFilter?: (value: string | number | boolean, record: TData) => boolean;
  /**
   * @description 过滤模式。
   * @default 'checkbox'
   */
  filterMode?: STableFilterMode;
  /**
   * @description 过滤是否支持多选。
   * @default true
   */
  filterMultiple?: boolean;
  /**
   * @description 默认选中的过滤值集合。
   */
  defaultFilteredValues?: (string | number | boolean)[];
  /** 受控筛选值集合。 */
  filteredValue?: (string | number | boolean)[];
  /**
   * @description 列搜索：`true` 使用默认文本包含匹配；函数自定义匹配规则。
   * @default false
   */
  search?: boolean | ((value: string, record: TData) => boolean);
  /** 是否允许编辑当前列；函数可按行控制。 */
  editable?: boolean | ((record: TData, rowIndex: number) => boolean);
  /** 覆盖表格级编辑触发方式。`manual` 表示仅允许通过实例方法打开。 */
  editableTrigger?: 'click' | 'dblclick' | 'manual';
  /** 内置编辑器类型；复杂编辑器使用 `cellEditor` 插槽。 */
  editor?: 'text' | 'number' | 'checkbox';
  /** 编辑值进入草稿前的解析器，可用于 trim、日期解析和业务类型转换。 */
  valueParser?: (value: unknown, record: TData, rowIndex: number) => TValue;
  /** accessorFn 或特殊数据结构的不可变写回函数。 */
  valueSetter?: (record: TData, value: TValue) => TData;
  /**
   * @description 使用 TanStack cellSpanningFeature 合并相邻等值行，或提供自定义相邻判定。
   */
  spanRows?: ColumnDef_CellSpanning<TableFeatures, TData, TValue>['spanRows'];
  /**
   * @description 使用 TanStack cellSpanningFeature 声明当前行的跨列数量。
   */
  spanColumns?: ColumnDef_CellSpanning<TableFeatures, TData, TValue>['spanColumns'];
  /**
   * @description 设置单元格属性用于合并（colSpan / rowSpan）。
   * 返回 `{ rowSpan: 0 }` 或 `{ colSpan: 0 }` 可隐藏该单元格。
   */
  onCell?: (record: TData, rowIndex: number) => STableCellProps;
  /**
   * @description 是否允许该列参与行分组（`groupBy`）。
   * @default false
   */
  groupable?: boolean;
  /**
   * @description 自定义分组值。缺省时使用该列 accessor 取到的值。
   */
  getGroupingValue?: (record: TData) => unknown;
  /**
   * @description 分组行上该列的聚合方式：内置聚合名或自定义函数
   * `(values, records) => unknown`。未配置时分组行该列显示为空。
   */
  aggregation?: STableAggregation<TData, TValue>;
  /**
   * @description 分组行上聚合值的自定义渲染；缺省时直接渲染聚合结果文本。
   */
  aggregatedCell?: STableCellRender<TData, unknown>;
}

/** 内置聚合函数名（由 TanStack rowAggregationFeature 提供实现）。 */
export type STableBuiltInAggregation =
  | 'sum'
  | 'min'
  | 'max'
  | 'extent'
  | 'mean'
  | 'median'
  | 'unique'
  | 'uniqueCount'
  | 'count'
  | 'first'
  | 'last';

/** 自定义聚合：入参为该分组内全部叶子行的列值与原始记录。 */
export type STableAggregationFn<TData extends RowData, TValue = unknown> = (
  values: TValue[],
  records: TData[]
) => unknown;

/** 列聚合配置。 */
export type STableAggregation<TData extends RowData, TValue = unknown> =
  | STableBuiltInAggregation
  | STableAggregationFn<TData, TValue>;

export type STableColumnCommon<TData extends RowData, TValue> = Omit<
  STableColumnBase<TData, TValue>,
  'id' | 'columns' | 'accessorKey' | 'accessorFn'
>;

/** 通过数据路径取值的列；ID 默认由 accessorKey 推导。 */
export type STableAccessorKeyColumn<TData extends RowData, TValue = unknown> = STableColumnCommon<
  TData,
  TValue
> & {
  id?: string;
  accessorKey: STableAccessorKey<TData>;
  accessorFn?: never;
  columns?: never;
};

/** Ant Design 风格 `dataIndex` 取值的列；语义等同 `accessorKey`，ID 默认由 dataIndex 推导。 */
export type STableDataIndexColumn<TData extends RowData, TValue = unknown> = STableColumnCommon<
  TData,
  TValue
> & {
  id?: string;
  dataIndex: STableAccessorKey<TData>;
  accessorKey?: never;
  accessorFn?: never;
  columns?: never;
};

/** 通过函数取值的列；函数无法稳定推导 ID，因此 id 必填。 */
export type STableAccessorFnColumn<TData extends RowData, TValue = unknown> = STableColumnCommon<
  TData,
  TValue
> & {
  id: string;
  accessorKey?: never;
  accessorFn: (record: TData, index: number) => TValue;
  columns?: never;
};

/** 无数据取值的展示列，例如操作列和内置选择列。 */
export type STableDisplayColumn<TData extends RowData, TValue = unknown> = STableColumnCommon<
  TData,
  TValue
> & {
  id: string;
  accessorKey?: never;
  accessorFn?: never;
  columns?: never;
};

/** 分组列只描述子列树，不参与数据取值。 */
export type STableGroupColumn<TData extends RowData, TValue = unknown> = STableColumnCommon<
  TData,
  TValue
> & {
  id: string;
  accessorKey?: never;
  accessorFn?: never;
  columns: STableAnyValueColumn<TData>[];
};

/** 公共列定义：非法的 accessor/display/group 组合会在编译期被拒绝。 */
export type STableColumn<TData extends RowData = RowData, TValue = unknown> =
  | STableAccessorKeyColumn<TData, TValue>
  | STableDataIndexColumn<TData, TValue>
  | STableAccessorFnColumn<TData, TValue>
  | STableDisplayColumn<TData, TValue>
  | STableGroupColumn<TData, TValue>;

/** 异构列集合：单列保留 TValue，只有数组聚合边界擦除不同列之间的值类型。 */
export type STableColumns<TData extends RowData = RowData> = STableAnyValueColumn<TData>[];

/**
 * 叶子（数据）列：`STableColumn` 中排除 `columns` 分组字段。供 helper 精确标注。
 * @template TData 行数据类型。
 * @template TValue 该列的值类型。
 */
export type STableAccessorColumn<TData extends RowData, TValue = unknown> =
  | STableAccessorKeyColumn<TData, TValue>
  | STableDataIndexColumn<TData, TValue>
  | STableAccessorFnColumn<TData, TValue>;
