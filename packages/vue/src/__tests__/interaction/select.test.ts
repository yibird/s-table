import { afterEach, describe, expect, it } from 'vite-plus/test';
import { createApp, h, nextTick, ref, type App } from 'vue';
import { Select, type SelectValue } from '../../ui/select';

let app: App | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('Select 下拉交互', () => {
  it('单选值为空时显示 placeholder，不渲染 undefined 文本', () => {
    app = createApp({
      render: () =>
        h(Select, {
          modelValue: undefined,
          placeholder: '请选择',
          options: [{ label: 'A', value: 'a' }],
        }),
    });
    host = document.createElement('div');
    document.body.appendChild(host);
    app.mount(host);

    expect(host.querySelector('.s-select-placeholder')?.textContent?.trim()).toBe('请选择');
    expect(host.textContent).not.toContain('undefined');
  });

  it('多选点Teleport 选项时保持展开，真正点击外部后关闭', async () => {
    const value = ref<SelectValue>([]);
    app = createApp({
      render: () =>
        h(Select, {
          mode: 'multiple',
          modelValue: value.value,
          options: [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' },
          ],
          'onUpdate:modelValue': (next: SelectValue) => {
            value.value = next;
          },
        }),
    });
    host = document.createElement('div');
    document.body.appendChild(host);
    app.mount(host);

    host.querySelector<HTMLElement>('.s-select-selector')!.click();
    await nextTick();
    document.querySelector<HTMLElement>('.s-select-item-option')!.click();
    await nextTick();

    expect(value.value).toEqual(['a']);
    expect(host.querySelector('.s-select')?.classList.contains('s-select-open')).toBe(true);

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(host.querySelector('.s-select')?.classList.contains('s-select-open')).toBe(false);
  });

  it('Teleport 下拉继承触发节点上的主题变量', async () => {
    app = createApp({
      render: () =>
        h(Select, {
          options: [{ label: 'A', value: 'a' }],
        }),
    });
    host = document.createElement('div');
    document.body.appendChild(host);
    app.mount(host);

    const trigger = host.querySelector<HTMLElement>('.s-select-selector')!;
    trigger.style.setProperty('--s-primary-color', '#0f766e');
    trigger.style.setProperty('--s-color-bg-cell', '#ecfdf5');
    trigger.style.setProperty('--s-custom-demo-token', 'custom-value');
    trigger.click();
    await nextTick();

    // 上一个用例关闭的面板可能仍在离场过渡中，排除离场节点。
    const dropdown = document.querySelector<HTMLElement>(
      '.s-select-dropdown:not(.scale-down-leave-active)'
    )!;
    expect(dropdown.style.getPropertyValue('--s-primary-color')).toBe('#0f766e');
    expect(dropdown.style.getPropertyValue('--s-color-bg-cell')).toBe('#ecfdf5');
    expect(dropdown.style.getPropertyValue('--s-custom-demo-token')).toBe('custom-value');
  });

  it('supports roving keyboard selection and combobox semantics', async () => {
    const value = ref<SelectValue>();
    app = createApp({
      render: () =>
        h(Select, {
          modelValue: value.value,
          ariaLabel: 'Page size',
          options: [
            { label: 'Disabled', value: 'disabled', disabled: true },
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' },
          ],
          'onUpdate:modelValue': (next: SelectValue) => {
            value.value = next;
          },
        }),
    });
    host = document.createElement('div');
    document.body.appendChild(host);
    app.mount(host);

    const trigger = host.querySelector<HTMLElement>('.s-select-selector')!;
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await nextTick();

    expect(trigger.getAttribute('aria-label')).toBe('Page size');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
    expect(document.querySelector('.s-select-item-option-active')?.textContent).toContain('A');

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await nextTick();

    expect(value.value).toBe('b');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });
});
