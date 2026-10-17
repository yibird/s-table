export interface FlipAnimationOptions {
  /** 动画容器 getter，例如 thead 或 tbody。 */
  getContainer: () => HTMLElement | null;
  selector: string;
  axis: 'x' | 'y';
  getKey: (element: HTMLElement, index: number) => string | undefined;
  duration?: number;
  maxElements?: number;
}

export interface FlipAnimation {
  capturePositions(): Map<string, number>;
  animate(oldPositions: Map<string, number>): void;
  cancel(): void;
}

/** 框架无关的 DOM FLIP 动画实现；生命周期清理由调用方负责。 */
export const createFlipAnimation = ({
  getContainer,
  selector,
  axis,
  getKey,
  duration = 200,
  maxElements = 100,
}: FlipAnimationOptions): FlipAnimation => {
  let cleanup: (() => void) | undefined;

  const capturePositions = (): Map<string, number> => {
    const container = getContainer();
    const map = new Map<string, number>();
    if (!container) return map;
    const elements = container.querySelectorAll<HTMLElement>(selector);
    if (elements.length > maxElements) return map;
    elements.forEach((element, index) => {
      const key = getKey(element, index);
      if (key === undefined) return;
      const rect = element.getBoundingClientRect();
      map.set(key, axis === 'x' ? rect.left : rect.top);
    });
    return map;
  };

  const animate = (oldPositions: Map<string, number>) => {
    cleanup?.();
    cleanup = undefined;

    const container = getContainer();
    if (!container) return;
    const elements = container.querySelectorAll<HTMLElement>(selector);
    if (elements.length > maxElements) return;
    const moved: Array<{ element: HTMLElement; delta: number }> = [];

    // 先批量读布局，再批量写样式，避免循环中交错读写触发多次同步回流。
    elements.forEach((element, index) => {
      const key = getKey(element, index);
      if (key === undefined) return;
      const oldPosition = oldPositions.get(key);
      if (oldPosition === undefined) return;
      const rect = element.getBoundingClientRect();
      const newPosition = axis === 'x' ? rect.left : rect.top;
      const delta = oldPosition - newPosition;
      if (Math.abs(delta) >= 1) moved.push({ element, delta });
    });

    if (moved.length === 0) return;
    const transform = axis === 'x' ? 'translateX' : 'translateY';
    for (const { element, delta } of moved) {
      element.style.transition = 'none';
      element.style.willChange = 'transform';
      element.style.transform = `${transform}(${delta}px)`;
    }

    // 提交 Invert 状态后再切换到 Play 状态。
    container.getBoundingClientRect();
    for (const { element } of moved) {
      element.style.transition = `transform ${duration}ms ease`;
      element.style.transform = '';
    }

    let cleaned = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const firstElement = moved[0]!.element;
    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName === 'transform') doCleanup();
    };
    const doCleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (timer !== undefined) clearTimeout(timer);
      firstElement.removeEventListener('transitionend', handleTransitionEnd);
      firstElement.removeEventListener('transitioncancel', doCleanup);
      for (const { element } of moved) {
        element.style.transition = '';
        element.style.transform = '';
        element.style.willChange = '';
      }
      if (cleanup === doCleanup) cleanup = undefined;
    };

    firstElement.addEventListener('transitionend', handleTransitionEnd);
    firstElement.addEventListener('transitioncancel', doCleanup);
    timer = setTimeout(doCleanup, duration + 50);
    cleanup = doCleanup;
  };

  const cancel = () => cleanup?.();
  return { capturePositions, animate, cancel };
};
