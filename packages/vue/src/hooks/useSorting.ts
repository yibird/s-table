import { computed, type Ref } from 'vue';
import {
  functionalUpdate,
  type RowData,
  type SortingState,
  type Table,
  type TableFeatures,
  type Updater,
} from '@tanstack/vue-table';
import { buildColumnIndex } from '../utils/columnIndex';
import type { STableColumn, STableSortItem, STableSortOrder } from '../types';
import { useModelState } from './useModelState';

export type SortChangeReason = 'user' | 'column-removed';

type UseSTableSortingOptions<TData extends RowData, TValue = unknown> = {
  columns: Readonly<Ref<STableColumn<TData, TValue>[]>>;
  sorting?: Readonly<Ref<STableSortItem[] | undefined>>;
  defaultSorting?: Readonly<Ref<STableSortItem[] | undefined>>;
  multiSort?: Readonly<Ref<boolean | undefined>>;
  getTable?: () => Table<TableFeatures, TData> | undefined;
  onUpdateSorting?: (sorting: STableSortItem[]) => void;
  onSortChange?: (sorting: STableSortItem[], reason: SortChangeReason) => void;
};

/**
 * 这些读取只用于订阅响应式列对象的原地修改。不能改成 deep watch：列中包含渲染函数和业务对象，
 * 深遍历成本更高；也不保留依赖数组，避免为每列长期存放一组无业务价值的引用。
 */
const trackColumnState = <TData extends RowData, TValue>(column: STableColumn<TData, TValue>) => {
  Reflect.get(column, 'sorter');
  Reflect.get(column, 'sortDirections');
  Reflect.get(column, 'defaultSortOrder');
  Reflect.get(column, 'sortOrder');
  Reflect.get(column, 'onFilter');
  Reflect.get(column, 'filters');
  Reflect.get(column, 'defaultFilteredValues');
  Reflect.get(column, 'filteredValue');
  Reflect.get(column, 'search');
};

/**
 * 排序状态子模块：受控 prop / 列级 sortOrder / 内部状态三源合一，
 * 并桥接为 TanStack SortingState。排序计算本身由 TanStack row model 完成。
 */
export const useSorting = <TData extends RowData, TValue = unknown>({
  columns,
  sorting: controlledSorting,
  defaultSorting,
  multiSort,
  getTable,
  onUpdateSorting,
  onSortChange,
}: UseSTableSortingOptions<TData, TValue>) => {
  const columnIndex = computed(() => {
    const index = buildColumnIndex(columns.value);
    for (const column of index.map.values()) trackColumnState(column);
    return index;
  });
  const columnMap = computed(() => columnIndex.value.map);
  const leafColumnIds = computed(() => columnIndex.value.leafIds);

  /**
   * 列级 sortOrder 与顶层 sorting 都是受控入口。
   * 只要任一列显式提供 sortOrder（包括 null），列配置就拥有排序状态的所有权。
   */
  const columnControlledSorting = computed<STableSortItem[] | undefined>(() => {
    if (controlledSorting?.value !== undefined) return undefined;

    const result: STableSortItem[] = [];
    let hasControl = false;
    for (const [id, column] of columnMap.value) {
      if (column.sortOrder === undefined) continue;
      hasControl = true;
      if (column.sortOrder !== null) result.push({ columnId: id, order: column.sortOrder });
    }
    return hasControl ? result : undefined;
  });
  // 受控 / 非受控镜像统一走 useModelState，与编辑、选择意图等模块共用同一套
  // 「受控值优先、切回非受控时保留最后受控值」的语义。
  const {
    state: sorting,
    internal: internalSorting,
    isControlled: isSortingControlled,
  } = useModelState<STableSortItem[]>({
    modelValue: computed(() => controlledSorting?.value ?? columnControlledSorting.value),
    defaultValue: () => [...(defaultSorting?.value ?? [])],
    toInternalValue: (value) => value.map((item) => ({ ...item })),
  });

  /** 统一的多列排序写入口，同时维持受控和非受控语义。 */
  const updateSorting = (next: STableSortItem[], reason: SortChangeReason = 'user') => {
    const current = sorting.value;
    if (
      next.length === current.length &&
      next.every(
        (item, index) =>
          item.columnId === current[index]?.columnId && item.order === current[index]?.order
      )
    ) {
      return;
    }
    const normalized = next.map((item) => ({ ...item }));
    if (!isSortingControlled.value) internalSorting.value = normalized;
    onUpdateSorting?.(normalized.map((item) => ({ ...item })));
    // 两个外部回调都接收独立快照，避免业务代码原地修改事件参数后污染内部排序状态。
    onSortChange?.(
      normalized.map((item) => ({ ...item })),
      reason
    );
  };

  /**
   * 切换排序方向：none -> ascend -> descend -> none。
   * 支持 sortDirections 自定义排序方向子集。
   */
  const toggleSort = (columnId: string) => {
    const col = columnMap.value.get(columnId);
    // 默认方向完全复用 TanStack 状态机；显式 sortDirections 才进入兼容层分支。
    if (col?.sortDirections === undefined) {
      const tanstackColumn = getTable?.()?.getColumn(columnId);
      if (tanstackColumn?.getCanSort()) {
        tanstackColumn.toggleSorting(undefined, multiSort?.value === true);
        return;
      }
    }
    const directions: STableSortOrder[] = col?.sortDirections ?? ['ascend', 'descend'];
    const current = sorting.value;
    const existingIndex = current.findIndex((item) => item.columnId === columnId);
    const existing = existingIndex >= 0 ? current[existingIndex] : undefined;
    const currentIndex = existing ? directions.indexOf(existing.order) : -1;
    const nextOrder =
      directions.length === 0 || currentIndex === directions.length - 1
        ? undefined
        : (directions[currentIndex + 1] ?? directions[0]);
    const preserveOthers = multiSort?.value === true;
    const next = preserveOthers ? current.map((item) => ({ ...item })) : [];
    const nextIndex = next.findIndex((item) => item.columnId === columnId);
    if (!nextOrder) {
      if (nextIndex >= 0) next.splice(nextIndex, 1);
    } else if (nextIndex >= 0) {
      next[nextIndex] = { columnId, order: nextOrder };
    } else {
      next.push({ columnId, order: nextOrder });
    }
    updateSorting(next);
  };

  const setSorting = (next: STableSortItem[]) => updateSorting(next);

  /** 清空当前排序状态。 */
  const clearSort = () => {
    if (sorting.value.length === 0) return;
    updateSorting([]);
  };

  // 桥接：对外单列排序状态 → TanStack SortingState 数组形状
  const sortingState = computed<SortingState>(() => {
    return sorting.value.map((item) => ({
      id: item.columnId,
      desc: item.order === 'descend',
    }));
  });

  /** 接收 TanStack 官方 API 的 Updater，并写回 STable 的单列排序产品状态。 */
  const onSortingChange = (updater: Updater<SortingState>) => {
    const next = functionalUpdate(updater, sortingState.value);
    updateSorting(
      next.map((item) => ({
        columnId: item.id,
        order: item.desc ? 'descend' : 'ascend',
      }))
    );
  };

  return {
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
  };
};
