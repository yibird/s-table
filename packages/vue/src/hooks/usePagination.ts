import { computed, watch, type Ref } from 'vue';
import {
  functionalUpdate,
  type PaginationState as TanStackPaginationState,
  type Updater,
} from '@tanstack/vue-table';
import type { PaginationPlacement, STablePaginationProps } from '../types';
import { useModelState } from './useModelState';

/** 默认每页条数 */
const DEFAULT_PAGE_SIZE = 10;

/**
 * `usePagination` 的入参约束。
 *
 * @template TData 表格行数据类型。
 */
type UseSTablePaginationOptions = {
  /** 分页配置（来自 props.pagination）。 */
  pagination: Readonly<Ref<boolean | STablePaginationProps | undefined>>;
  /** 分页位置配置（来自 props.paginationPlacement）。 */
  paginationPlacement: Readonly<Ref<PaginationPlacement | undefined>>;
  /**
   * 惰性读取 TanStack 分页前的总行数。
   * getter 用于打破“分页状态创建早于 table、table 又依赖分页状态”的初始化环，
   * 并避免额外 ref 与 watchEffect 搬运总数。
   */
  getFilteredTotal: () => number;
  /** 用户分页交互回调，用于派发组件级 pageChange 事件。 */
  onPageChange?: (page: number, pageSize: number) => void;
};

/**
 * 分页状态信息，供 `<Pagination>` 组件绑定。
 */
export interface PaginationViewState {
  current: number;
  pageSize: number;
  total: number;
  disabled: boolean;
  showQuickJumper: boolean;
  showSizeChanger: boolean;
  pageSizeOptions: number[];
  showTotal?: (total: number, range: [number, number]) => string;
}

/**
 * 从分页配置中提取受控页码 / 页大小。
 */
function getConfigValue(config: boolean | STablePaginationProps | undefined) {
  if (typeof config === 'object') return config;
  return undefined;
}

/** 将页码或页大小规范为大于零的整数。 */
const normalizePositiveInteger = (value: number | undefined, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(1, Math.trunc(value));
};

/** 将总条数规范为非负整数，无效值回退为零。 */
const normalizeTotal = (value: number | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;
  return Math.trunc(value);
};

/**
 * 表格分页 hook。
 *
 * 管理受控 / 非受控分页状态，并将其桥接给 TanStack 内置分页 row model 与分页视图。
 */
export const usePagination = ({
  pagination,
  paginationPlacement,
  getFilteredTotal,
  onPageChange,
}: UseSTablePaginationOptions) => {
  // ==================== 配置解析 ====================

  const paginationEnabled = computed(() => {
    const p = pagination.value;
    return p !== false && p !== undefined;
  });

  const config = computed(() => getConfigValue(pagination.value));

  // ==================== 受控 / 非受控状态 ====================

  // 单一状态入口（对齐 Ant Design Vue）：受控 = pagination.current / pagination.pageSize；
  // 非受控 = pagination.defaultCurrent / defaultPageSize（组件内部自管理）。
  const controlledCurrent = computed(() => config.value?.current);
  const controlledPageSize = computed(() => config.value?.pageSize);

  // 初始值：受控值优先，否则用 default* 配置，最后回退默认常量。
  // 受控值变化时同步进内部状态，作为受控切回非受控时的最后有效回退值。
  const { internal: internalCurrent, isControlled: isCurrentControlled } = useModelState<number>({
    modelValue: controlledCurrent,
    defaultValue: () => normalizePositiveInteger(config.value?.defaultCurrent, 1),
    toInternalValue: (val) => normalizePositiveInteger(val, 1),
  });

  const { internal: internalPageSize, isControlled: isPageSizeControlled } = useModelState<number>({
    modelValue: controlledPageSize,
    defaultValue: () => normalizePositiveInteger(config.value?.defaultPageSize, DEFAULT_PAGE_SIZE),
    toInternalValue: (val) => normalizePositiveInteger(val, DEFAULT_PAGE_SIZE),
  });

  // 受控值始终是唯一真源；内部 ref 只保存非受控状态及受控转非受控时的最后有效回退值。
  const requestedPage = computed(() =>
    normalizePositiveInteger(controlledCurrent.value, internalCurrent.value)
  );
  const currentPageSize = computed(() =>
    normalizePositiveInteger(controlledPageSize.value, internalPageSize.value)
  );

  // ==================== 数据总条数 ====================

  const paginationTotal = computed(() => {
    const c = config.value;
    // 服务端场景：显式 total 优先；否则若给了 pageCount，用 pageCount × pageSize 反推一个总量下界，
    // 保证页码控件渲染出正确的总页数（后端只知道总页数、不知道精确 total 时）。
    if (c && typeof c.total === 'number') return normalizeTotal(c.total);
    if (c && typeof c.pageCount === 'number') {
      return normalizeTotal(c.pageCount) * currentPageSize.value;
    }
    return normalizeTotal(getFilteredTotal());
  });

  // 只把业务显式给出的服务端计数交给 TanStack。客户端模式继续由
  // getPrePaginatedRowModel() 计数，避免 rowCount 反向遮蔽过滤后的真实行数。
  const tanstackRowCount = computed(() => {
    const total = config.value?.total;
    return typeof total === 'number' ? normalizeTotal(total) : undefined;
  });
  const tanstackPageCount = computed(() => {
    const pageCount = config.value?.pageCount;
    return typeof pageCount === 'number' ? normalizeTotal(pageCount) : undefined;
  });

  // ==================== 桥接 TanStack 分页状态 ====================
  // 实际切片由 table 内置分页 row model 完成，这里仅提供 { pageIndex, pageSize }。
  const tanstackPaginationState = computed<TanStackPaginationState | undefined>((previous) => {
    if (!paginationEnabled.value) return undefined;
    const pageSize = currentPageSize.value;
    // 防御受控 current 越界：pageIndex 超出总页数时 TanStack 分页模型会返回空行集合，
    // 导致表格空态但分页器显示有数据。clamp 保证行模型始终命中有效页。
    const maxPageIndex = Math.max(0, Math.ceil(paginationTotal.value / pageSize) - 1);
    const next = {
      pageIndex: Math.min(Math.max(0, requestedPage.value - 1), maxPageIndex),
      pageSize,
    };
    // 过滤会改变 total，但有效页码可能完全不变；保留旧引用可阻止 Vue adapter
    // 把同一分页状态再次同步给 TanStack，避免一次筛选触发两次 setOptions。
    return previous?.pageIndex === next.pageIndex && previous.pageSize === next.pageSize
      ? previous
      : next;
  });

  // 视图、序号列和公开状态统一读取 TanStack 实际采用的页码，避免受控越界值造成 UI 分叉。
  const currentPage = computed(
    () => (tanstackPaginationState.value?.pageIndex ?? requestedPage.value - 1) + 1
  );

  // ==================== 页码越界自动修正 ====================

  watch([currentPageSize, paginationTotal], () => {
    if (!paginationEnabled.value || isCurrentControlled.value) return;
    const maxPage = Math.max(1, Math.ceil(paginationTotal.value / currentPageSize.value));
    if (internalCurrent.value > maxPage) {
      internalCurrent.value = maxPage;
    }
  });

  // ==================== 分页位置解析 ====================

  const resolvedPaginationPlacement = computed(() => paginationPlacement.value ?? 'bottomEnd');

  const showPaginationTop = computed(
    () => paginationEnabled.value && resolvedPaginationPlacement.value.startsWith('top')
  );
  const showPaginationBottom = computed(
    () => paginationEnabled.value && resolvedPaginationPlacement.value.startsWith('bottom')
  );

  // ==================== 事件处理 ====================

  /** 单一提交入口，确保 UI 与 TanStack Updater 只触发一次受控通知。 */
  const commitPagination = (page: number, pageSize: number) => {
    if (page === currentPage.value && pageSize === currentPageSize.value) return;
    if (!isPageSizeControlled.value) internalPageSize.value = pageSize;
    if (!isCurrentControlled.value) internalCurrent.value = page;
    config.value?.onChange?.(page, pageSize);
    onPageChange?.(page, pageSize);
  };

  // 交互统一通过 pagination.onChange 通知外部（唯一回填入口）；受控时外部据此更新
  // pagination.current / pageSize，再经上面的 watch 同步回内部状态。非受控时内部状态直接生效。
  /** 更新当前页码并通知外部受控状态。 */
  const handlePageChange = (page: number) => {
    const nextPage = normalizePositiveInteger(page, currentPage.value);
    const pageSize = currentPageSize.value;
    commitPagination(nextPage, pageSize);
  };

  /** 更新每页条数、修正越界页码并通知外部。 */
  const handlePageSizeChange = (size: number) => {
    const nextSize = normalizePositiveInteger(size, currentPageSize.value);
    const configuredPageCount = config.value?.pageCount;
    const maxPage =
      typeof configuredPageCount === 'number'
        ? normalizePositiveInteger(configuredPageCount, 1)
        : Math.max(1, Math.ceil(paginationTotal.value / nextSize));
    const nextPage = Math.min(currentPage.value, maxPage);

    commitPagination(nextPage, nextSize);
  };

  /**
   * UIPagination 每次交互只派发一个 change 事件；按 pageSize 是否变化选择对应处理器，
   * 避免修改每页条数时 `update:pageSize` 与 `update:current` 造成双重通知。
   */
  const handlePaginationChange = (page: number, pageSize: number) => {
    const nextSize = normalizePositiveInteger(pageSize, currentPageSize.value);
    if (nextSize !== currentPageSize.value) {
      handlePageSizeChange(nextSize);
      return;
    }
    handlePageChange(page);
  };

  const onTanStackPaginationChange = (updater: Updater<TanStackPaginationState>) => {
    const current = tanstackPaginationState.value;
    if (!current) return;
    const next = functionalUpdate(updater, current);
    const nextSize = normalizePositiveInteger(next.pageSize, current.pageSize);
    const maxPage = Math.max(1, Math.ceil(paginationTotal.value / nextSize));
    const nextPage = Math.min(
      normalizePositiveInteger(next.pageIndex + 1, current.pageIndex + 1),
      maxPage
    );
    commitPagination(nextPage, nextSize);
  };

  /** 客户端排序或过滤改变行集合时回到第一页，并保持受控状态只读。 */
  const resetPage = () => {
    if (!paginationEnabled.value || currentPage.value === 1) return;
    const pageSize = currentPageSize.value;
    if (!isCurrentControlled.value) internalCurrent.value = 1;
    config.value?.onChange?.(1, pageSize);
    onPageChange?.(1, pageSize);
  };

  // ==================== 分页组件属性 ====================

  const paginationState = computed<PaginationViewState>(() => {
    const c = config.value;
    return {
      current: currentPage.value,
      pageSize: currentPageSize.value,
      total: paginationTotal.value,
      disabled: c?.disabled ?? false,
      showQuickJumper: c?.showQuickJumper ?? false,
      showSizeChanger: c?.showSizeChanger ?? false,
      pageSizeOptions: c?.pageSizeOptions ?? [10, 20, 50, 100],
      showTotal: c?.showTotal,
    };
  });

  return {
    tanstackPaginationState,
    onTanStackPaginationChange,
    paginationEnabled,
    showPaginationTop,
    showPaginationBottom,
    resolvedPaginationPlacement,
    paginationState,
    currentPage,
    currentPageSize,
    paginationTotal,
    tanstackRowCount,
    tanstackPageCount,
    handlePageChange,
    handlePageSizeChange,
    handlePaginationChange,
    resetPage,
  };
};
