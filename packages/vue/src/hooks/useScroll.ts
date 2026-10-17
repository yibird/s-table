import { onBeforeUnmount, shallowRef, watch, type Ref } from 'vue';
import {
  computeScrollbarWidth,
  computeScrollSpeed,
  normalizeScrollToBottomOffset,
} from '@zchengfeng/s-table-core';
import { getOwnerDocument, getOwnerWindow } from '../utils/dom';

/** 固定列阴影的滚动边缘误差（px）。 */
const SCROLL_EDGE_EPSILON = 1;

type UseSTableScrollAutoScrollOptions = {
  /** 是否处于激活状态（如框选拖拽中），仅在激活时监听并滚动。 */
  active: Readonly<Ref<boolean>>;
  /**
   * 每一帧滚动后回调，携带当前鼠标坐标。
   * 消费方可据此用 `document.elementFromPoint` 反查单元格并更新框选范围。
   */
  onScrollTick?: (mouse: { x: number; y: number }) => void;
};

type UseSTableScrollToBottomOptions = {
  /** 表格内容末尾的 1px 哨兵元素；由 IntersectionObserver 观察其可见性。 */
  sentinel: Readonly<Ref<HTMLElement | null>>;
  /** 只有实际使用触底能力时才注册观察器。 */
  enabled?: Readonly<Ref<boolean>>;
  /** 触底阈值（px），来自 `virtual.scrollToBottomOffset` 或其他配置。 */
  offset?: Readonly<Ref<number | undefined>>;
  /** 滚动触底回调。 */
  onScrollToBottom?: () => void;
};

type UseSTableScrollFixedShadowOptions = {
  /** 只有存在固定列时才监听横向滚动状态。 */
  enabled: Readonly<Ref<boolean>>;
};

/**
 * `useScroll` 的入参约束：三段能力互相独立，按需传入。
 */
export type UseSTableScrollOptions = {
  /** 滚动容器元素 ref（绑定到 `.s-table-container`）。 */
  scrollElementRef: Readonly<Ref<HTMLElement | null>>;
  /** 框选拖拽时的边缘自动滚动。 */
  autoScroll?: UseSTableScrollAutoScrollOptions;
  /** 滚动触底检测。 */
  scrollToBottom?: UseSTableScrollToBottomOptions;
  /** 固定列边缘阴影状态。 */
  fixedColumnShadow?: UseSTableScrollFixedShadowOptions;
};

/**
 * 表格滚动能力聚合 hook：
 *
 * 1. **边缘自动滚动**：`active` 为真时监听 document `mousemove`，鼠标进入容器边缘区后
 *    用 rAF 循环滚动容器，速度随距边缘深度线性增大；每帧通过 `onScrollTick` 回传坐标。
 * 2. **触底检测**：观察内容末尾哨兵与滚动视口的相交状态（IntersectionObserver），
 *    浏览器只在“进入/离开底部区域”的状态翻转时回调，滚动热路径零布局读取、零 JS 参与；
 *    阈值通过 rootMargin 表达。无 IntersectionObserver 的环境降级为滚动事件 + 布局读取。
 * 3. **固定列阴影**：passive scroll 监听只读取 `scrollLeft`（无布局开销）；
 *    ResizeObserver 仅观察容器与表格的横向尺寸变化，通知回调内先用 entry 预计算的
 *    inlineSize 做数值比较，行高类（虚拟化、展开行）的纵向通知直接跳过，
 *    不再像旧实现那样每次内容高度变化都调度 rAF 并强制读取 scrollWidth。
 *
 * 纯数学计算（边缘速度、滚动条宽度、触底阈值归一化）复用 `@zchengfeng/s-table-core`。
 */
export const useScroll = ({
  scrollElementRef,
  autoScroll,
  scrollToBottom,
  fixedColumnShadow,
}: UseSTableScrollOptions) => {
  // ==================== 1. 边缘自动滚动 ====================
  let autoRafId: number | null = null;
  let mouseX = 0;
  let mouseY = 0;
  // 复用的坐标载体：onScrollTick 每帧消费后立即读取，避免每帧分配新对象。
  const tickMouse = { x: 0, y: 0 };

  // 缓存容器 rect：容器自身滚动不会改变其视口边界，因此只在开始拖拽、ref 替换或
  // 窗口 resize 时刷新，避免自动滚动每帧都触发 getBoundingClientRect 强制布局。
  let cachedRect: DOMRect | null = null;

  /** 刷新滚动容器的边界缓存。 */
  const refreshAutoScrollRect = () => {
    cachedRect = scrollElementRef.value?.getBoundingClientRect() ?? null;
  };

  /** 基于缓存 rect 计算当前鼠标位置的 x/y 滚动速度（速度模型在 core 中共享）。 */
  const computeDelta = (): { dx: number; dy: number } => {
    if (!cachedRect) return { dx: 0, dy: 0 };
    return {
      dy: computeScrollSpeed(mouseY, cachedRect.top, cachedRect.bottom),
      dx: computeScrollSpeed(mouseX, cachedRect.left, cachedRect.right),
    };
  };

  /** rAF 循环：仅在鼠标处于边缘感应区（存在非零速度）时持续运行。 */
  const autoScrollTick = () => {
    const el = scrollElementRef.value;
    if (!el) {
      autoRafId = null;
      return;
    }

    const { dx, dy } = computeDelta();

    // 离开边缘区：停止循环，交由 mousemove 在再次进入时重启，避免空转帧。
    if (dx === 0 && dy === 0) {
      autoRafId = null;
      return;
    }

    const previousScrollTop = el.scrollTop;
    const previousScrollLeft = el.scrollLeft;
    if (dy !== 0) el.scrollTop += dy;
    if (dx !== 0) el.scrollLeft += dx;

    // 已到滚动边界时写入不会产生位移；停止 RAF，避免鼠标停在边缘时持续空转。
    if (el.scrollTop === previousScrollTop && el.scrollLeft === previousScrollLeft) {
      autoRafId = null;
      return;
    }

    tickMouse.x = mouseX;
    tickMouse.y = mouseY;
    autoScroll?.onScrollTick?.(tickMouse);

    autoRafId = autoListenerWindow?.requestAnimationFrame(autoScrollTick) ?? null;
  };

  /** 在尚未运行时启动自动滚动帧循环。 */
  const startAutoScroll = () => {
    if (autoRafId === null) {
      autoRafId = autoListenerWindow?.requestAnimationFrame(autoScrollTick) ?? null;
    }
  };

  /** 手动停止自动滚动（结束拖拽时调用）。 */
  const stopAutoScroll = () => {
    if (autoRafId !== null) {
      autoListenerWindow?.cancelAnimationFrame(autoRafId);
      autoRafId = null;
    }
  };

  /** 记录鼠标位置，并按是否进入边缘区启停自动滚动。 */
  const handleAutoScrollMouseMove = (event: MouseEvent) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    // 只有鼠标进入边缘感应区才启动 rAF；否则确保停止，避免空转。
    const { dx, dy } = computeDelta();
    if (dx !== 0 || dy !== 0) {
      startAutoScroll();
    } else {
      stopAutoScroll();
    }
  };

  let autoListenerDocument: Document | undefined;
  let autoListenerWindow: Window | undefined;

  const removeAutoScrollListeners = () => {
    autoListenerDocument?.removeEventListener('mousemove', handleAutoScrollMouseMove);
    autoListenerWindow?.removeEventListener('resize', refreshAutoScrollRect);
    autoListenerDocument = undefined;
    autoListenerWindow = undefined;
  };

  const addAutoScrollListeners = () => {
    const element = scrollElementRef.value;
    if (!element) {
      stopAutoScroll();
      removeAutoScrollListeners();
      return;
    }
    const nextDocument = getOwnerDocument(element);
    const nextWindow = getOwnerWindow(element);
    // 取不到新元素所属的 document/window 时（如元素已脱离文档），
    // 同样先停帧并卸载旧监听，避免保留指向旧文档的陈旧监听器。
    if (!nextDocument || !nextWindow) {
      stopAutoScroll();
      removeAutoScrollListeners();
      return;
    }
    if (autoListenerDocument === nextDocument && autoListenerWindow === nextWindow) return;
    stopAutoScroll();
    removeAutoScrollListeners();
    autoListenerDocument = nextDocument;
    autoListenerWindow = nextWindow;
    autoListenerDocument.addEventListener('mousemove', handleAutoScrollMouseMove, {
      passive: true,
    });
    autoListenerWindow.addEventListener('resize', refreshAutoScrollRect);
  };

  if (autoScroll) {
    // active 变化时挂载/卸载所属文档的监听；容器跨文档替换时同步迁移监听。
    watch(
      [autoScroll.active, scrollElementRef],
      ([isActive]) => {
        if (isActive) {
          refreshAutoScrollRect();
          addAutoScrollListeners();
          return;
        }

        stopAutoScroll();
        removeAutoScrollListeners();
        cachedRect = null;
      },
      { immediate: true }
    );
  }

  // ==================== 2. 触底检测（IntersectionObserver 哨兵） ====================
  const isScrollToBottom = shallowRef(false);
  let bottomObserver: IntersectionObserver | null = null;

  const setBottomReached = (reached: boolean) => {
    if (isScrollToBottom.value === reached) return;
    isScrollToBottom.value = reached;
    if (reached) scrollToBottom?.onScrollToBottom?.();
  };

  const detachScrollToBottom = () => {
    bottomObserver?.disconnect();
    bottomObserver = null;
    isScrollToBottom.value = false;
  };

  const attachScrollToBottom = (
    element: HTMLElement | null,
    sentinel: HTMLElement | null,
    active: boolean
  ) => {
    detachScrollToBottom();
    if (!element || !sentinel || !active) return;

    const offset = normalizeScrollToBottomOffset(scrollToBottom?.offset?.value);
    const observerConstructor =
      (
        getOwnerWindow(element) as
          | (Window & { IntersectionObserver?: typeof IntersectionObserver })
          | undefined
      )?.IntersectionObserver ??
      (typeof IntersectionObserver !== 'undefined' ? IntersectionObserver : undefined);
    if (!observerConstructor) return;

    // rootMargin 把视口下边缘向外扩展触底阈值；哨兵只会在“进入/离开底部区域”
    // 的状态翻转时被回调，内容高度、视口尺寸或滚动位置变化均由浏览器重新求交，
    // 无需任何布局读取或滚动监听。
    const observer = new observerConstructor(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setBottomReached(entry.isIntersecting);
      },
      { root: element, rootMargin: `0px 0px ${offset}px 0px` }
    );
    observer.observe(sentinel);
    bottomObserver = observer;
  };

  if (scrollToBottom) {
    watch(
      () =>
        [
          scrollElementRef.value,
          scrollToBottom.sentinel.value,
          scrollToBottom.enabled?.value ?? true,
          scrollToBottom.offset?.value,
        ] as const,
      ([element, sentinel, active]) => attachScrollToBottom(element, sentinel, active),
      { immediate: true }
    );
  }

  // ==================== 3. 固定列边缘阴影 ====================
  const hasLeftShadow = shallowRef(false);
  const hasRightShadow = shallowRef(false);
  const scrollbarWidth = shallowRef(0);
  let observedElement: HTMLElement | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let maxScrollLeft = 0;
  let metricsFrame: number | null = null;
  let metricsWindow: Window | undefined;
  // RO 通知自带的横向尺寸基线：虚拟化行高变化只产生纵向通知，比较后直接跳过。
  let cachedContainerInlineSize = -1;
  let cachedContentInlineSize = -1;

  const resetShadow = () => {
    hasLeftShadow.value = false;
    hasRightShadow.value = false;
    scrollbarWidth.value = 0;
    maxScrollLeft = 0;
    cachedContainerInlineSize = -1;
    cachedContentInlineSize = -1;
  };

  const syncScrollbarWidth = () => {
    const element = observedElement;
    if (!element) return;

    const nextWidth = computeScrollbarWidth(element);
    if (scrollbarWidth.value !== nextWidth) scrollbarWidth.value = nextWidth;
  };

  const syncShadow = () => {
    const element = observedElement;
    if (!element) return;

    // maxScrollLeft 由 ResizeObserver 在尺寸变化时刷新，滚动热路径只读取 scrollLeft。
    const scrollLeft = Math.max(0, element.scrollLeft);
    hasLeftShadow.value = scrollLeft > SCROLL_EDGE_EPSILON;
    hasRightShadow.value = maxScrollLeft - scrollLeft > SCROLL_EDGE_EPSILON;
  };

  const syncShadowLayout = () => {
    const element = observedElement;
    if (!element) return;

    maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
    syncScrollbarWidth();
    syncShadow();
  };

  const scheduleShadowSync = () => {
    if (metricsFrame !== null) return;
    const ownerWindow = getOwnerWindow(observedElement);
    if (!ownerWindow) return;
    metricsWindow = ownerWindow;
    metricsFrame = ownerWindow.requestAnimationFrame(() => {
      metricsFrame = null;
      metricsWindow = undefined;
      syncShadowLayout();
    });
  };

  /** 读取 RO entry 预计算的横向尺寸；浏览器已按布局批量计算好，不触发同步布局。 */
  const inlineSizeOf = (entry: ResizeObserverEntry): number =>
    entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;

  const handleShadowResize = (entries: readonly ResizeObserverEntry[]) => {
    // 空通知只出现在测试替身或非标准实现中；没有尺寸信息时保持同步降级语义。
    if (entries.length === 0) {
      syncShadowLayout();
      return;
    }
    let inlineSizeChanged = false;
    for (const entry of entries) {
      const inlineSize = inlineSizeOf(entry);
      if (entry.target === observedElement) {
        if (inlineSize !== cachedContainerInlineSize) {
          cachedContainerInlineSize = inlineSize;
          inlineSizeChanged = true;
        }
      } else if (inlineSize !== cachedContentInlineSize) {
        cachedContentInlineSize = inlineSize;
        inlineSizeChanged = true;
      }
    }
    // 只有容器/表格的横向尺寸真正变化（列宽拖拽、视口缩放、滚动条出现）才重测；
    // 虚拟化的行高抖动通知在这里被零成本过滤，不再调度 rAF 或读取布局。
    if (inlineSizeChanged) scheduleShadowSync();
  };

  const handleShadowScroll = () => {
    // 表格总宽由 colgroup / 虚拟 spacer 保持稳定；尺寸变化交给 ResizeObserver。
    // 滚动热路径只读取 scrollLeft，避免每帧重复读取 scrollWidth 触发布局计算。
    syncShadow();
  };

  const detachShadow = () => {
    observedElement?.removeEventListener('scroll', handleShadowScroll);
    if (metricsFrame !== null) metricsWindow?.cancelAnimationFrame(metricsFrame);
    metricsFrame = null;
    metricsWindow = undefined;
    resizeObserver?.disconnect();
    resizeObserver = null;
    observedElement = null;
  };

  const attachShadow = (element: HTMLElement | null, active: boolean) => {
    detachShadow();
    resetShadow();
    if (!element || !active) return;

    observedElement = element;
    element.addEventListener('scroll', handleShadowScroll, { passive: true });
    const resizeObserverConstructor =
      (getOwnerWindow(element) as (Window & { ResizeObserver?: typeof ResizeObserver }) | undefined)
        ?.ResizeObserver ?? (typeof ResizeObserver !== 'undefined' ? ResizeObserver : undefined);
    if (resizeObserverConstructor) {
      // RO 可能在同一布局周期连续通知容器与表格；entry 自带尺寸做过滤，
      // 真正变化时下一帧统一测量，避免 observer 回调内写 Vue 状态触发二次布局。
      const observer = new resizeObserverConstructor(handleShadowResize);
      resizeObserver = observer;
      observer.observe(element);
      if (element.firstElementChild instanceof HTMLElement) {
        observer.observe(element.firstElementChild);
      }
    }
    syncShadowLayout();
  };

  if (fixedColumnShadow) {
    watch(
      () => [scrollElementRef.value, fixedColumnShadow.enabled.value] as const,
      ([element, active]) => attachShadow(element, active),
      { immediate: true }
    );
  }

  onBeforeUnmount(() => {
    stopAutoScroll();
    removeAutoScrollListeners();
    detachScrollToBottom();
    detachShadow();
  });

  return {
    isScrollToBottom,
    hasLeftShadow,
    hasRightShadow,
    scrollbarWidth,
    stopAutoScroll,
  };
};
