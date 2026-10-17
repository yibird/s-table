import type { STableRowKey } from '../types/row';
import { decodeRowKey } from '../utils/resolveRowKey';

/** 选择规则只依赖「行是否可选」这一最小能力。 */
export interface SelectableRowLike {
  getCanSelect?: () => boolean;
}

/** 按可见顺序选择奇偶位置（0 = 第 1、3、5… 行；1 = 第 2、4、6… 行）。 */
export const selectRowsByParity = <TRow extends SelectableRowLike>(
  rows: readonly TRow[],
  parity: 0 | 1
): TRow[] => {
  const result: TRow[] = [];
  for (let index = parity; index < rows.length; index += 2) {
    const row = rows[index];
    if (row && row.getCanSelect?.() !== false) result.push(row);
  }
  return result;
};

/** 当前页 / 当前行模型内可选择的全部行。 */
export const selectableRows = <TRow extends SelectableRowLike>(rows: readonly TRow[]): TRow[] =>
  rows.filter((row) => row.getCanSelect?.() !== false);

/** 过滤掉数据源中已不存在的行键（`preserveSelectedRowKeys` 为 false 时的语义）。 */
export const filterExistingRowKeys = <TKey extends STableRowKey>(
  keys: readonly TKey[],
  exists: (key: TKey) => boolean
): TKey[] => keys.filter(exists);

/** 行状态对象中有序的行条目。 */
export interface RowStateEntry<TRow> {
  key: STableRowKey;
  row?: TRow;
}

interface RowStateRowLike {
  id: string;
  index: number;
  parentId?: string;
}

interface RowStateModelLike<TRow extends RowStateRowLike> {
  rowsById: Record<string, TRow>;
  flatRows: readonly TRow[];
}

const compareRowPaths = (left: readonly number[], right: readonly number[]): number => {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index++) {
    const difference = left[index]! - right[index]!;
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
};

/**
 * 将 TanStack 风格的行状态 ID 按原始树结构顺序转换为公开行键。
 *
 * 状态对象以字符串 row id 为键；`decodeKey` 默认使用 STable 的 row key 编码。
 */
export const resolveRowStateEntries = <TRow extends RowStateRowLike>(
  state: Readonly<Record<string, boolean | undefined>>,
  model: RowStateModelLike<TRow> | undefined,
  preserveMissing: boolean,
  decodeKey: (rowId: string) => STableRowKey = decodeRowKey
): RowStateEntry<TRow>[] => {
  const rowsById = model?.rowsById ?? {};
  const activeIds = Object.keys(state).filter((id) => state[id]);
  const entries: RowStateEntry<TRow>[] = [];
  const flatRows = model?.flatRows ?? [];

  const scanRowsInOrder =
    activeIds.length >= 64 && activeIds.length * Math.log2(activeIds.length) >= flatRows.length;
  if (scanRowsInOrder) {
    for (const row of flatRows) {
      if (state[row.id]) entries.push({ key: decodeKey(row.id), row });
    }
    if (preserveMissing) {
      for (const id of activeIds) {
        if (!rowsById[id]) entries.push({ key: decodeKey(id) });
      }
    }
    return entries;
  }

  for (const id of activeIds) {
    const row = rowsById[id];
    if (row) entries.push({ key: decodeKey(row.id), row });
    else if (preserveMissing) entries.push({ key: decodeKey(id) });
  }

  if (entries.length <= 1) return entries;

  const pathCache = new WeakMap<TRow, number[]>();
  const getPath = (row: TRow): number[] => {
    const cached = pathCache.get(row);
    if (cached) return cached;

    const path: number[] = [];
    let current: TRow | undefined = row;
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
