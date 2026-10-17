import type { ComputedRef, EmitFn, Ref, ShallowRef, Slots } from 'vue';
import type { RowData, Table, TableFeatures } from '@tanstack/vue-table';
import type { STableLocale } from '../locales';
import type {
  STableClasses,
  STableEmits,
  STableExpandable,
  STableProps,
  STableRowDragConfig,
} from '../types';

/**
 * 已在 `STable.vue` 的 `withDefaults` 中补默认值的 prop 键。
 *
 * withDefaults 的返回类型会把这些键变为必填且值非 undefined（Vue 3.4+ 类型行为），
 * `toRefs` 得到的 ref 值类型同样不含 undefined；未列出的键保持原可选类型。
 * 新增带默认值的 prop 时需同步本列表。
 */
type STableDefaultedPropKeys =
  | 'dataSource'
  | 'columns'
  | 'size'
  | 'bordered'
  | 'striped'
  | 'loading'
  | 'virtual'
  | 'showHeader'
  | 'fixedHeader'
  | 'showFooter'
  | 'columnResizeMode'
  | 'paginationPlacement'
  | 'keyboardNavigation'
  | 'locale';

/** props 派生 ref：从 `toRefs(props)` 展开进 context 的扁平字段。 */
type STablePropRefs<TData extends RowData> = {
  [K in keyof STableProps<TData>]-?: Readonly<
    Ref<
      K extends STableDefaultedPropKeys ? NonNullable<STableProps<TData>[K]> : STableProps<TData>[K]
    >
  >;
};

/**
 * STable setup 阶段的共享上下文。
 *
 * 各 setup composable 从这里读取 props 派生 ref、emit、slots 与表格实例，
 * 保证拆分后仍然只有一份响应式来源。
 */
export type STableSetupContext<TData extends RowData> = STablePropRefs<TData> & {
  /** 原始 props（withDefaults 后的只读对象）。 */
  props: Readonly<STableProps<TData>>;
  /** 组件事件派发器。 */
  emit: EmitFn<STableEmits<TData>>;
  /** 插槽表（用于能力探测与透传）。 */
  slots: Slots;
  /** 合并后的语言包。 */
  resolvedLocale: ComputedRef<STableLocale>;
  /** 归一化后的数据源（响应式数组已生成浅快照，供 TanStack 按引用缓存）。 */
  dataSource: ComputedRef<TData[]>;
  /** 树形缩进宽度；未启用树形数据时为 undefined。 */
  treeIndentSize: ComputedRef<number | undefined>;
  /** 当前尺寸下单元格原有行内起始 padding。 */
  treeIndentBasePadding: ComputedRef<number>;
  /** 展开配置。 */
  expandable: ComputedRef<STableExpandable<TData> | undefined>;
  /** 行拖拽开关。 */
  rowDragEnabled: Readonly<Ref<boolean>>;
  /** 行拖拽配置。 */
  rowDragConfig: Readonly<Ref<STableRowDragConfig<TData> | undefined>>;
  /** 列拖拽动画开关。 */
  animateColumnDrag: Readonly<Ref<boolean>>;
  /** TanStack Table 实例；由 table model 模块在创建后写回。 */
  tableInstance: ShallowRef<Table<TableFeatures, TData> | undefined>;
  /** 惰性读取表格实例，避免 hook 创建顺序依赖。 */
  getTable: () => Table<TableFeatures, TData> | undefined;
  /** 组件根节点。 */
  rootRef: Readonly<Ref<HTMLElement | null>>;
  /** 解析后的类名入口（classNames 优先，classes 兼容）。 */
  classes: ComputedRef<STableClasses | undefined>;
};
