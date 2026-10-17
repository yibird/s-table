import { computed, shallowRef, watch, type Ref } from 'vue';
import type {
  ExpandedState,
  GroupingState,
  RowData,
  Table,
  TableFeatures,
  Updater,
} from '@tanstack/vue-table';
import type { STableColumn, STableTree } from '../../types';
import { useModelState } from '../../hooks/useModelState';

type STableTanStackTable<TData extends RowData> = Table<TableFeatures, TData>;

type UseSTableGroupingOptions<TData extends RowData> = {
  /** 受控分组列 id 列表（`v-model:groupBy`）。 */
  groupBy: Readonly<Ref<string[] | undefined>>;
  /** 非受控初始分组。 */
  defaultGroupBy: Readonly<Ref<string[] | undefined>>;
  /** 列 id → 公开列定义（校验分组列有效性）。 */
  columnMap: Readonly<Ref<ReadonlyMap<string, STableColumn<TData>>>>;
  /** 树形配置；树形与分组互斥，树形优先。 */
  tree: Readonly<Ref<STableTree<TData> | undefined>>;
  getTable: () => STableTanStackTable<TData> | undefined;
  onUpdateGroupBy: (groupBy: string[]) => void;
  onGroupByChange: (groupBy: string[]) => void;
};

/**
 * 行分组 / 聚合 feature。
 *
 * 分组行模型、分组值缓存与聚合计算全部由 TanStack `columnGroupingFeature` +
 * `rowAggregationFeature` 托管；本模块只负责：
 * 1. `groupBy` 的受控 / 非受控桥接与合法性过滤；
 * 2. 分组模式下的展开状态（与业务行展开使用不同的 id 空间，因此单独持有，
 *    组件在分组激活时切换到本状态切片）；
 * 3. 公开实例方法（setGroupBy / expandAllGroups / collapseAllGroups / toggleGroup）。
 */
export const useGrouping = <TData extends RowData>({
  groupBy: controlledGroupBy,
  defaultGroupBy,
  columnMap,
  tree,
  getTable,
  onUpdateGroupBy,
  onGroupByChange,
}: UseSTableGroupingOptions<TData>) => {
  const {
    state: rawGroupBy,
    internal: internalGroupBy,
    isControlled,
  } = useModelState<string[]>({
    modelValue: controlledGroupBy,
    defaultValue: () => [...(defaultGroupBy.value ?? [])],
    toInternalValue: (keys) => [...keys],
  });

  let warnedTreeConflict = false;
  /** 过滤掉不可分组列、重复列和未知列 id；树形模式下分组整体失效。 */
  const normalizeGroupBy = (requested: readonly string[]): GroupingState => {
    if (requested.length === 0) return [];
    if (tree.value) {
      if (!warnedTreeConflict) {
        warnedTreeConflict = true;
        console.warn('[STable] `groupBy` 与 `tree` 互斥：树形数据已启用，分组配置被忽略。');
      }
      return [];
    }
    const map = columnMap.value;
    const seen = new Set<string>();
    const valid: string[] = [];
    for (const id of requested) {
      const column = map.get(id);
      const canGroup =
        column?.groupable === true &&
        (typeof column.accessorKey === 'string' ||
          typeof column.accessorFn === 'function' ||
          typeof column.getGroupingValue === 'function');
      if (!column && import.meta.env?.DEV) {
        console.warn(`[STable] groupBy 中的列 "${id}" 不存在，已忽略。`);
      } else if (!canGroup && import.meta.env?.DEV) {
        console.warn(
          `[STable] 列 "${id}" 未启用 groupable，或缺少 accessor/getGroupingValue，已忽略。`
        );
      }
      if (canGroup && !seen.has(id)) {
        seen.add(id);
        valid.push(id);
      }
    }
    return valid;
  };

  const groupingState = computed<GroupingState>(() => normalizeGroupBy(rawGroupBy.value));

  const groupingActive = computed(() => groupingState.value.length > 0);

  /** 提交已归一化的分组状态（受控 / 非受控 + 公开事件）。 */
  const commitNormalizedGroupBy = (normalized: GroupingState) => {
    if (!isControlled.value) internalGroupBy.value = [...normalized];
    onUpdateGroupBy([...normalized]);
    onGroupByChange([...normalized]);
  };

  const commitGroupBy = (next: GroupingState) => {
    commitNormalizedGroupBy(normalizeGroupBy(next));
  };

  /** TanStack onGroupingChange 桥（如通过 column.toggleGrouping 等官方入口触发）。 */
  const onGroupingChange = (updater: Updater<GroupingState>) => {
    const next = typeof updater === 'function' ? updater(groupingState.value) : updater;
    commitGroupBy(next);
  };

  // 分组行的展开状态：分组行 id 由 TanStack 生成（`columnId:value` 级联），与业务
  // rowKey 编码空间不同，不能流入公开的 expandedRowKeys 管线。默认全部展开（true）。
  const groupExpandedState = shallowRef<ExpandedState>(true);

  const onGroupExpandedChange = (updater: Updater<ExpandedState>) => {
    groupExpandedState.value =
      typeof updater === 'function' ? updater(groupExpandedState.value) : updater;
  };

  // 分组维度变化后重置为全部展开，避免遗留上一维度的折叠 id。
  watch(groupingState, () => {
    groupExpandedState.value = true;
  });

  const setGroupBy = (next: string[]) => {
    const normalized = normalizeGroupBy(next);
    const current = groupingState.value;
    if (
      normalized.length === current.length &&
      normalized.every((id, index) => id === current[index])
    )
      return;
    commitNormalizedGroupBy(normalized);
  };

  const getGroupBy = () => [...groupingState.value];

  const expandAllGroups = () => {
    if (groupingActive.value) groupExpandedState.value = true;
  };

  const collapseAllGroups = () => {
    if (groupingActive.value) groupExpandedState.value = {};
  };

  /** 按分组行 id（`groupRow` 插槽与分组行事件暴露的 id）切换展开状态。 */
  const toggleGroup = (groupRowId: string) => {
    if (!groupingActive.value) return;
    const row = getTable()?.getGroupedRowModel().rowsById[groupRowId];
    if (row?.getIsGrouped()) row.toggleExpanded();
  };

  return {
    groupingState,
    groupingActive,
    onGroupingChange,
    groupExpandedState,
    onGroupExpandedChange,
    setGroupBy,
    getGroupBy,
    expandAllGroups,
    collapseAllGroups,
    toggleGroup,
  };
};
