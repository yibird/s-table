import { afterEach, describe, expect, it } from 'vite-plus/test';
import { nextTick, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn } from '../../types';

interface Row {
  id: number;
  name: string;
}

let app: App | null = null;
let host: HTMLElement | null = null;

const columns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Name',
    ellipsis: true,
    tooltip: true,
    sorter: true,
  },
];

afterEach(() => {
  app?.unmount();
  host?.remove();
  document.querySelectorAll('.s-table-tooltip').forEach((element) => element.remove());
  app = null;
  host = null;
});

const mount = async (props: Record<string, unknown> = {}) => {
  const mounted = mountSTable<Row>({
    columns,
    dataSource: [{ id: 1, name: 'a very long value' }],
    rowKey: 'id',
    ...props,
  } as never);
  app = mounted.app;
  host = mounted.host;
  await nextTick();
};

describe('ellipsis 与 Tooltip', () => {
  it('ellipsis 应用于表头和单元格', async () => {
    await mount();
    expect(host!.querySelector('td[data-column-id="name"]')!.classList).toContain(
      's-table-cell-ellipsis'
    );
    expect(
      host!.querySelector('th[data-column-id="name"] .s-table-cell-title')!.classList
    ).toContain('s-table-cell-title-ellipsis');
  });

  it('仅在内容溢出时显示 Tooltip', async () => {
    await mount();
    const cell = host!.querySelector<HTMLElement>('td[data-column-id="name"]')!;

    // 未溢出：不应出现浮层。
    cell.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await nextTick();
    expect(document.querySelector('.s-table-tooltip')).toBeNull();

    Object.defineProperty(cell, 'scrollWidth', { value: 200, configurable: true });
    Object.defineProperty(cell, 'clientWidth', { value: 100, configurable: true });
    cell.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await nextTick();

    const tooltip = document.querySelector<HTMLElement>('.s-table-tooltip');
    expect(tooltip?.textContent).toBe('a very long value');

    cell.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
    await nextTick();
    expect(document.querySelector('.s-table-tooltip')).toBeNull();
  });

  it('ellipsis 不自动生成原生 title，title 由 customCell / customHeaderCell 控制', async () => {
    const mounted = mountSTable<Row>({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID' },
        {
          id: 'name',
          accessorKey: 'name',
          header: 'Name',
          ellipsis: true,
        },
      ],
      dataSource: [{ id: 1, name: 'a very long value' }],
      rowKey: 'id',
      customCell: (_record: Row, _index: number, column: STableColumn<Row>) =>
        column.id === 'name' ? { title: '自定义单元格' } : undefined,
      customHeaderCell: (column: STableColumn<Row>) =>
        column.id === 'name' ? { title: '自定义表头' } : undefined,
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(
      host.querySelector<HTMLElement>('td[data-column-id="name"]')!.getAttribute('title')
    ).toBe('自定义单元格');
    expect(
      host.querySelector<HTMLElement>('th[data-column-id="name"]')!.getAttribute('title')
    ).toBe('自定义表头');
  });

  it('滚动后立即隐藏 Tooltip，避免虚拟行复用后指向过期内容', async () => {
    await mount();
    const cell = host!.querySelector<HTMLElement>('td[data-column-id="name"]')!;
    Object.defineProperty(cell, 'scrollWidth', { value: 200, configurable: true });
    Object.defineProperty(cell, 'clientWidth', { value: 100, configurable: true });
    cell.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await nextTick();
    expect(document.querySelector('.s-table-tooltip')).not.toBeNull();

    host!.querySelector<HTMLElement>('.s-table-container')!.dispatchEvent(new Event('scroll'));
    await nextTick();
    expect(document.querySelector('.s-table-tooltip')).toBeNull();
  });
});
