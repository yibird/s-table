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
 * 滚动边界检测结果
 */
export interface ScrollBoundary {
  /** 是否在左边缘 */
  atLeft: boolean;
  /** 是否在右边缘 */
  atRight: boolean;
  /** 是否在顶部边缘 */
  atTop: boolean;
  /** 是否在底部边缘 */
  atBottom: boolean;
  /** 最大横向滚动距离 */
  maxScrollLeft: number;
  /** 最大纵向滚动距离 */
  maxScrollTop: number;
}

/**
 * 滚动边界检测选项
 */
export interface ScrollBoundaryOptions {
  /** 边缘判定误差（px），用于处理小数像素 */
  epsilon?: number;
}

const DEFAULT_EPSILON = 1;

/**
 * 检测滚动容器的边界状态
 *
 * @param element - 滚动容器元素
 * @param options - 检测选项
 * @returns 边界状态
 *
 * @example
 * ```ts
 * const boundary = detectScrollBoundary(container);
 * if (boundary.atLeft) {
 *   console.log('已滚动到最左侧');
 * }
 * if (boundary.atBottom) {
 *   console.log('已滚动到底部');
 * }
 * ```
 */
export function detectScrollBoundary(
  element: HTMLElement | null | undefined,
  options: ScrollBoundaryOptions = {}
): ScrollBoundary {
  const epsilon = options.epsilon ?? DEFAULT_EPSILON;

  if (!element) {
    return {
      atLeft: false,
      atRight: false,
      atTop: false,
      atBottom: false,
      maxScrollLeft: 0,
      maxScrollTop: 0,
    };
  }

  const scrollLeft = Math.max(0, element.scrollLeft);
  const scrollTop = Math.max(0, element.scrollTop);
  const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
  const maxScrollTop = Math.max(0, element.scrollHeight - element.clientHeight);

  return {
    atLeft: scrollLeft <= epsilon,
    atRight: maxScrollLeft - scrollLeft <= epsilon,
    atTop: scrollTop <= epsilon,
    atBottom: maxScrollTop - scrollTop <= epsilon,
    maxScrollLeft,
    maxScrollTop,
  };
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

/**
 * 计算距离底部的距离
 *
 * @param element - 滚动容器元素
 * @returns 距离底部的距离（px），负值表示已超出底部
 */
export function computeDistanceFromBottom(element: HTMLElement | null | undefined): number {
  if (!element) return 0;
  const maxScrollTop = Math.max(0, element.scrollHeight - element.clientHeight);
  return maxScrollTop - element.scrollTop;
}

/**
 * 检查是否滚动到底部
 *
 * @param element - 滚动容器元素
 * @param offset - 触底阈值（px）
 * @returns 是否已触底
 */
export function isScrolledToBottom(
  element: HTMLElement | null | undefined,
  offset: number = 0
): boolean {
  if (!element) return false;
  const distance = computeDistanceFromBottom(element);
  return distance <= offset;
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
