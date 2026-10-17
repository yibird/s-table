import type { ComputedRef, InjectionKey } from 'vue';
import type { STableLocale, STableLocaleOverrides } from './types';
import en_US from './en_US';

export type { STableLocale, STableLocaleOverrides } from './types';
export { default as en_US } from './en_US';
export { default as zh_CN } from './zh_CN';

/**
 * Locale 上下文，由 STable provide，子组件 inject。
 */
export interface LocaleContext {
  locale: ComputedRef<STableLocale>;
}

export const LocaleContextKey: InjectionKey<LocaleContext> = Symbol('STableLocaleContext');

/**
 * 默认语言包（英文）。
 */
export const defaultLocale: STableLocale = en_US;

/**
 * 将局部语言覆盖合并到完整基准语言包。
 * 各分支显式合并可维持稳定类型，并防止浅合并导致未覆盖文案变成 undefined。
 */
export const mergeLocale = (
  overrides?: STableLocaleOverrides,
  base: STableLocale = defaultLocale
): STableLocale => {
  if (!overrides) return base;
  return {
    localeName: overrides.localeName ?? base.localeName,
    empty: { ...base.empty, ...overrides.empty },
    filter: { ...base.filter, ...overrides.filter },
    search: { ...base.search, ...overrides.search },
    selection: { ...base.selection, ...overrides.selection },
    pagination: { ...base.pagination, ...overrides.pagination },
    select: { ...base.select, ...overrides.select },
    table: { ...base.table, ...overrides.table },
    accessibility: { ...base.accessibility, ...overrides.accessibility },
  };
};
