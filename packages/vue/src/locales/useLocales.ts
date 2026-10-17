import { computed, inject } from 'vue';
import { defaultLocale, LocaleContextKey } from './index';

/** 获取当前组件树中生效的多语言配置。 */
export const useLocales = () => {
  const context = inject(LocaleContextKey, undefined);
  return context?.locale ?? computed(() => defaultLocale);
};
