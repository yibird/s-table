import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { createApp, h, nextTick, ref, type App } from 'vue';
import { Button } from '../../ui/button';
import { Checkbox, CheckboxGroup } from '../../ui/checkbox';
import { Radio, RadioGroup, type RadioValue } from '../../ui/radio';
import { Input } from '../../ui/input';
import { SizeContextKey, type SComponentSize } from '../../context/size';
import { SummaryContextKey } from '../../context/summary';
import Resizer from '../../components/header/Resizer.vue';
import SummaryCell from '../../components/summary/SummaryCell.vue';

let app: App | null = null;
let host: HTMLElement | null = null;

const mount = (render: () => unknown, provides: Array<[symbol | string, unknown]> = []) => {
  host = document.createElement('div');
  document.body.appendChild(host);
  app = createApp({ render });
  for (const [key, value] of provides) {
    app.provide(key as never, value as never);
  }
  app.mount(host);
  return host;
};

afterEach(() => {
  app?.unmount();
  host?.remove();
  document.querySelectorAll('.s-wave-effect').forEach((node) => node.remove());
  app = null;
  host = null;
  vi.restoreAllMocks();
});

describe('Button', () => {
  it('点击、禁用与 loading 状态', async () => {
    const clicks: MouseEvent[] = [];
    const disabled = ref(false);
    mount(() =>
      h(
        Button,
        {
          class: 'demo-button',
          type: 'primary',
          disabled: disabled.value,
          onClick: (event: MouseEvent) => clicks.push(event),
        },
        () => 'Save'
      )
    );
    const button = host!.querySelector<HTMLButtonElement>('button')!;
    expect(button.className).toContain('s-btn-primary');
    button.click();
    expect(clicks).toHaveLength(1);

    disabled.value = true;
    await nextTick();
    button.click();
    expect(clicks).toHaveLength(1);
    expect(button.disabled).toBe(true);
  });

  it('loading 阻止点击并渲染图标插槽', () => {
    const clicks: MouseEvent[] = [];
    mount(() =>
      h(
        Button,
        { loading: true, onClick: (event: MouseEvent) => clicks.push(event) },
        {
          default: () => 'Save',
          icon: () => h('span', { class: 'demo-icon' }, 'i'),
        }
      )
    );
    const button = host!.querySelector<HTMLButtonElement>('button')!;
    button.click();
    expect(clicks).toHaveLength(0);
    expect(host!.querySelector('.s-btn-loading-icon')).not.toBeNull();
    expect(host!.querySelector('.demo-icon')).toBeNull();
  });

  it('组件自身 size 优先于表格 Context', () => {
    mount(
      () => h(Button, { size: 'small' }, () => 'x'),
      [[SizeContextKey, ref<SComponentSize>('large')]]
    );
    expect(host!.querySelector('button')!.className).toContain('s-btn-small');
  });
});

describe('Checkbox / Radio', () => {
  it('Checkbox 支持半选、禁用与组切换', async () => {
    const values = ref<(string | number)[]>(['a']);
    mount(() =>
      h(CheckboxGroup, {
        modelValue: values.value,
        options: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' },
          { label: 'C', value: 'c', disabled: true },
        ],
        'onUpdate:modelValue': (next: (string | number)[]) => (values.value = next),
      })
    );
    const boxes = host!.querySelectorAll<HTMLInputElement>('input[type=checkbox]');
    expect(boxes).toHaveLength(3);
    boxes[1]!.closest('label')!.click();
    await nextTick();
    expect(values.value).toEqual(['a', 'b']);
    boxes[2]!.closest('label')!.click();
    await nextTick();
    expect(values.value).toEqual(['a', 'b']);
  });

  it('Checkbox indeterminate 状态同步到原生属性', async () => {
    mount(() => h(Checkbox, { indeterminate: true }));
    const input = host!.querySelector<HTMLInputElement>('input')!;
    expect(input.indeterminate).toBe(true);
    expect(host!.querySelector('.s-checkbox-wrapper')!.className).toContain(
      's-checkbox-wrapper-indeterminate'
    );
  });

  it('Radio allowUncheck 允许取消选择', async () => {
    const changes: unknown[] = [];
    mount(() =>
      h(
        Radio,
        {
          modelValue: 'a',
          value: 'a',
          allowUncheck: true,
          'onUpdate:modelValue': (value: unknown) => changes.push(value),
        },
        () => 'A'
      )
    );
    host!.querySelector('label')!.click();
    expect(changes).toEqual([undefined]);
  });

  it('RadioGroup 只提交当前值', async () => {
    const value = ref<RadioValue>('a');
    mount(() =>
      h(RadioGroup, {
        modelValue: value.value,
        options: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' },
        ],
        'onUpdate:modelValue': (next: RadioValue) => (value.value = next),
      })
    );
    const labels = host!.querySelectorAll('label');
    labels[1]!.click();
    await nextTick();
    expect(value.value).toBe('b');
    expect(host!.querySelectorAll('.s-radio-wrapper-checked')).toHaveLength(1);
  });
});

describe('Input', () => {
  it('同步输入、change、focus/blur 与 maxlength', async () => {
    const value = ref('ab');
    const changes: string[] = [];
    const events: string[] = [];
    mount(() =>
      h(Input, {
        modelValue: value.value,
        maxlength: 5,
        'onUpdate:modelValue': (next: string) => (value.value = next),
        onChange: (next: string) => changes.push(next),
        onFocus: () => events.push('focus'),
        onBlur: () => events.push('blur'),
      })
    );
    const input = host!.querySelector<HTMLInputElement>('input')!;
    expect(input.maxLength).toBe(5);
    input.value = 'abcd';
    input.dispatchEvent(new Event('input'));
    await nextTick();
    expect(value.value).toBe('abcd');
    expect(changes).toEqual(['abcd']);

    input.dispatchEvent(new FocusEvent('focus'));
    input.dispatchEvent(new FocusEvent('blur'));
    expect(events).toEqual(['focus', 'blur']);
    expect(host!.querySelector('.s-input-wrapper-focused')).toBeNull();
  });

  it('allowClear 清空并重新聚焦', async () => {
    const value = ref('abc');
    const clears: string[] = [];
    mount(() =>
      h(Input, {
        modelValue: value.value,
        allowClear: true,
        'onUpdate:modelValue': (next: string) => (value.value = next),
        onClear: () => clears.push('clear'),
      })
    );
    host!.querySelector<HTMLElement>('.s-input-clear')!.click();
    await nextTick();
    expect(value.value).toBe('');
    expect(clears).toEqual(['clear']);
    expect(document.activeElement).toBe(host!.querySelector('input'));
  });

  it('textarea、prefix 与 addon 插槽', () => {
    mount(() =>
      h(
        Input,
        { type: 'textarea', modelValue: 'multi' },
        {
          prefix: () => h('span', { class: 'demo-prefix' }, 'P'),
          addonBefore: () => h('span', { class: 'demo-addon' }, 'A'),
        }
      )
    );
    expect(host!.querySelector('textarea')).not.toBeNull();
    expect(host!.querySelector('.demo-prefix')).not.toBeNull();
    expect(host!.querySelector('.demo-addon')).not.toBeNull();
  });
});

describe('Resizer', () => {
  const makeHeader = (size = 100) => {
    const handler = vi.fn();
    const setColumnSizing = vi.fn();
    const column = {
      id: 'name',
      getCanResize: () => true,
      getIsResizing: () => false,
      getSize: () => size,
      columnDef: { minSize: 50, maxSize: 120 },
    };
    return {
      header: {
        column,
        table: { setColumnSizing },
        getSize: () => size,
        getResizeHandler: () => handler,
      },
      handler,
      setColumnSizing,
    };
  };

  it('鼠标与触摸启动尺寸调整', () => {
    const { header, handler } = makeHeader();
    mount(() => h(Resizer, { header } as never));
    const separator = host!.querySelector<HTMLElement>('[role=separator]')!;
    const mouse = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    separator.dispatchEvent(mouse);
    expect(mouse.defaultPrevented).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(separator.getAttribute('aria-valuenow')).toBe('100');
  });

  it('键盘按步长调整并受 min/max 约束', async () => {
    const { header, setColumnSizing } = makeHeader(115);
    mount(() => h(Resizer, { header } as never));
    const separator = host!.querySelector<HTMLElement>('[role=separator]')!;
    separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    const updater = setColumnSizing.mock.calls[0]![0] as (
      state: Record<string, number>
    ) => Record<string, number>;
    expect(updater({ name: 115 })).toEqual({ name: 120 });

    separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true }));
    const updater2 = setColumnSizing.mock.calls[1]![0] as (
      state: Record<string, number>
    ) => Record<string, number>;
    expect(updater2({ name: 115 })).toEqual({ name: 114 });
  });
});

describe('SummaryCell', () => {
  it('应用列宽、对齐、colspan 与固定列样式', () => {
    mount(
      () => h(SummaryCell, { index: 0, align: 'right', colSpan: 2 }, () => '合计'),
      [
        [
          SummaryContextKey,
          {
            fixedColumnStyles: ref(
              new Map([
                [
                  'a',
                  {
                    className: 'demo-fixed',
                    headerStyle: {},
                    bodyStyle: { background: 'rgb(1, 2, 3)' },
                  },
                ],
              ])
            ),
            visibleLeafColumns: ref([{ id: 'a' }]),
            summaryCellStyles: ref({ color: 'red' }),
            summaryCellClasses: ref('demo-summary-cell'),
          },
        ],
      ]
    );
    const cell = host!.querySelector<HTMLTableCellElement>('td')!;
    expect(cell.textContent?.trim()).toBe('合计');
    expect(cell.getAttribute('colspan')).toBe('2');
    expect(cell.style.textAlign).toBe('right');
    expect(cell.className).toContain('demo-fixed');
    expect(cell.className).toContain('demo-summary-cell');
    expect(cell.style.color).toBe('red');
    expect(cell.style.background).toBe('rgb(1, 2, 3)');
  });
});
