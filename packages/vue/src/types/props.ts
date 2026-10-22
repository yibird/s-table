import type { CSSProperties, VNodeChild } from 'vue';
import type { RowData } from '@tanstack/table-core';
import type {
  STablePinnedRowKeys,
  STableRowKey,
  STableRowKeyField,
  STableSelectionIntent,
  STableTree,
} from '@zchengfeng/s-table-core';
import type { STableLocaleOverrides } from '../locales';
import type {
  PaginationPlacement,
  STableCellRangeCopyEvent,
  STableCellRangeSelection,
  STableBreakpoint,
  STableClasses,
  STableColumn,
  STableColumnDragConfig,
  STableColumnResizeMode,
  STableColumns,
  STableEditConfig,
  STableEditingState,
  STableExpandable,
  STableFooterContext,
  STablePaginationProps,
  STableRowDrag,
  STableRowSelection,
  STableSeq,
  STableSize,
  STableSortItem,
  STableStyles,
  STableTitleContext,
  STableVirtualProps,
} from './features';

export interface STableProps<TData extends RowData = RowData> {
  /**
   * @description 数据源。
   * @default []
   */
  readonly dataSource?: TData[];
  /**
   * @description 表格列集合
   * @default []
   */
  /** 异构列数组在集合边界擦除 TValue；每个 helper 返回的单列仍保留精确值类型。 */
  columns?: STableColumns<TData>;
  /**
   * @description 行数据的唯一标识，支持字符串（属性名）或函数。
   * @default index
   */
  rowKey?: STableRowKeyField<TData> | ((record: TData) => STableRowKey);
  /**
   * @description 是否展示边框。
   * @default false
   */
  bordered?: boolean;
  /**
   * @description 是否展示斑马纹。
   * @default false
   */
  striped?: boolean;
  /**
   * @description 表格尺寸。
   * @default 'middle'
   */
  size?: STableSize;
  /**
   * @description 是否展示 loading 遮罩。
   * @default false
   */
  loading?: boolean;
  /**
   * @description 是否展示头。
   * @default true
   */
  showHeader?: boolean;
  /**
   * @description 是否固定头。
   * @default true
   */
  fixedHeader?: boolean;
  /**
   * @description 列宽调整行为。
   * `onChange` 拖拽过程中实时更新，`onEnd` 在拖拽结束后更新。
   * @default 'onEnd'
   */
  columnResizeMode?: STableColumnResizeMode;
  /**
   * @description 表格行选择配置（选择列的行为配置；选中状态用 `v-model:selectedRowKeys` 管理）。
   * @default
   */
  rowSelection?: STableRowSelection<TData>;
  /**
   * @description 受控选中行键值集合（`v-model:selectedRowKeys`）。仅在提供 `rowSelection` 时生效。
   */
  readonly selectedRowKeys?: STableRowKey[];
  /**
   * @description 默认选中行键值集合（非受控初始值）。仅在提供 `rowSelection` 时生效。
   * @default []
   */
  readonly defaultSelectedRowKeys?: STableRowKey[];
  /**
   * 受控选择意图。传入本字段或 `defaultSelectionIntent` 也会开启 intent 模式；
   * 与 `rowSelection.strategy = 'intent'` 等价。
   */
  readonly selectionIntent?: STableSelectionIntent;
  /** 非受控选择意图初始值；传入后同样开启 intent 模式。 */
  readonly defaultSelectionIntent?: STableSelectionIntent;
  /**
   * @description 受控展开行键值集合（`v-model:expandedRowKeys`）。用于详情展开和树节点展开。
   */
  readonly expandedRowKeys?: STableRowKey[];
  /**
   * @description 默认展开行键值集合（非受控初始值）。用于详情展开和树节点展开。
   * @default []
   */
  readonly defaultExpandedRowKeys?: STableRowKey[];
  /** 受控行分组列 ID（`v-model:groupBy`）；数组顺序即分组层级。 */
  readonly groupBy?: string[];
  /** 非受控行分组初始值。 */
  readonly defaultGroupBy?: string[];
  /** 受控固定行键值（`v-model:pinnedRowKeys`）。 */
  readonly pinnedRowKeys?: STablePinnedRowKeys;
  /** 非受控固定行初始值。 */
  readonly defaultPinnedRowKeys?: STablePinnedRowKeys;
  /**
   * @description 分页配置。统一走此单一入口（对齐 Ant Design Vue）：
   * - 受控：`pagination.current` / `pagination.pageSize` + `pagination.onChange` 回填；
   * - 非受控：`pagination.defaultCurrent` / `pagination.defaultPageSize`，组件内部自管理。
   * @default
   */
  pagination?: boolean | STablePaginationProps;
  /**
   * @description 分页位置。
   * @default 'bottomEnd'
   */
  paginationPlacement?: PaginationPlacement | PaginationPlacement[];
  /**
   * @description 表格标题；也可使用 `#title` 插槽。函数形式接收当前页数据。
   */
  title?: VNodeChild | ((context: STableTitleContext<TData>) => VNodeChild);
  /**
   * @description 表格页脚内容；也可使用 `#footer` 插槽。函数形式接收分页上下文。
   */
  footer?: VNodeChild | ((context: STableFooterContext<TData>) => VNodeChild);
  /**
   * @description 将汇总栏固定在滚动容器底部。
   * @default false
   */
  summaryFixed?: boolean;
  /**
   * @description 响应式断点阈值（px）。
   * @default { xs: 0, sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1600 }
   */
  breakpoints?: Partial<Record<STableBreakpoint, number>>;
  /**
   * @description SSR / 首帧使用的断点。
   * @default 'lg'
   */
  defaultBreakpoint?: STableBreakpoint;
  /**
   * @description 对 dataSource 做深度监听，原地修改嵌套字段也会触发更新。
   * @default false
   */
  deepWatchDataSource?: boolean;
  /**
   * @description 对 columns 做深度监听，原地修改嵌套配置也会触发重新归一化。
   * @default false
   */
  deepWatchColumns?: boolean;
  /** 渲染缓存忽略行索引与列 token；适用于纯渲染函数。 */
  ignoreCellKey?: boolean;
  /** 虚拟滚动按 row.id 保留已测量行高，数据刷新/重排后减少跳动。 */
  preserveRow?: boolean;
  /**
   * @description 服务端分页模式。为 `true` 时组件「不」对 `dataSource` 再做客户端分页切片，
   * 直接渲染传入的当前页数据；分页交互（翻页 / 改页大小）通过 `pageChange` 事件与
   * `pagination.onChange` 通知外部，由外部请求对应页数据并更新 `dataSource`。
   * 需配合 `pagination.total`（或 `pageCount`）给出总量以正确渲染页码。
   * @default false
   */
  manualPagination?: boolean;
  /**
   * @description 服务端排序模式。为 `true` 时组件「不」对 `dataSource` 做客户端排序，
   * 排序交互通过 `sortChange` 事件通知外部，由外部请求排序后的数据并更新 `dataSource`。
   * @default false
   */
  manualSorting?: boolean;
  /**
   * @description 服务端过滤模式。为 `true` 时组件「不」对 `dataSource` 做客户端过滤，
   * 过滤交互通过 `filterChange` 事件通知外部，由外部请求过滤后的数据并更新 `dataSource`。
   * @default false
   */
  manualFiltering?: boolean;
  /** 受控多列排序状态；数组顺序即排序优先级。 */
  sorting?: STableSortItem[];
  /** 非受控多列排序初始值。 */
  defaultSorting?: STableSortItem[];
  /** 是否允许按住修饰键累积多列排序。 */
  multiSort?: boolean;
  /**
   * @description 虚拟滚动配置。`true` 兼容旧行为，仅开启纵向虚拟化；对象可分别控制 x/y 轴。
   * 可与客户端分页或 `manualPagination` 服务端分页组合使用，虚拟器消费当前页的最终行模型。
   * @default false
   */
  virtual?: boolean | STableVirtualProps<TData>;
  /**
   * @description 显式允许关闭分页和纵向虚拟化时渲染超过建议上限的完整 DOM。
   * 该选项只关闭开发态性能告警，不会改变渲染结果。
   * @default false
   */
  allowUnsafeFullRender?: boolean;
  /** 树形数据配置。 */
  tree?: STableTree<TData>;
  /** 初始展开全部树节点/详情行。 */
  defaultExpandAllRows?: boolean;
  /** 点击数据行切换展开状态。 */
  expandRowByClick?: boolean;
  /** 编辑行为配置。 */
  editConfig?: STableEditConfig<TData>;
  /** 受控编辑状态（也可通过实例方法管理）。 */
  editing?: STableEditingState | null;
  /** 非受控编辑初始状态。 */
  defaultEditing?: STableEditingState | null;
  /** 每行 class；返回数组时会与内置 class 合并。 */
  rowClassName?: string | ((record: TData, rowIndex: number) => string | undefined);
  /** 每行 style。 */
  rowStyle?: CSSProperties | ((record: TData, rowIndex: number) => CSSProperties | undefined);
  /** 注入到 `<tr>` 的任意属性；结构属性与事件由组件保留。 */
  customRow?: (record: TData, rowIndex: number) => Record<string, unknown> | undefined;
  /** 注入到 `<td>` 的任意属性；`onCell` 的合并结果优先。 */
  customCell?: (
    record: TData,
    rowIndex: number,
    column: STableColumn<TData>
  ) => Record<string, unknown> | undefined;
  /** 注入到 `<th>` 的任意属性。 */
  customHeaderCell?: (column: STableColumn<TData>) => Record<string, unknown> | undefined;
  /**
   * @description 展开行配置。
   */
  expandable?: STableExpandable<TData>;
  /**
   * @description 内置序号列配置。`true` 使用默认配置；对象可自定义标题 / 宽度 / 起始值 / 分页联动等。
   * 序号列插入在拖拽 / 选择 / 展开列之后、用户列之前，序号默认随分页联动。
   * @default false
   */
  seq?: boolean | STableSeq<TData>;
  /**
   * @description 单元格框选配置。
   */
  cellRangeSelection?: STableCellRangeSelection;
  /**
   * @description 可取消的框选复制监听器。模板中使用 `@cell-range-copy`；返回 `false`
   * 时不写入剪贴板，且 `copyCellRange()` 返回空串。未提供或返回其他值时默认允许复制。
   */
  onCellRangeCopy?: (payload: STableCellRangeCopyEvent) => boolean | void;
  /** 启用单元格焦点与方向键导航，并派发 `cellKeydown`。 */
  keyboardNavigation?: boolean;
  /** 行拖拽配置。`true` 使用默认配置；对象用于动画、多选和树形拖拽。 */
  rowDrag?: STableRowDrag<TData>;
  /** 列拖拽配置。列是否可拖动仍由列定义的 `draggable` 决定。 */
  columnDrag?: STableColumnDragConfig<TData>;
  /**
   * @description 浮层挂载容器。用于筛选、搜索、选择、表头菜单、Tooltip 与右键菜单；
   * 返回 null/无效节点时回退到 `ownerDocument.body`。
   */
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement | null;
  /**
   * @description 受控的筛选面板打开列集合；提供后筛选面板只派发
   * `filterDropdownOpenChange`，不再维护内部打开状态。
   */
  filterDropdownOpenKeys?: string[];
  /**
   * @description 表格样式。
   */
  styles?: STableStyles;
  /**
   * @description 表格语义化类名。
   */
  classes?: STableClasses;
  /**
   * @description 多语言包。默认英文（en_US）。
   * @default en_US
   */
  locale?: STableLocaleOverrides;
}
