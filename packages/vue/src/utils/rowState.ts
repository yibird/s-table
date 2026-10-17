import type { Row, RowData, TableFeatures } from '@tanstack/vue-table';
import type { STableRowKey } from '../types';
import { decodeRowKey } from './resolveRowKey';

type STableRow<TData extends RowData> = Row<TableFeatures, TData>;

export type STableRowStateEntry<TData extends RowData> = {
  key: STableRowKey;
  row?: STableRow<TData>;
};

type STableRowModel<TData extends RowData> = {
  rowsById: Record<string, STableRow<TData>>;
  flatRows: readonly STableRow<TData>[];
};

const compareRowPaths = (left: readonly number[], right: readonly number[]) => {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index++) {
    const difference = left[index]! - right[index]!;
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
};

/** 将 TanStack 状态 ID 按原始树结构顺序转换为公开行键。 */
export const resolveRowStateEntries = <TData extends RowData>(
  state: Readonly<Record<string, boolean | undefined>>,
  model: STableRowModel<TData> | undefined,
  preserveMissing: boolean
): STableRowStateEntry<TData>[] => {
  const rowsById = model?.rowsById ?? {};
  const activeIds = Object.keys(state).filter((id) => state[id]);
  const entries: STableRowStateEntry<TData>[] = [];
  const flatRows = model?.flatRows ?? [];

  const scanRowsInOrder =
    activeIds.length >= 64 && activeIds.length * Math.log2(activeIds.length) >= flatRows.length;
  if (scanRowsInOrder) {
    for (const row of flatRows) {
      if (state[row.id]) entries.push({ key: decodeRowKey(row.id), row });
    }
    if (preserveMissing) {
      for (const id of activeIds) {
        if (!rowsById[id]) entries.push({ key: decodeRowKey(id) });
      }
    }
    return entries;
  }

  for (const id of activeIds) {
    const row = rowsById[id];
    if (row) entries.push({ key: decodeRowKey(row.id), row });
    else if (preserveMissing) entries.push({ key: decodeRowKey(id) });
  }

  if (entries.length <= 1) return entries;

  const pathCache = new WeakMap<STableRow<TData>, number[]>();
  const getPath = (row: STableRow<TData>) => {
    const cached = pathCache.get(row);
    if (cached) return cached;

    const path: number[] = [];
    let current: STableRow<TData> | undefined = row;
    while (current) {
      path.push(current.index);
      current = current.parentId ? rowsById[current.parentId] : undefined;
    }
    path.reverse();
    pathCache.set(row, path);
    return path;
  };

  entries.sort((left, right) => {
    if (!left.row || !right.row) return left.row ? -1 : right.row ? 1 : 0;
    return compareRowPaths(getPath(left.row), getPath(right.row));
  });
  return entries;
};
