import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { h, nextTick, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn } from '../../types';

interface Row {
  id: number;
  dept: string;
}

const data: Row[] = [
  { id: 1, dept: 'tech' },
  { id: 2, dept: 'product' },
  { id: 3, dept: 'tech' },
];

const filters = [
  { text: '技术部', value: 'tech' },
  { text: '产品部', value: 'product' },
];

let app: App | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  vi.useRealTimers();
  app?.unmount();
  host?.remove();
  document.querySelectorAll('.s-table-filter-dropdown').forEach((node) => node.remove());
  app = null;
  host = null;
});

const mount = async (columns: STableColumn<Row>[], slots?: Record<string, unknown>) => {
  const mounted = mountSTable<Row>({ columns, dataSource: data, rowKey: 'id' }, slots as never);
  app = mounted.app;
  host = mounted.host;
  await nextTick();
  return mounted;
};

const openFilter = async () => {
  host!.querySelector<HTMLElement>('.s-table-filter-trigger')!.click();
  await nextTick();
  return document.querySelector<HTMLElement>('.s-table-filter-dropdown')!;
};

const bodyIds = () =>
  Array.from(host!.querySelectorAll('tbody tr.s-table-row')).map((row) =>
    row.getAttribute('data-row-key')
  );

describe('过滤面板模式统一', () => {
  const baseColumn = (overrides: Partial<STableColumn<Row>>): STableColumn<Row> =>
    ({
      id: 'dept',
      accessorKey: 'dept',
      header: '部门',
      filters,
      onFilter: (value, record) => record.dept === value,
      ...overrides,
    }) as STableColumn<Row>;

  it('多选模式使用 Checkbox、统一 item 类，并依赖 footer 提交', async () => {
    await mount([baseColumn({ filterMode: 'checkbox', filterMultiple: true })]);
    const panel = await openFilter();
    const items = panel.querySelectorAll('.s-table-filter-dropdown-menu-item');
    expect(items).toHaveLength(2);
    expect(items[0]!.querySelector('input[type=checkbox]')).not.toBeNull();
    expect(panel.querySelector('.s-table-filter-dropdown-footer')).not.toBeNull();

    items[0]!.querySelector<HTMLInputElement>('input')!.click();
    await nextTick();
    expect(bodyIds()).toEqual(['1', '2', '3']);

    panel.querySelector<HTMLElement>('.s-table-filter-dropdown-btn-confirm')!.click();
    await nextTick();
    expect(bodyIds()).toEqual(['1', '3']);
  });

  it('单选模式使用 Radio、底部只有重置，点击立即应用并关闭', async () => {
    vi.useFakeTimers();
    await mount([baseColumn({ filterMode: 'checkbox', filterMultiple: false })]);
    const panel = await openFilter();
    const items = panel.querySelectorAll('.s-table-filter-dropdown-menu-item');
    expect(items[0]!.querySelector('input[type=radio]')).not.toBeNull();
    expect(panel.querySelector('.s-table-filter-dropdown-footer')).not.toBeNull();
    expect(panel.querySelector('.s-table-filter-dropdown-btn-reset')).not.toBeNull();
    expect(panel.querySelector('.s-table-filter-dropdown-btn-confirm')).toBeNull();

    items[1]!.querySelector<HTMLInputElement>('input')!.click();
    await nextTick();
    expect(bodyIds()).toEqual(['2']);
    await nextTick();
    await vi.advanceTimersByTimeAsync(20);
    expect(
      document.querySelector('.s-table-filter-dropdown.scale-down-leave-active')
    ).not.toBeNull();

    // 再次打开并点击已选 Radio：取消选择并清空该列过滤。
    await vi.advanceTimersByTimeAsync(50);
    const reopened = await openFilter();
    reopened.querySelector<HTMLInputElement>('input[type=radio]:checked')!.click();
    await nextTick();
    expect(bodyIds()).toEqual(['1', '2', '3']);

    // 底部重置按钮同样清空过滤。
    await vi.advanceTimersByTimeAsync(50);
    const resetPanel = await openFilter();
    resetPanel.querySelectorAll<HTMLInputElement>('input[type=radio]')[1]!.click();
    await nextTick();
    expect(bodyIds()).toEqual(['2']);
    await vi.advanceTimersByTimeAsync(50);
    const clearedPanel = await openFilter();
    clearedPanel.querySelector<HTMLElement>('.s-table-filter-dropdown-btn-reset')!.click();
    await nextTick();
    expect(bodyIds()).toEqual(['1', '2', '3']);
  });

  it('menu 模式与单选 checkbox 保持同一结构', async () => {
    await mount([baseColumn({ filterMode: 'menu' })]);
    const panel = await openFilter();
    const items = panel.querySelectorAll('.s-table-filter-dropdown-menu-item');
    expect(items).toHaveLength(2);
    expect(items[0]!.querySelector('input[type=radio]')).not.toBeNull();
    expect(panel.querySelector('.s-table-filter-dropdown-btn-reset')).not.toBeNull();
    expect(panel.querySelector('.s-table-filter-dropdown-btn-confirm')).toBeNull();
    expect(panel.querySelector('.s-table-filter-dropdown-list')).toBeNull();

    items[0]!.querySelector<HTMLInputElement>('input')!.click();
    await nextTick();
    expect(bodyIds()).toEqual(['1', '3']);
  });

  it('自定义过滤面板通过插槽提交草稿值', async () => {
    await mount([baseColumn({ filterMode: 'custom' })], {
      filterPanel: ({
        setSelectedKeys,
        confirm,
      }: {
        setSelectedKeys: (values: (string | number | boolean)[]) => void;
        confirm: () => void;
      }) =>
        h('div', { class: 'custom-filter-panel' }, [
          h(
            'button',
            {
              class: 'custom-filter-apply',
              type: 'button',
              onClick: () => {
                setSelectedKeys(['product']);
                confirm();
              },
            },
            '只看产品部'
          ),
        ]),
    });
    const panel = await openFilter();
    expect(panel.querySelector('.custom-filter-panel')).not.toBeNull();
    panel.querySelector<HTMLElement>('.custom-filter-apply')!.click();
    await nextTick();
    await nextTick();
    expect(bodyIds()).toEqual(['2']);
  });

  it('filterIcon 函数可替换内置图标', async () => {
    await mount([
      baseColumn({
        filterIcon: ({ column }) => h('span', { class: 'custom-filter-icon' }, column.id),
      }),
    ]);
    expect(host!.querySelector('.s-table-filter-trigger .custom-filter-icon')).not.toBeNull();
  });
});
