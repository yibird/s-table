export type ScheduledAnimationFrame = {
  cancel: () => void;
};

/**
 * 将浏览器布局相关回调推迟到下一帧；测试和 SSR 环境没有 rAF 时用微任务降级。
 * 统一调度入口让观察器回调具备相同的合帧与取消语义，避免各 Hook 各自维护一套。
 */
export const scheduleAnimationFrame = (callback: FrameRequestCallback): ScheduledAnimationFrame => {
  if (
    typeof globalThis.requestAnimationFrame === 'function' &&
    typeof globalThis.cancelAnimationFrame === 'function'
  ) {
    const frameId = globalThis.requestAnimationFrame(callback);
    return { cancel: () => globalThis.cancelAnimationFrame(frameId) };
  }

  let cancelled = false;
  const run = () => {
    if (!cancelled) callback(0);
  };
  if (typeof globalThis.queueMicrotask === 'function') {
    globalThis.queueMicrotask(run);
    return { cancel: () => (cancelled = true) };
  }

  const timeoutId = globalThis.setTimeout(run, 0);
  return {
    cancel: () => {
      cancelled = true;
      globalThis.clearTimeout(timeoutId);
    },
  };
};
