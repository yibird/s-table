import type { STableSortOrder } from '../types';

/** TanStack 排序方向 → STable 公开排序方向。 */
export const toSTableSortOrder = (order: 'asc' | 'desc' | false): STableSortOrder | null =>
  order === 'asc' ? 'ascend' : order === 'desc' ? 'descend' : null;
