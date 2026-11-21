import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { h, nextTick, ref, type App } from 'vue';
import { useTableContent } from '../../setup/useTableContent';
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
  it('静态 title/footer 不读取当前页行，函数内容按需共享当前页快照', () => {
    const getPrePaginatedRowModel = vi.fn(() => ({
      flatRows: dataSource.map((original) => ({ original })),
    }));
    const props = { title: 'Title', footer: 'Footer' } as {
      title: string | ((scope: STableTitleContext<Row>) => string);
      footer: string;
    };
    const content = useTableContent<Row>({
      context: { props, dataSource: ref(dataSource) },
      dataState: {
        paginationEnabled: ref(false),
        currentPage: ref(1),
        currentPageSize: ref(10),
        paginationState: ref({ total: 2 }),
      },
      tableModel: { table: { getPrePaginatedRowModel } },
    } as never);
    expect(content.titleContent.value).toBe('Title');
    expect(content.footerContent.value).toBe('Footer');
    expect(getPrePaginatedRowModel).not.toHaveBeenCalled();
    expect(content.footerScope.value.currentPageData).toEqual(dataSource);
    expect(content.currentPageData.value).toBe(content.footerScope.value.currentPageData);
    expect(getPrePaginatedRowModel).toHaveBeenCalledTimes(1);
  });

  it('受控分页和 manualPagination 的函数与 slot 作用域保持一致，slot 优先', async () => {
    const current = ref(1);
    const manual = ref(false);
    const title = vi.fn(() => 'hidden title');
    const footer = vi.fn(() => 'hidden footer');
    const mounted = mountSTable<Row>(
      () => ({
        columns: [{ id: 'id', accessorKey: 'id' }],
        dataSource,
        pagination: { current: current.value, pageSize: 1, total: 20 },
        manualPagination: manual.value,
        title,
        footer,
      }),
      {
        title: ({ currentPageData }) =>
          h('span', { class: 'slot-title' }, currentPageData.map((row) => row.id).join(',')),
        footer: ({ currentPageData, currentPage, pageSize, total }) =>
          h(
            'span',
            { class: 'slot-footer' },
            `${currentPageData.map((row) => row.id).join(',')}/${currentPage}/${pageSize}/${total}`
          ),
      }
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();
    expect(host.querySelector('.slot-title')?.textContent).toBe('1');
    current.value = 2;
    await nextTick();
    expect(host.querySelector('.slot-title')?.textContent).toBe('2');
    manual.value = true;
    await nextTick();
    expect(host.querySelector('.slot-title')?.textContent).toBe('1,2');
    expect(host.querySelector('.slot-footer')?.textContent).toBe('1,2/2/1/20');
    expect(title).not.toHaveBeenCalled();
    expect(footer).not.toHaveBeenCalled();
  });

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
