import { describe, it, expect, afterEach } from 'vitest';
import { nextTick, reactive, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn, STableEmits, STableInstance } from '../../types';

/**
 * 服务端数据模型（Phase C / 7）回归测试 *
 * 验证 * - manualPagination：组件不再对 dataSource 客户端切片，直接渲染传入的当前页数据 *   total pagination.total 提供以渲染页码 * - sortChange / pageChange 事件在交互时派发，供外部请求后端数据 */

interface Row {
  id: number;
  name: string;
}

let app: App | null = null;
let host: HTMLElement | null = null;

const columns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: 'Name' },
];

const bodyRowCount = (): number => host!.querySelectorAll('tbody tr.s-table-row').length;

const firstColValues = (): string[] =>
  Array.from(host!.querySelectorAll('tbody tr.s-table-row td.s-table-cell:first-child')).map(
    (td) => td.textContent?.trim() ?? ''
  );

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('服务端数据模型 manual*', () => {
  it('manualPagination：只渲染传入的当前页数据，不做客户端切片', async () => {
    // 后端只返回「当前页 2 条，total=100，10 页）
    const pageData: Row[] = [
      { id: 101, name: 'p2-a' },
      { id: 102, name: 'p2-b' },
    ];
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>({
      columns,
      dataSource: pageData,
      rowKey: 'id',
      manualPagination: true,
      pagination: { total: 100, defaultPageSize: 2, defaultCurrent: 2 },
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    // 传入 2 条就渲染 2 条（客户端分页会?pageSize=2、current=2 而裁成空或错位）
    expect(bodyRowCount()).toBe(2);
    expect(firstColValues()).toEqual(['101', '102']);
    expect(instance!.getTanStackTable().getRowCount()).toBe(100);
    expect(instance!.getTanStackTable().getPageCount()).toBe(50);
  });

  it('纵向虚拟化保留客户端分页并消费当前页行模型', async () => {
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>({
      columns,
      dataSource: Array.from({ length: 5 }, (_, index) => ({
        id: index + 1,
        name: `row-${index + 1}`,
      })),
      rowKey: 'id',
      pagination: { defaultPageSize: 2, defaultCurrent: 2 },
      virtual: { x: false, y: true, rowHeight: 47 },
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(host.querySelector('.s-table-pagination-wrapper')).not.toBeNull();
    expect(
      instance!
        .getTanStackTable()
        .getRowModel()
        .rows.map((row) => row.original.id)
    ).toEqual([3, 4]);
    expect(instance!.getTanStackTable().getPageCount()).toBe(3);
  });

  it('纵向虚拟化保留 manualPagination 当前页数据和服务端总量', async () => {
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>({
      columns,
      dataSource: [
        { id: 101, name: 'p2-a' },
        { id: 102, name: 'p2-b' },
      ],
      rowKey: 'id',
      manualPagination: true,
      pagination: { total: 100, defaultPageSize: 2, defaultCurrent: 2 },
      virtual: { x: false, y: true, rowHeight: 47 },
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(host.querySelector('.s-table-pagination-wrapper')).not.toBeNull();
    expect(
      instance!
        .getTanStackTable()
        .getRowModel()
        .rows.map((row) => row.original.id)
    ).toEqual([101, 102]);
    expect(instance!.getTanStackTable().getRowCount()).toBe(100);
    expect(instance!.getTanStackTable().getPageCount()).toBe(50);
  });

  it('pageChange 事件在翻页时派发（携page / pageSize', async () => {
    const events: { page: number; pageSize: number }[] = [];
    const mounted = mountSTable<Row>({
      columns,
      dataSource: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
      rowKey: 'id',
      manualPagination: true,
      pagination: { total: 100, defaultPageSize: 2, defaultCurrent: 1 },
      onPageChange: (payload: { page: number; pageSize: number }) => {
        events.push(payload);
      },
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    // 点击「下一页」按钮（Pagination 组件 next）
    const next = host!.querySelector<HTMLElement>('.s-pagination-next');
    expect(next).not.toBeNull();
    next!.click();
    await nextTick();

    expect(events).toEqual([{ page: 2, pageSize: 2 }]);
  });

  it('sortChange 事件在点击表头排序时派发', async () => {
    const events: STableEmits<Row>['sortChange'][0][] = [];
    const sortableColumns: STableColumn<Row>[] = [
      { id: 'id', accessorKey: 'id', header: 'ID', sorter: true },
      { id: 'name', accessorKey: 'name', header: 'Name' },
    ];
    const state = reactive({ data: [{ id: 1, name: 'a' }] as Row[] });
    const mounted = mountSTable<Row>(
      () =>
        ({
          columns: sortableColumns,
          dataSource: state.data,
          rowKey: 'id',
          manualSorting: true,
          onSortChange: (payload: STableEmits<Row>['sortChange'][0]) => events.push(payload),
        }) as never
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    // 点击第一列表头标题触发排序
    const firstHeader = host!.querySelector<HTMLElement>('thead th .s-table-cell-title');
    expect(firstHeader).not.toBeNull();
    firstHeader!.click();
    await nextTick();

    expect(events.length).toBeGreaterThan(0);
    // 用户交互触发的排序变化携带 reason: 'user'
    expect(events[events.length - 1]).toEqual({
      columnId: 'id',
      order: 'ascend',
      sorting: [{ columnId: 'id', order: 'ascend' }],
      reason: 'user',
    });
  });

  it('排序状态与 reason 原子更新，不沿用上一轮列移除原因', async () => {
    const columns = reactive([
      { id: 'id', accessorKey: 'id', header: 'ID', sorter: true },
      { id: 'name', accessorKey: 'name', header: 'Name' },
    ]) as unknown as STableColumn<Row>[];
    const events: STableEmits<Row>['sortChange'][0][] = [];
    const mounted = mountSTable<Row>(() => ({
      columns,
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
      manualSorting: true,
      onSortChange: (payload: STableEmits<Row>['sortChange'][0]) => events.push(payload),
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const sorter = host.querySelector<HTMLElement>('thead .s-table-column-sorter')!;
    sorter.click();
    await nextTick();
    expect(events.at(-1)).toEqual({
      columnId: 'id',
      order: 'ascend',
      sorting: [{ columnId: 'id', order: 'ascend' }],
      reason: 'user',
    });

    columns.splice(0, 1);
    await nextTick();
    expect(events.at(-1)).toEqual({
      columnId: null,
      order: null,
      sorting: [],
      reason: 'column-removed',
    });

    columns.unshift({
      id: 'name-default',
      accessorKey: 'name',
      header: 'Name default',
      sorter: true,
      defaultSortOrder: 'ascend',
    });
    await nextTick();
    expect(events.at(-1)).toEqual({
      columnId: 'name-default',
      order: 'ascend',
      sorting: [{ columnId: 'name-default', order: 'ascend' }],
      reason: 'user',
    });
  });

  it('manualFiltering：列搜索词通过 filterChange 事件交给服务', async () => {
    const events: Array<{
      filters: Record<string, (string | number | boolean)[]>;
      searches: Record<string, string>;
    }> = [];
    const mounted = mountSTable<Row>({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID' },
        { id: 'name', accessorKey: 'name', header: 'Name', search: true },
      ],
      dataSource: [{ id: 1, name: 'Alice' }],
      rowKey: 'id',
      manualFiltering: true,
      onFilterChange: (payload: {
        filters: Record<string, (string | number | boolean)[]>;
        searches: Record<string, string>;
      }) => events.push(payload),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host.querySelector<HTMLElement>('.s-table-search-trigger')!.click();
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('.s-table-search-input')!;
    input.value = 'alice';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector<HTMLElement>('.s-table-search-dropdown-btn-confirm')!.click();
    await nextTick();

    expect(events.at(-1)).toEqual({ filters: {}, searches: { name: 'alice' } });
  });
});
