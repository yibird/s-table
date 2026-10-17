import { computed, shallowRef, watch, type Ref } from 'vue';
import {
  functionalUpdate,
  type ColumnFiltersState,
  type RowData,
  type Table,
  type TableFeatures,
  type Updater,
} from '@tanstack/vue-table';
import { removeInvalidSortEntries } from '@zchengfeng/s-table-core';
import type {
  STableColumn,
  STableColumnFilterValue,
  STableFilterValue,
  STableSortItem,
} from '../types';
import { useSorting, type SortChangeReason } from './useSorting';

type UseSTableSortFilterOptions<TData extends RowData, TValue = unknown> = {
  /** 列配置集合，用于查找 sorter / onFilter 等函数。 */
  columns: Readonly<Ref<STableColumn<TData, TValue>[]>>;
  sorting?: Readonly<Ref<STableSortItem[] | undefined>>;
  defaultSorting?: Readonly<Ref<STableSortItem[] | undefined>>;
  multiSort?: Readonly<Ref<boolean | undefined>>;
  getTable?: () => Table<TableFeatures, TData> | undefined;
  onUpdateSorting?: (sorting: STableSortItem[]) => void;
  onSortChange?: (sorting: STableSortItem[], reason: SortChangeReason) => void;
  onFilterChange?: (
    filters: ReadonlyMap<string, STableFilterValue[]>,
    searches: ReadonlyMap<string, string>
  ) => void;
};

/**
 * 管理表格过滤 / 搜索状态，并组合排序子模块（useSorting）。
 * 过滤与排序计算委托给 TanStack 内置 row model（记忆化，避免重复计算），
 * 本 hook 只负责状态管理，并把对外状态桥接为 TanStack 的
 * ColumnFiltersState / SortingState 形状，不再遍历数据源。
 */
export const useSortFilter = <TData extends RowData, TValue = unknown>({
  columns,
  sorting: controlledSorting,
  defaultSorting,
  multiSort,
  getTable,
  onUpdateSorting,
  onSortChange,
  onFilterChange,
}: UseSTableSortFilterOptions<TData, TValue>) => {
  const {
    columnMap,
    leafColumnIds,
    sorting,
    sortingState,
    onSortingChange,
    updateSorting,
    isSortingControlled,
    toggleSort,
    setSorting,
    clearSort,
  } = useSorting<TData, TValue>({
    columns,
    sorting: controlledSorting,
    defaultSorting,
    multiSort,
    getTable,
    onUpdateSorting,
    onSortChange,
  });

  // ── 过滤状态 ──
  const internalFilterState = shallowRef<Map<string, STableFilterValue[]>>(new Map());
  /** 列级 filteredValue 覆盖内部状态，实现与受控 sorting 一致的单向数据流。 */
  const filterState = computed<Map<string, STableFilterValue[]>>(() => {
    let result = internalFilterState.value;
    for (const [id, column] of columnMap.value) {
      if (column.filteredValue === undefined) continue;
      if (result === internalFilterState.value) result = new Map(result);
      // 直接复用受控数组引用，让下游 valueSet 能按数组身份缓存。
      if (column.filteredValue.length > 0) result.set(id, column.filteredValue);
      else result.delete(id);
    }
    return result;
  });
  /** 枚举过滤的成员索引：按 values 数组身份缓存，搜索词变化时不重建。 */
  const valueSetCache = new WeakMap<readonly STableFilterValue[], ReadonlySet<STableFilterValue>>();
  const toValueSet = (values: readonly STableFilterValue[]): ReadonlySet<STableFilterValue> => {
    let set = valueSetCache.get(values);
    if (!set) {
      set = new Set(values);
      valueSetCache.set(values, set);
    }
    return set;
  };
  // ── 搜索状态 ──
  const searchState = shallowRef<Map<string, string>>(new Map());

  // 当前生命周期内已应用默认值的列 id：列移除时同步清理，避免动态列 ID 长期累积。
  const defaultsAppliedColumnIds = new Set<string>();

  /**
   * 应用列的默认排序 / 默认过滤（仅对首次出现的列生效）。
   *
   * 相比「hook 创建时一次性扫描」，改用 watch 追踪 columnMap：既覆盖初始列，
   * 也支持运行时动态新增列（异步加载列配置）时补齐其默认值，且不会重置用户已有交互。
   *
   * 排序仅支持单列：当前无排序（columnId 为 null）时，取「声明顺序最靠前」且声明了
   * defaultSortOrder 的新列。columnMap 已按声明顺序构建（见 buildColumnIndex），
   * 遍历顺序即声明顺序。
   */
  const applyColumnDefaults = () => {
    const map = columnMap.value;
    let nextFilter: Map<string, STableFilterValue[]> | null = null;
    let nextSearch: Map<string, string> | null = null;

    const validSorting = removeInvalidSortEntries(sorting.value, (columnId) => {
      const column = map.get(columnId);
      return column?.sorter === true || typeof column?.sorter === 'function';
    });
    if (validSorting.length !== sorting.value.length) {
      updateSorting(validSorting, 'column-removed');
    }

    // 内部状态只承载非受控列：动态列移除 / 能力关闭时清理陈旧条目；
    // 受控列的值由 filterState 覆盖层提供，内部条目必须删除，
    // 否则父层释放 filteredValue 后旧值会复活为活动过滤。
    const internalFilter = internalFilterState.value;
    for (const columnId of internalFilter.keys()) {
      const column = map.get(columnId);
      if (
        column?.filteredValue === undefined &&
        (typeof column?.onFilter === 'function' ||
          Array.isArray(column?.filters) ||
          Array.isArray(column?.defaultFilteredValues))
      ) {
        continue;
      }
      nextFilter ??= new Map(internalFilter);
      nextFilter.delete(columnId);
    }
    for (const columnId of searchState.value.keys()) {
      if (map.get(columnId)?.search) continue;
      nextSearch ??= new Map(searchState.value);
      nextSearch.delete(columnId);
    }

    for (const id of defaultsAppliedColumnIds) {
      if (!map.has(id)) defaultsAppliedColumnIds.delete(id);
    }

    let nextDefaultSorting = sorting.value;
    let hasNewDefaultSorting = false;
    for (const [id, col] of map) {
      if (defaultsAppliedColumnIds.has(id)) continue;
      defaultsAppliedColumnIds.add(id);

      // 先收集本轮新增列的默认排序，最后一次提交，避免动态加入多列时连续派发中间状态。
      if (
        col.defaultSortOrder &&
        !isSortingControlled.value &&
        !nextDefaultSorting.some((item) => item.columnId === id) &&
        (multiSort?.value === true || nextDefaultSorting.length === 0)
      ) {
        if (!hasNewDefaultSorting) nextDefaultSorting = [...nextDefaultSorting];
        nextDefaultSorting.push({ columnId: id, order: col.defaultSortOrder });
        hasNewDefaultSorting = true;
      }

      // 默认过滤：累积到同一个副本后一次性提交，避免多列时反复创建新 Map。
      // 受控列由 filteredValue 决定，不应用默认值。
      if (
        col.filteredValue === undefined &&
        col.defaultFilteredValues &&
        col.defaultFilteredValues.length > 0
      ) {
        nextFilter ??= new Map(internalFilter);
        nextFilter.set(id, [...col.defaultFilteredValues]);
      }
    }

    if (hasNewDefaultSorting) updateSorting(nextDefaultSorting);
    if (nextFilter) internalFilterState.value = nextFilter;
    if (nextSearch) searchState.value = nextSearch;
  };

  applyColumnDefaults();
  // immediate:false —— 上面已同步应用一次；此处仅在后续列变化时补齐新列默认值。
  watch(columnMap, applyColumnDefaults);

  const publishFilterChange = (
    filters: ReadonlyMap<string, STableFilterValue[]> = filterState.value,
    searches: ReadonlyMap<string, string> = searchState.value
  ) => onFilterChange?.(filters, searches);

  /** 以内部状态为基底写入，避免把其他受控列的覆盖值固化进内部状态。 */
  const setInternalFilterValue = (columnId: string, values: STableFilterValue[] | undefined) => {
    const next = new Map(internalFilterState.value);
    if (values === undefined) next.delete(columnId);
    else next.set(columnId, values);
    internalFilterState.value = next;
  };

  /** 设置指定列的过滤值；空数组表示移除过滤。 */
  const setFilter = (columnId: string, values: STableFilterValue[]) => {
    const current = filterState.value.get(columnId);
    if (values.length === 0 && current === undefined) return;
    if (
      current?.length === values.length &&
      current.every((value, index) => Object.is(value, values[index]))
    ) {
      return;
    }

    // 发布「用户意图」的完整快照；受控列的实际生效值仍由 filteredValue 决定。
    const next = new Map(filterState.value);
    if (values.length === 0) next.delete(columnId);
    else next.set(columnId, [...values]);

    if (columnMap.value.get(columnId)?.filteredValue === undefined) {
      setInternalFilterValue(columnId, values.length === 0 ? undefined : [...values]);
    }
    publishFilterChange(next);
  };

  /** 清除指定列的过滤条件；受控列由父层控制，忽略清理请求。 */
  const clearFilterByColumn = (columnId: string) => {
    if (!filterState.value.has(columnId)) return;
    if (columnMap.value.get(columnId)?.filteredValue !== undefined) return;

    setInternalFilterValue(columnId, undefined);
    const next = new Map(filterState.value);
    next.delete(columnId);
    publishFilterChange(next);
  };

  /** 清空全部非受控列的过滤条件；受控列保持不变。 */
  const clearFilter = () => {
    if (internalFilterState.value.size === 0) return;
    internalFilterState.value = new Map();
    publishFilterChange(filterState.value);
  };

  /** 设置指定列的搜索词；空字符串表示移除搜索。 */
  const setSearch = (columnId: string, value: string) => {
    const current = searchState.value.get(columnId);
    if ((!value && current === undefined) || current === value) return;

    const next = new Map(searchState.value);
    if (!value) {
      next.delete(columnId);
    } else {
      next.set(columnId, value);
    }
    searchState.value = next;
    publishFilterChange(filterState.value, next);
  };

  /** 清除指定列的搜索词。 */
  const clearSearchByColumn = (columnId: string) => {
    if (!searchState.value.has(columnId)) return;
    const next = new Map(searchState.value);
    next.delete(columnId);
    searchState.value = next;
    publishFilterChange(filterState.value, next);
  };

  /** 清空全部列搜索词。 */
  const clearSearch = () => {
    if (searchState.value.size === 0) return;
    searchState.value = new Map();
    publishFilterChange(filterState.value, new Map());
  };

  // ── 桥接：筛选 Map + 搜索 Map → TanStack ColumnFiltersState ──
  const columnFiltersState = computed<ColumnFiltersState>(() => {
    const result: ColumnFiltersState = [];
    const searches = searchState.value;

    for (const [columnId, values] of filterState.value) {
      const keyword = searches.get(columnId);
      result.push({
        id: columnId,
        value: {
          values,
          valueSet: toValueSet(values),
          ...(keyword ? { keyword, normalizedKeyword: keyword.toLowerCase() } : {}),
        },
      });
    }

    // 搜索和筛选命中同一列时只产生一个 filter entry，避免同列重复计算。
    for (const [columnId, keyword] of searches) {
      if (!keyword || filterState.value.has(columnId)) continue;
      const column = columnMap.value.get(columnId);
      const usesBuiltInSearch =
        column?.search === true &&
        typeof column.onFilter !== 'function' &&
        !Array.isArray(column.filters) &&
        !Array.isArray(column.defaultFilteredValues) &&
        !Array.isArray(column.filteredValue);
      result.push({
        id: columnId,
        // 内置 includesString 自己会在过滤前规范化一次关键字，不再创建复合值对象。
        value: usesBuiltInSearch ? keyword : { keyword, normalizedKeyword: keyword.toLowerCase() },
      });
    }
    return result;
  });

  /**
   * 接收 TanStack 官方过滤 Updater。STable 的筛选项与搜索词共享一个 column filter，
   * 因而只在这一处完成稳定公共状态与产品 UI 状态之间的双向转换。
   */
  const onColumnFiltersChange = (updater: Updater<ColumnFiltersState>) => {
    const current = columnFiltersState.value;
    const next = functionalUpdate(updater, current);
    if (next === current) return;

    const nextFilters = new Map<string, STableFilterValue[]>();
    const nextSearches = new Map<string, string>();
    for (const item of next) {
      const rawValue = item.value;
      if (Array.isArray(rawValue)) {
        nextFilters.set(item.id, rawValue as STableFilterValue[]);
        continue;
      }
      if (rawValue != null && typeof rawValue === 'object') {
        const value = rawValue as STableColumnFilterValue;
        if (value.values?.length) nextFilters.set(item.id, [...value.values]);
        if (value.keyword) nextSearches.set(item.id, value.keyword);
        continue;
      }
      if (
        typeof rawValue === 'string' ||
        typeof rawValue === 'number' ||
        typeof rawValue === 'boolean'
      ) {
        if (columnMap.value.get(item.id)?.search) {
          nextSearches.set(item.id, String(rawValue));
        } else {
          nextFilters.set(item.id, [rawValue]);
        }
      }
    }
    // 受控列（filteredValue 已定义）的有效值由 filterState 覆盖层提供，
    // 写回 internal 会把受控值固化，父层随后移除 filteredValue 时旧值会复活为活动过滤。
    const internalFilters = new Map<string, STableFilterValue[]>();
    for (const [id, values] of nextFilters) {
      if (columnMap.value.get(id)?.filteredValue === undefined) internalFilters.set(id, values);
    }
    internalFilterState.value = internalFilters;
    searchState.value = nextSearches;
    publishFilterChange(nextFilters, nextSearches);
  };

  return {
    columnMap,
    leafColumnIds,
    sorting,
    filterState,
    searchState,
    /** 桥接给 TanStack 的排序状态。 */
    sortingState,
    onSortingChange,
    /** 桥接给 TanStack 的列过滤状态。 */
    columnFiltersState,
    onColumnFiltersChange,
    toggleSort,
    setSorting,
    clearSort,
    setFilter,
    clearFilterByColumn,
    clearFilter,
    setSearch,
    clearSearchByColumn,
    clearSearch,
  };
};
