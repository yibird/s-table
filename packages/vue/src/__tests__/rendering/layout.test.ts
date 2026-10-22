import { afterEach, describe, expect, it } from 'vite-plus/test';
import { h, nextTick, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn, STableFooterContext, STableTitleContext } from '../../types';

interface Row {
  id: number;
  name: string;
}

const dataSource: Row[] = [
  { id: 1, name: 'a' },
  { id: 2, name: 'b' },
];

let app: App | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('标题、页脚与汇总栏', () => {
  it('title / footer 函数获得当前页数据与分页信息', async () => {
    const mounted = mountSTable<Row>({
      columns: [{ id: 'id', accessorKey: 'id', header: 'ID' }],
      dataSource,
      pagination: { defaultCurrent: 2, defaultPageSize: 1 },
      title: ({ currentPageData }: STableTitleContext<Row>) =>
        h('span', { class: 'custom-title' }, currentPageData.map((row) => row.id).join(',')),
      footer: ({ currentPageData, currentPage, pageSize, total }: STableFooterContext<Row>) =>
        h(
          'span',
          { class: 'custom-footer' },
          `${currentPage}/${pageSize}/${total}/${currentPageData.length}`
        ),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(host.querySelector('.custom-title')?.textContent).toBe('2');
    expect(host.querySelector('.custom-footer')?.textContent).toBe('2/1/2/1');
  });

  it('未传 title / footer 时不渲染空占位容器', async () => {
    const mounted = mountSTable<Row>({
      columns: [{ id: 'id', accessorKey: 'id', header: 'ID' }],
      dataSource,
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(host.querySelector('.s-table-title')).toBeNull();
    expect(host.querySelector('.s-table-footer')).toBeNull();
  });

  it('footer 插槽获得相同作用域', async () => {
    const mounted = mountSTable<Row>(
      {
        columns: [{ id: 'id', accessorKey: 'id', header: 'ID' }],
        dataSource,
      } as never,
      {
        footer: ({ currentPageData, total }: { currentPageData: Row[]; total: number }) =>
          h('span', { class: 'slot-footer' }, `${currentPageData.length}/${total}`),
      }
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(host.querySelector('.slot-footer')?.textContent).toBe('2/2');
  });

  it('声明式 column.footer 渲染为 tfoot，并支持固定汇总栏', async () => {
    const columns: STableColumn<Row>[] = [
      { id: 'id', accessorKey: 'id', header: 'ID', footer: 'ID 合计' },
      { id: 'name', accessorKey: 'name', header: 'Name', footer: '—' },
    ];
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      summaryFixed: true,
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const footer = host.querySelector<HTMLElement>('.s-table-column-footer')!;
    expect(footer).not.toBeNull();
    expect(footer.classList.contains('s-table-summary-fixed')).toBe(true);
    expect(
      Array.from(footer.querySelectorAll('th')).map((cell) => cell.textContent?.trim())
    ).toEqual(['ID 合计', '—']);
  });

  it('summary 插槽与 summaryFixed=true 组合', async () => {
    const mounted = mountSTable<Row>(
      {
        columns: [{ id: 'id', accessorKey: 'id', header: 'ID' }],
        dataSource,
        summaryFixed: true,
      } as never,
      {
        summary: () => h('tr', { class: 'slot-summary-row' }, [h('td', 'summary')]),
      }
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const summary = host.querySelector<HTMLElement>('tfoot.s-table-summary')!;
    expect(summary.classList.contains('s-table-summary-fixed')).toBe(true);
    expect(host.querySelector('.slot-summary-row')).not.toBeNull();
  });
});
