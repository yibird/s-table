import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
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
    const receivedKeyframes: Array<Keyframe[] | PropertyIndexedKeyframes> = [];
    const animate = vi.fn((keyframes: Keyframe[] | PropertyIndexedKeyframes) => {
      receivedKeyframes.push(keyframes);
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

      // 第一次 animate 是 box-shadow 扩散层，颜色应取实例主题色。
      const shadowKeyframes = receivedKeyframes[0] as Keyframe[] | undefined;
      expect(shadowKeyframes?.[0]?.boxShadow).toContain('rgb(255, 0, 128)');
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

  it('已选中的 Radio 仍有波纹反馈，但不重复派发变更', async () => {
    const originalAnimate = HTMLElement.prototype.animate;
    const animation = { onfinish: null, oncancel: null } as unknown as Animation;
    const animate = vi.fn(() => animation);
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      writable: true,
      value: animate,
    });

    try {
      const changes: Array<RadioValue | undefined> = [];
      app = createApp({
        render: () =>
          h(Radio, {
            modelValue: 'a',
            value: 'a',
            onChange: (next: RadioValue | undefined) => changes.push(next),
          }),
      });
      host = document.createElement('div');
      document.body.appendChild(host);
      app.mount(host);

      host.querySelector<HTMLElement>('.s-radio-wrapper')!.click();
      await nextTick();

      // 阴影扩散与透明度淡出各一层动画。
      expect(animate).toHaveBeenCalledTimes(2);
      expect(changes).toEqual([]);
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

  it('波纹节点挂在控件内部，控件卸载时随之移除', async () => {
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

      const button = host.querySelector<HTMLButtonElement>('button')!;
      button.click();
      // 波纹是控件的子节点，不再定位到 body。
      expect(button.querySelector('.s-wave-effect')).not.toBeNull();
      expect(document.body.querySelector(':scope > .s-wave-effect')).toBeNull();

      await nextTick();
      expect(host.querySelector('button')).toBeNull();
      expect(document.querySelector('.s-wave-effect')).toBeNull();
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
