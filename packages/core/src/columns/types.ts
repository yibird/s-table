import type { RowData } from '@tanstack/table-core';

/**
 * 框架无关的列语义契约。
 *
 * 适配层（Vue / React / ...）的公开列类型在结构上满足该接口即可复用 core 的列管线。
 * 渲染字段（header / cell / footer / aggregatedCell）与业务回调用 `unknown` 表达：
 * core 不消费它们的形状，只把它们当作缓存失效 token 透传。
 */
export interface STableColumnLike<TData extends RowData = RowData, TValue = unknown> {
  /** 列唯一标识；带 accessorKey 时可省略。 */
  id?: string;
  /** 取值属性名（支持 `user.name` 嵌套路径）。 */
  accessorKey?: string;
  /** Ant Design 风格取值别名；`accessorKey` 与 `dataIndex` 同时提供时以 `accessorKey` 为准。 */
  dataIndex?: string;
  /** 自定义取值函数。 */
  accessorFn?: (record: TData, index: number) => TValue;
  /** 子列集合；存在时作为分组表头。 */
  columns?: readonly STableColumnLike<TData, TValue>[];
  /** 表头渲染；对 core 不透明。 */
  header?: unknown;
  /** 表尾渲染；对 core 不透明。 */
  footer?: unknown;
  /** 单元格渲染；对 core 不透明。 */
  cell?: unknown;
  /** 分组行聚合值渲染；对 core 不透明。 */
  aggregatedCell?: unknown;
  /** 列元数据；对 core 不透明，仅参与 token。 */
  meta?: unknown;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  /** 内部注入列兼容的 TanStack 尺寸字段。 */
  size?: number;
  minSize?: number;
  maxSize?: number;
  align?: string;
  fixed?: 'left' | 'right';
  draggable?: boolean;
  resizable?: boolean;
  hidden?: boolean;
  sorter?: boolean | ((a: TData, b: TData) => number);
  sortDirections?: readonly string[];
  defaultSortOrder?: string | null;
  sortOrder?: string | null;
  filters?: readonly unknown[];
  onFilter?: (value: string | number | boolean, record: TData) => boolean;
  filterMode?: string;
  filterMultiple?: boolean;
  defaultFilteredValues?: readonly (string | number | boolean)[];
  filteredValue?: readonly (string | number | boolean)[];
  search?: boolean | ((value: string, record: TData) => boolean);
  editable?: boolean | ((record: TData, rowIndex: number) => boolean);
  editableTrigger?: string;
  editor?: string;
  /** 草稿解析器；对 core 不透明。 */
  valueParser?: unknown;
  /** 不可变写回函数；对 core 不透明。 */
  valueSetter?: unknown;
  /** 行合并策略；对 core 不透明，存在即启用 cellSpanning。 */
  spanRows?: unknown;
  /** 列合并策略；对 core 不透明，存在即启用 cellSpanning。 */
  spanColumns?: unknown;
  /** 单元格属性；对 core 不透明。 */
  onCell?: unknown;
  groupable?: boolean;
  getGroupingValue?: (record: TData) => unknown;
  aggregation?: unknown;
}

/**
 * 列归一化产出的渲染层元数据。
 *
 * 一次列树遍历同时生成 TanStack ColumnDef 与该元数据，供适配层直接消费，
 * 避免排序、筛选、渲染各自重复遍历列树。
 */
export interface STableColumnNormalizeMetadata<
  TData extends RowData = RowData,
  TValue = unknown,
  TColumn extends STableColumnLike<TData, TValue> = STableColumnLike<TData, TValue>,
> {
  /** 解析后的列 ID → 原始公开列定义。 */
  columnMap: ReadonlyMap<string, TColumn>;
  /** 无外部索引时的自有 Map（归一化期间写入）。 */
  mutableColumnMap?: Map<string, TColumn>;
  /** 固定列状态（left/right 叶子列 ID）。 */
  columnPinning: { start: string[]; end: string[] };
  /** 隐藏列 id → false。 */
  columnVisibility: Record<string, boolean>;
  /** 显式设宽列宽度总和，作为表格 min-width。 */
  explicitMinWidth: number;
  /** 显式设宽的列 ID 集合。 */
  explicitWidthIds: Set<string>;
  /** 列渲染 token：公开列配置逐列快照。 */
  cellRenderToken: Map<string, readonly unknown[]>;
  /** 影响 Row 值缓存 / 排序 / 过滤的稳定列依赖 token。 */
  rowModelDependencyToken: unknown[];
  /** 是否存在单元格合并配置。 */
  hasCellSpanning: boolean;
}
