import { describe, expect, it } from 'vite-plus/test';
import { computed, createApp, h, nextTick, shallowRef } from 'vue';
import { en_US, LocaleContextKey, type STableLocale } from '../../locales';
import { useLocales } from '../../locales/useLocales';

describe('useLocales', () => {
  it('falls back to the default locale without a provider', () => {
    let locale: ReturnType<typeof useLocales> | undefined;
    const app = createApp({
      setup: () => {
        locale = useLocales();
        return () => h('div');
      },
    });
    const host = document.createElement('div');
    document.body.appendChild(host);

    app.mount(host);

    expect(locale?.value).toBe(en_US);
    app.unmount();
    host.remove();
  });

  it('returns the provided reactive locale', async () => {
    let locale: ReturnType<typeof useLocales> | undefined;
    const providedLocale = shallowRef<STableLocale>(en_US);
    const app = createApp({
      setup: () => {
        locale = useLocales();
        return () => h('div');
      },
    });
    app.provide(LocaleContextKey, { locale: computed(() => providedLocale.value) });
    const host = document.createElement('div');
    document.body.appendChild(host);
    app.mount(host);

    const nextLocale = { ...en_US, localeName: 'zh-CN' };
    providedLocale.value = nextLocale;
    await nextTick();

    expect(locale?.value).toBe(nextLocale);
    app.unmount();
    host.remove();
  });
});
