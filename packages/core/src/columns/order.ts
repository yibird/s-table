import { moveArrayItem } from '../interaction/drag';

/**
 * 规范化列顺序：
 * 1. 保留 nextOrder 中仍存在且不重复的 ID；
 * 2. 按 sourceIds 声明顺序补入缺失 ID。
 */
export const normalizeColumnOrder = <TId extends string>(
  nextOrder: readonly TId[],
  sourceIds: readonly TId[]
): TId[] => {
  const sourceSet = new Set(sourceIds);
  const result: TId[] = [];
  const seen = new Set<TId>();
  for (const id of nextOrder) {
    if (!sourceSet.has(id) || seen.has(id)) continue;
    result.push(id);
    seen.add(id);
  }
  for (const id of sourceIds) {
    if (seen.has(id)) continue;
    result.push(id);
    seen.add(id);
  }
  return result;
};

/** 交换两列；任一 ID 不存在或相同则返回原顺序。 */
export const swapColumnOrder = <TId extends string>(
  order: readonly TId[],
  columnIdA: TId,
  columnIdB: TId
): readonly TId[] => {
  if (columnIdA === columnIdB) return order;
  const next = [...order];
  const indexA = next.indexOf(columnIdA);
  const indexB = next.indexOf(columnIdB);
  if (indexA < 0 || indexB < 0) return order;
  [next[indexA], next[indexB]] = [next[indexB]!, next[indexA]!];
  return next;
};

/** 将一列移动到目标列之前，保留其他列的相对顺序。 */
export const moveColumnOrder = <TId extends string>(
  order: readonly TId[],
  columnId: TId,
  targetColumnId: TId
): readonly TId[] => {
  if (columnId === targetColumnId) return order;
  const next = [...order];
  const fromIndex = next.indexOf(columnId);
  if (fromIndex < 0) return order;
  next.splice(fromIndex, 1);
  const targetIndex = next.indexOf(targetColumnId);
  if (targetIndex < 0) return order;
  next.splice(targetIndex, 0, columnId);
  return next;
};

/** 按索引移动列；越界或相同索引返回原顺序。 */
export const moveColumnOrderByIndex = <TId extends string>(
  order: readonly TId[],
  fromIndex: number,
  toIndex: number
): readonly TId[] => {
  if (
    !Number.isInteger(fromIndex) ||
    !Number.isInteger(toIndex) ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= order.length ||
    toIndex >= order.length ||
    fromIndex === toIndex
  ) {
    return order;
  }
  return moveArrayItem(order, fromIndex, toIndex);
};
