export interface SortEntry<Order extends string = string> {
  columnId: string;
  order: Order;
}

/** 两套排序状态是否逐项一致（用于避免无意义的响应式更新 / 事件派发）。 */
export const sameSortEntries = (left: readonly SortEntry[], right: readonly SortEntry[]): boolean =>
  left.length === right.length &&
  left.every(
    (item, index) => item.columnId === right[index]?.columnId && item.order === right[index]?.order
  );

/**
 * 计算点击列头后的排序状态（none → ascend → descend → none）。
 *
 * `directions` 为空表示该列不可排序；`multi` 为 false 时只保留当前列。
 * 默认方向循环完全无状态，便于各框架适配层共享。
 */
export const toggleSortEntry = <Order extends string>(
  current: readonly SortEntry<Order>[],
  columnId: string,
  directions: readonly Order[],
  multi = false
): SortEntry<Order>[] => {
  const existingIndex = current.findIndex((item) => item.columnId === columnId);
  const existing = existingIndex >= 0 ? current[existingIndex] : undefined;
  const currentIndex = existing ? directions.indexOf(existing.order) : -1;
  const nextOrder =
    directions.length === 0 || currentIndex === directions.length - 1
      ? undefined
      : (directions[currentIndex + 1] ?? directions[0]);

  const next = multi ? current.map((item) => ({ ...item })) : [];
  const nextIndex = next.findIndex((item) => item.columnId === columnId);
  if (!nextOrder) {
    if (nextIndex >= 0) next.splice(nextIndex, 1);
  } else if (nextIndex >= 0) {
    next[nextIndex] = { columnId, order: nextOrder };
  } else {
    next.push({ columnId, order: nextOrder });
  }
  return next;
};

/** 移除已不再支持排序的列（列定义删除或 sorter 关闭）。 */
export const removeInvalidSortEntries = <Order extends string>(
  current: readonly SortEntry<Order>[],
  isValid: (columnId: string) => boolean
): SortEntry<Order>[] => current.filter((item) => isValid(item.columnId));
