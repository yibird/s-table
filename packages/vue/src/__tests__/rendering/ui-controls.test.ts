import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, ref, type App } from 'vue';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { Radio, type RadioValue } from '../../ui/radio';

let app: App | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  app?.unmount();
  host?.remove();
  document.querySelectorAll('.s-wave-effect').forEach((node) => node.remove());
  app = null;
  host = null;
  vi.restoreAllMocks();
});

describe('基础控件交互回归', () => {
  it('点击 Checkbox 标签文字只提交一次变', async () => {
    const checked = ref(false);
    const changes: boolean[] = [];
    app = createApp({
      render: () =>
        h(
          Checkbox,
          {
            modelValue: checked.value,
            'onUpdate:modelValue': (value: boolean) => (checked.value = value),
            onChange: (value: boolean) => changes.push(value),
          },
          () => 'Checkbox label'
        ),
    });
    host = document.createElement('div');
    document.body.appendChild(host);
    app.mount(host);

    host.querySelector<HTMLElement>('.s-checkbox-label')!.click();
    await nextTick();

    expect(checked.value).toBe(true);
    expect(changes).toEqual([true]);
  });

  it('Checkbox 波纹使用当前实例的主题色', async () => {
    const originalAnimate = HTMLElement.prototype.animate;
    const animation = { onfinish: null, oncancel: null } as unknown as Animation;
    let receivedKeyframes: Keyframe[] | PropertyIndexedKeyframes | undefined;
    const animate = vi.fn((keyframes: Keyframe[] | PropertyIndexedKeyframes) => {
      receivedKeyframes = keyframes;
      return animation;
    });
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      writable: true,
      value: animate,
    });

    try {
      app = createApp({
        render: () =>
          h(
            'div',
            { style: '--s-primary-color: rgb(255, 0, 128)' },
            h(Checkbox, { modelValue: false })
          ),
      });
      host = document.createElement('div');
      document.body.appendChild(host);
      app.mount(host);

      const checkbox = host.querySelector<HTMLElement>('.s-checkbox')!;
      // happy-dom 不会完整模拟父节点 CSS 自定义属性的继承，直接设置到波纹目标节点。
      checkbox.style.setProperty('--s-primary-color', 'rgb(255, 0, 128)');
      checkbox.click();

      const keyframes = receivedKeyframes as Keyframe[] | undefined;
      expect(keyframes?.[0]?.boxShadow).toContain('rgb(255, 0, 128)');
    } finally {
      if (originalAnimate) {
        Object.defineProperty(HTMLElement.prototype, 'animate', {
          configurable: true,
          writable: true,
          value: originalAnimate,
        });
      } else {
        delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
      }
    }
  });

  it('点击 Radio 标签文字只提交一次变', async () => {
    const value = ref<RadioValue>();
    const changes: Array<RadioValue | undefined> = [];
    app = createApp({
      render: () =>
        h(
          Radio,
          {
            modelValue: value.value,
            value: 'a',
            'onUpdate:modelValue': (next: RadioValue | undefined) => {
              value.value = next;
            },
            onChange: (next: RadioValue | undefined) => {
              changes.push(next);
            },
          },
          () => 'Radio label'
        ),
    });
    host = document.createElement('div');
    document.body.appendChild(host);
    app.mount(host);

    host.querySelector<HTMLElement>('.s-radio-label')!.click();
    await nextTick();

    expect(value.value).toBe('a');
    expect(changes).toEqual(['a']);
  });

  it('按钮点击正常触发 click 事件', async () => {
    const clicks: MouseEvent[] = [];
    app = createApp({
      render: () =>
        h(Button, { onClick: (event: MouseEvent) => clicks.push(event) }, () => 'Action'),
    });
    host = document.createElement('div');
    document.body.appendChild(host);
    app.mount(host);

    const button = host.querySelector<HTMLButtonElement>('button')!;
    button.click();
    await nextTick();

    expect(clicks).toHaveLength(1);
  });

  it('按钮点击后立即卸载时波纹仍挂载到全局动画层', async () => {
    const originalAnimate = HTMLElement.prototype.animate;
    const animation = { onfinish: null, oncancel: null } as unknown as Animation;
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      writable: true,
      value: vi.fn(() => animation),
    });

    try {
      const visible = ref(true);
      app = createApp({
        render: () =>
          visible.value
            ? h(
                Button,
                {
                  style: { borderColor: 'rgb(22, 119, 255)' },
                  onClick: () => (visible.value = false),
                },
                () => 'Close'
              )
            : null,
      });
      host = document.createElement('div');
      document.body.appendChild(host);
      app.mount(host);

      host.querySelector<HTMLButtonElement>('button')!.click();
      await nextTick();

      expect(host.querySelector('button')).toBeNull();
      expect(document.body.querySelector('.s-wave-effect')).not.toBeNull();
    } finally {
      if (originalAnimate) {
        Object.defineProperty(HTMLElement.prototype, 'animate', {
          configurable: true,
          writable: true,
          value: originalAnimate,
        });
      } else {
        delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
      }
    }
  });
});
