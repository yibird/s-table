export const DEFAULT_PAGE_SIZE = 10;

/** 将页码或页大小规范为大于零的整数。 */
export const normalizePositiveInteger = (value: number | undefined, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(1, Math.trunc(value));
};

/** 将总条数规范为非负整数，无效值回退为零。 */
export const normalizeTotal = (value: number | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;
  return Math.trunc(value);
};

/** 由总数与页大小推导页数（至少 1 页）。 */
export const resolvePageCount = (total: number, pageSize: number): number =>
  Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

/**
 * 解析分页视图总条数：
 * 显式 total 优先；仅有 pageCount 时用 pageCount × pageSize 反推下界；否则使用过滤后行数。
 */
export const resolvePaginationTotal = (options: {
  configuredTotal?: number;
  configuredPageCount?: number;
  filteredTotal: number;
  pageSize: number;
}): number => {
  const { configuredTotal, configuredPageCount, filteredTotal, pageSize } = options;
  if (typeof configuredTotal === 'number') return normalizeTotal(configuredTotal);
  if (typeof configuredPageCount === 'number') {
    return normalizeTotal(configuredPageCount) * Math.max(1, pageSize);
  }
  return normalizeTotal(filteredTotal);
};

/** 将 1-based 页码夹紧到有效范围，转换为 TanStack 的 0-based pageIndex。 */
export const resolveTanStackPagination = (options: {
  requestedPage: number;
  pageSize: number;
  total: number;
}): { pageIndex: number; pageSize: number } => {
  const pageSize = Math.max(1, options.pageSize);
  const maxPageIndex = Math.max(0, resolvePageCount(options.total, pageSize) - 1);
  return {
    pageIndex: Math.min(Math.max(0, options.requestedPage - 1), maxPageIndex),
    pageSize,
  };
};

/**
 * 页大小变化后的分页落点：保持当前页，但不超出新页大小下的最大页。
 * 返回 1-based page 与规范化后的 pageSize。
 */
export const resolvePageSizeChange = (options: {
  currentPage: number;
  currentPageSize: number;
  nextPageSize: number;
  total: number;
  configuredPageCount?: number;
}): { page: number; pageSize: number } => {
  const pageSize = normalizePositiveInteger(options.nextPageSize, options.currentPageSize);
  if (typeof options.configuredPageCount === 'number') {
    const maxPage = normalizePositiveInteger(options.configuredPageCount, 1);
    return { page: Math.min(options.currentPage, maxPage), pageSize };
  }
  const maxPage = resolvePageCount(options.total, pageSize);
  return { page: Math.min(options.currentPage, maxPage), pageSize };
};

/** 非受控模式下的页码越界修正：仅当页码超过最大页时返回新页码，否则返回原值。 */
export const clampPage = (page: number, total: number, pageSize: number): number =>
  Math.min(page, resolvePageCount(total, pageSize));
