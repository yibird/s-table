/**
 * 框架无关的滚动相关工具函数
 *
 * 这些函数可以被不同框架的适配层复用
 */

/**
 * 边缘滚动速度计算参数
 */
export interface EdgeScrollOptions {
  /** 触发自动滚动的边缘感应区宽度（px） */
  edgeThreshold?: number;
  /** 每帧最大滚动步长（px） */
  maxSpeed?: number;
}

const DEFAULT_EDGE_THRESHOLD = 40;
const DEFAULT_MAX_SPEED = 18;

/**
 * 计算某一轴向的滚动速度
 *
 * @param pos - 鼠标在该轴上的坐标（clientX / clientY）
 * @param start - 容器该轴的起始边（left / top）
 * @param end - 容器该轴的结束边（right / bottom）
 * @param options - 滚动速度配置
 * @returns 有符号的滚动速度：负值向起点滚动，正值向终点滚动，0 表示不滚动
 *
 * @example
 * ```ts
 * // 鼠标在容器顶部边缘
 * computeScrollSpeed(105, 100, 500) // -18 (向上滚动)
 *
 * // 鼠标在容器中间
 * computeScrollSpeed(300, 100, 500) // 0 (不滚动)
 *
 * // 鼠标在容器底部边缘
 * computeScrollSpeed(495, 100, 500) // 18 (向下滚动)
 * ```
 */
export function computeScrollSpeed(
  pos: number,
  start: number,
  end: number,
  options: EdgeScrollOptions = {}
): number {
  const edgeThreshold = options.edgeThreshold ?? DEFAULT_EDGE_THRESHOLD;
  const maxSpeed = options.maxSpeed ?? DEFAULT_MAX_SPEED;

  // 接近起始边（上 / 左）→ 反向滚动
  if (pos < start + edgeThreshold) {
    const ratio = (start + edgeThreshold - pos) / edgeThreshold;
    return -Math.ceil(Math.min(ratio, 1) * maxSpeed);
  }

  // 接近结束边（下 / 右）→ 正向滚动
  if (pos > end - edgeThreshold) {
    const ratio = (pos - (end - edgeThreshold)) / edgeThreshold;
    return Math.ceil(Math.min(ratio, 1) * maxSpeed);
  }

  return 0;
}

/**
 * 计算滚动条宽度
 *
 * @param element - 滚动容器元素
 * @returns 滚动条宽度（px）
 *
 * @example
 * ```ts
 * const width = computeScrollbarWidth(container);
 * // Windows Chrome: 17px
 * // macOS overlay: 0px
 * ```
 */
export function computeScrollbarWidth(element: HTMLElement | null | undefined): number {
  if (!element) return 0;
  return Math.max(0, element.offsetWidth - element.clientWidth);
}

/** 默认触底阈值（px）。 */
export const DEFAULT_SCROLL_TO_BOTTOM_OFFSET = 50;

/**
 * 归一化用户配置的触底阈值。
 *
 * 仅接受有限且非负的数值，否则回退为默认值。
 *
 * @example
 * ```ts
 * normalizeScrollToBottomOffset(undefined) // 50
 * normalizeScrollToBottomOffset(80)        // 80
 * normalizeScrollToBottomOffset(-1)        // 50
 * ```
 */
export function normalizeScrollToBottomOffset(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : DEFAULT_SCROLL_TO_BOTTOM_OFFSET;
}
