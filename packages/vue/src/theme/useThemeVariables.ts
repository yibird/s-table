import { onBeforeUnmount, shallowRef, watch, type Ref } from 'vue';
import { getOwnerWindow } from '../utils/dom';
import { THEME_VARIABLES } from './tokens';

export type STableThemeVariables = Record<`--s-${string}`, string>;

const isThemeVariable = (name: string): name is `--s-${string}` => name.startsWith('--s-');

/**
 * 每个源元素只做一次动态变量名发现（全量枚举 computedStyle 是 O(所有 CSS 属性)）。
 * 自定义 --s-* 变量在应用运行期通常不变，重复打开面板只读取具体值；
 * MutationObserver 在主题属性发生变化时会主动清除该缓存。
 */
const discoveredVariableNames = new WeakMap<HTMLElement, Set<`--s-${string}`>>();

/** 清除源元素的变量名缓存，使后续采集重新发现动态 CSS 变量。 */
export const invalidateThemeVariableCache = (source: HTMLElement | null): void => {
  if (source) discoveredVariableNames.delete(source);
};

export const collectThemeVariables = (source: HTMLElement | null): STableThemeVariables => {
  const ownerWindow = getOwnerWindow(source);
  if (!ownerWindow || !source) return {};

  const computedStyle = ownerWindow.getComputedStyle(source);
  let variableNames = discoveredVariableNames.get(source);
  if (!variableNames) {
    const names = new Set<`--s-${string}`>(THEME_VARIABLES);
    for (let index = 0; index < computedStyle.length; index++) {
      const name = computedStyle.item(index);
      if (isThemeVariable(name)) names.add(name);
    }
    for (let index = 0; index < source.style.length; index++) {
      const name = source.style.item(index);
      if (isThemeVariable(name)) names.add(name);
    }
    variableNames = names;
    discoveredVariableNames.set(source, variableNames);
  } else {
    // Inline style declarations can be added after the first collection. They
    // are cheap to scan and must be included without throwing away the more
    // expensive computed-style discovery cache.
    for (let index = 0; index < source.style.length; index++) {
      const name = source.style.item(index);
      if (isThemeVariable(name)) variableNames.add(name);
    }
  }

  const variables: STableThemeVariables = {};
  for (const name of variableNames) {
    const value =
      computedStyle.getPropertyValue(name).trim() || source.style.getPropertyValue(name).trim();
    if (value) variables[name] = value;
  }

  return variables;
};

export const useThemeVariables = (
  sourceRef: Readonly<Ref<HTMLElement | null>>,
  activeRef?: Readonly<Ref<boolean>>
) => {
  const themeVariables = shallowRef<STableThemeVariables>({});
  let observer: MutationObserver | null = null;

  const syncThemeVariables = () => {
    const source = sourceRef.value;
    invalidateThemeVariableCache(source);
    themeVariables.value = collectThemeVariables(source);
  };

  const stopObserving = () => {
    observer?.disconnect();
    observer = null;
  };

  /**
   * 面板打开期间监听根节点的主题属性变化（data-theme / class / 颜色方案），
   * 主题切换时刷新已 teleport 面板的内联变量，无需关闭再打开。
   */
  const startObserving = () => {
    stopObserving();
    const source = sourceRef.value;
    const root = source?.ownerDocument?.documentElement;
    if (!root) return;
    const ownerWindow = getOwnerWindow(root) as (Window & typeof globalThis) | undefined;
    const Observer =
      ownerWindow?.MutationObserver ??
      (typeof MutationObserver !== 'undefined' ? MutationObserver : undefined);
    if (!Observer) return;
    const nextObserver = new Observer(syncThemeVariables);
    observer = nextObserver;
    nextObserver.observe(root, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'data-color-scheme'],
    });
    if (source !== root) {
      nextObserver.observe(source, { attributes: true, attributeFilter: ['class', 'style'] });
    }
  };

  if (activeRef) {
    watch(
      [activeRef, sourceRef],
      ([active, source]) => {
        if (!active || !source) {
          stopObserving();
          return;
        }
        // 打开期间源元素被替换（如跨文档）时重新采集并迁移观察目标。
        syncThemeVariables();
        startObserving();
      },
      { immediate: true }
    );
  }

  onBeforeUnmount(stopObserving);

  return {
    themeVariables,
    syncThemeVariables,
    themedStyle: themeVariables,
  };
};
