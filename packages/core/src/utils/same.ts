/**
 * 逐项比较两个等长数组；内容相同时返回 true。
 * 默认用 Object.is（可区分 -0 / NaN），需要宽松相等时传入自定义比较器。
 */
export const sameValues = <T>(
  left: readonly T[],
  right: readonly T[],
  equals: (leftValue: T, rightValue: T) => boolean = Object.is
): boolean =>
  left.length === right.length && left.every((value, index) => equals(value, right[index]!));

/** 内容相等时保留旧引用，否则返回新值（next 与 previous 类型一致时直接复用）。 */
export const retainIfEqual = <T>(
  previous: T | undefined,
  next: T,
  equals: (left: T, right: T) => boolean
): T => (previous !== undefined && equals(previous, next) ? previous : next);

/** 数组逐项（Object.is）相等时保留旧数组引用。 */
export const retainEqualArray = <T>(
  previous: readonly T[] | undefined,
  next: readonly T[]
): readonly T[] => retainIfEqual(previous, next, (left, right) => sameValues(left, right));
