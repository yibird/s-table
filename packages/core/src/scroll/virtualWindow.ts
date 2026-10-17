export const DEFAULT_OVERSCAN = 15;
export const MAX_OVERSCAN = 100;
export const MIN_ROW_HEIGHT = 20;
export const DEFAULT_ESTIMATE_SIZE = 47;

/** 解析 overscan：非负整数，默认 15，上限 100。 */
export const resolveOverscan = (value: number | undefined): number => {
  const resolved =
    typeof value === 'number' && Number.isFinite(value) && value >= 0
      ? Math.trunc(value)
      : DEFAULT_OVERSCAN;
  return Math.min(resolved, MAX_OVERSCAN);
};

/** 解析固定行高：有限正数且不低于 20；未配置返回 null。 */
export const resolveFixedRowHeight = (value: number | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.max(value, MIN_ROW_HEIGHT)
    : null;

/** 估算行高：固定行高优先，否则取用户配置的有限正数，最后回退 47。 */
export const resolveEstimateSize = (
  value: number | undefined,
  fixedRowHeight: number | null
): number => {
  if (fixedRowHeight != null) return fixedRowHeight;
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_ESTIMATE_SIZE;
};

/** 由虚拟项计算上下 spacer 高度。 */
export const resolveSpacerHeights = (
  items: readonly { start: number; end: number }[],
  totalSize: number
): { top: number; bottom: number } => {
  if (items.length === 0) return { top: 0, bottom: 0 };
  return {
    top: items[0]!.start,
    bottom: totalSize - items[items.length - 1]!.end,
  };
};
