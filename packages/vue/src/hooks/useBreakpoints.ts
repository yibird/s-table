import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
import type { STableBreakpoint } from '../types';
import { getOwnerWindow } from '../utils';

export const DEFAULT_BREAKPOINTS: Record<STableBreakpoint, number> = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
};

const ORDER: STableBreakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

type ViewportSubscription = {
  width: number;
  subscribers: Set<(width: number) => void>;
  frame: number | null;
  handler: () => void;
};

// 每个 Window 只保留一个 resize 监听，所有表格共享同一份视口宽度。
const viewportRegistry = new WeakMap<Window, ViewportSubscription>();

const subscribeViewport = (ownerWindow: Window, subscriber: (width: number) => void) => {
  let entry = viewportRegistry.get(ownerWindow);
  if (!entry) {
    const nextEntry: ViewportSubscription = {
      width: ownerWindow.innerWidth,
      subscribers: new Set(),
      frame: null,
      handler: () => {
        if (nextEntry.frame !== null) return;
        nextEntry.frame = ownerWindow.requestAnimationFrame(() => {
          nextEntry.frame = null;
          nextEntry.width = ownerWindow.innerWidth;
          for (const callback of nextEntry.subscribers) callback(nextEntry.width);
        });
      },
    };
    ownerWindow.addEventListener('resize', nextEntry.handler, { passive: true });
    viewportRegistry.set(ownerWindow, nextEntry);
    entry = nextEntry;
  }
  entry.subscribers.add(subscriber);
  subscriber(entry.width);

  return () => {
    entry!.subscribers.delete(subscriber);
    if (entry!.subscribers.size > 0) return;
    ownerWindow.removeEventListener('resize', entry!.handler);
    if (entry!.frame !== null) ownerWindow.cancelAnimationFrame(entry!.frame);
    viewportRegistry.delete(ownerWindow);
  };
};

/**
 * 视口断点：首帧/SSR 使用 defaultBreakpoint，挂载后按视口宽度切换。
 * 未配置任何响应式列（`enabled=false`）时不订阅 resize，仅保持默认断点。
 */
export const useBreakpoints = (
  rootRef: Readonly<Ref<HTMLElement | null>>,
  breakpoints: Readonly<Ref<Partial<Record<STableBreakpoint, number>> | undefined>>,
  defaultBreakpoint: Readonly<Ref<STableBreakpoint>>,
  enabled: Readonly<Ref<boolean>> = ref(true)
) => {
  // 防御 HMR / 旧模块图：断点 props 缺失时回退到默认断点而不是抛错白屏。
  const activeBreakpoint = ref<STableBreakpoint>(defaultBreakpoint?.value ?? 'lg');
  let unsubscribe: (() => void) | undefined;

  const resolveBreakpoint = (width: number): STableBreakpoint => {
    const thresholds = { ...DEFAULT_BREAKPOINTS, ...breakpoints?.value };
    let result: STableBreakpoint = 'xs';
    for (const key of ORDER) {
      if (width >= thresholds[key]) result = key;
    }
    return result;
  };

  const applyWidth = (width: number) => {
    const next = resolveBreakpoint(width);
    if (next !== activeBreakpoint.value) activeBreakpoint.value = next;
  };

  const detach = () => {
    unsubscribe?.();
    unsubscribe = undefined;
  };

  const attach = () => {
    detach();
    if (enabled && !enabled.value) {
      activeBreakpoint.value = defaultBreakpoint?.value ?? 'lg';
      return;
    }
    const ownerWindow = getOwnerWindow(rootRef.value);
    if (!ownerWindow) return;
    unsubscribe = subscribeViewport(ownerWindow, applyWidth);
  };

  onMounted(attach);
  watch([rootRef, enabled], attach, { flush: 'post' });
  if (breakpoints && defaultBreakpoint) {
    watch([breakpoints, defaultBreakpoint], () => {
      if (unsubscribe) {
        const ownerWindow = getOwnerWindow(rootRef.value);
        if (ownerWindow) applyWidth(ownerWindow.innerWidth);
      } else {
        activeBreakpoint.value = defaultBreakpoint.value;
      }
    });
  }
  onBeforeUnmount(detach);

  return { activeBreakpoint };
};
