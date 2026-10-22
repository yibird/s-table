import { afterEach, describe, expect, it } from 'vite-plus/test';
import { h, nextTick, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { PaginationPlacement, STableColumn } from '../../types';

interface Row {
  id: number;
}

let app: App | null = null;
let host: HTMLElement | null = null;

const columns: STableColumn<Row>[] = [{ id: 'id', accessorKey: 'id', header: 'ID' }];
const dataSource = Array.from({ length: 20 }, (_, index) => ({ id: index + 1 }));

const placements: PaginationPlacement[] = [
  'topStart',
  'topCenter',
  'topEnd',
  'bottomStart',
  'bottomCenter',
  'bottomEnd',
];

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('pagination placement', () => {
  it('支持多个 placement 同时渲染顶部和底部分页', async () => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      pagination: true,
      paginationPlacement: ['topEnd', 'bottomStart', 'topEnd'],
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const wrappers = Array.from(host.querySelectorAll<HTMLElement>('.s-table-pagination-wrapper'));
    expect(wrappers.map((wrapper) => wrapper.className)).toEqual([
      's-table-pagination-wrapper s-table-pagination-wrapper-topEnd',
      's-table-pagination-wrapper s-table-pagination-wrapper-bottomStart',
    ]);
  });

  it('itemRender 替换分页条目内容', async () => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      pagination: {
        itemRender: (page, type, fallback) =>
          type === 'page' ? h('span', { class: 'custom-page' }, String(page)) : fallback,
      },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(host.querySelector('.custom-page')?.textContent).toBe('1');
  });

  it('simple 模式只保留上一页/下一页与页码信息', async () => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      pagination: { simple: true },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(host.querySelector('.s-pagination-simple-pager')?.textContent?.replace(/\s/g, '')).toBe(
      '1/2'
    );
    expect(host.querySelector('.s-pagination-jump-next')).toBeNull();
  });

  it('hideOnSinglePage 在只有一页时隐藏分页器', async () => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource: dataSource.slice(0, 5),
      pagination: { hideOnSinglePage: true },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(host.querySelector('.s-table-pagination-wrapper')).toBeNull();
  });

  it.each(placements)('uses semantic placement class for %s', async (placement) => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      pagination: true,
      paginationPlacement: placement,
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const root = host.querySelector<HTMLElement>('.s-table')!;
    const wrapper = root.querySelector<HTMLElement>('.s-table-pagination-wrapper')!;
    const scrollShell = root.querySelector<HTMLElement>('.s-table-scroll-shell')!;
    const children = Array.from(root.children);

    expect(wrapper.classList.contains(`s-table-pagination-wrapper-${placement}`)).toBe(true);
    expect(wrapper.hasAttribute('style')).toBe(false);
    expect(children.indexOf(wrapper) < children.indexOf(scrollShell)).toBe(
      placement.startsWith('top')
    );
  });
});
