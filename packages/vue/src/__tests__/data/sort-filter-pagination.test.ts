import { describe, it, expect, afterEach } from 'vite-plus/test';
import { computed, nextTick, reactive, shallowRef, watch, type App } from 'vue';
import { mountSTable } from '../helpers';
import { useSortFilter } from '../../hooks/useSortFilter';
import type { STableColumn } from '../../types';

/**
 * 排序 / 过滤 / 分页迁移TanStack 内置 row model 后的端到端回归测试 */

interface Row {
  id: number;
  name: string;
  dept: string;
}

let app: App | null = null;
let host: HTMLElement | null = null;

const mkData = (): Row[] => [
  { id: 3, name: 'Charlie', dept: 'A' },
  { id: 1, name: 'Alice', dept: 'B' },
  { id: 2, name: 'Bob', dept: 'A' },
  { id: 5, name: 'Eve', dept: 'B' },
  { id: 4, name: 'Dave', dept: 'A' },
];

const getBodyCol = (colIndex: number): string[] => {
  const bodyRows = Array.from(host!.querySelectorAll('tbody tr.s-table-row'));
  return bodyRows.map((tr) => {
    const cells = tr.querySelectorAll('td.s-table-cell');
    return cells[colIndex]?.textContent?.trim() ?? '';
  });
};

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('内置排序/过滤/分页迁移', () => {
  it('列级 sortOrder 是受控状态，用户操作只派发更新且不会改写列配置', async () => {
    const columns = shallowRef<STableColumn<Row>[]>([
      { id: 'id', accessorKey: 'id', sorter: true, sortOrder: 'ascend' },
      { id: 'name', accessorKey: 'name' },
    ]);
    const updates: Array<Array<{ columnId: string; order: 'ascend' | 'descend' }>> = [];
    const state = useSortFilter({
      columns,
      onUpdateSorting: (next) => updates.push(next),
    });

    expect(state.sorting.value).toEqual([{ columnId: 'id', order: 'ascend' }]);

    state.toggleSort('id');
    expect(updates).toEqual([[{ columnId: 'id', order: 'descend' }]]);
    expect(state.sorting.value).toEqual([{ columnId: 'id', order: 'ascend' }]);

    columns.value = [
      { id: 'id', accessorKey: 'id', sorter: true, sortOrder: 'descend' },
      { id: 'name', accessorKey: 'name' },
    ];
    await nextTick();
    expect(state.sorting.value).toEqual([{ columnId: 'id', order: 'descend' }]);

    columns.value = [
      { id: 'id', accessorKey: 'id', sorter: true, sortOrder: null },
      { id: 'name', accessorKey: 'name' },
    ];
    await nextTick();
    expect(state.sorting.value).toEqual([]);
  });

  it('列级 sortOrder 转为非受控时继承最后一次受控快照', async () => {
    const columns = shallowRef<STableColumn<Row>[]>([
      { id: 'id', accessorKey: 'id', sorter: true, sortOrder: 'descend' },
    ]);
    const state = useSortFilter({ columns });

    expect(state.sorting.value).toEqual([{ columnId: 'id', order: 'descend' }]);
    columns.value = [{ id: 'id', accessorKey: 'id', sorter: true }];
    await nextTick();

    expect(state.sorting.value).toEqual([{ columnId: 'id', order: 'descend' }]);
    state.toggleSort('id');
    expect(state.sorting.value).toEqual([]);
  });

  it('相同排序、过滤和搜索输入不会重复触发响应式更', async () => {
    const columns = computed<STableColumn<Row>[]>(() => []);
    const state = useSortFilter({ columns });
    let sortUpdates = 0;
    let filterUpdates = 0;
    let searchUpdates = 0;
    const stops = [
      watch(state.sorting, () => sortUpdates++),
      watch(state.filterState, () => filterUpdates++),
      watch(state.searchState, () => searchUpdates++),
    ];

    state.setSorting([{ columnId: 'name', order: 'ascend' }]);
    state.setFilter('dept', ['A']);
    state.setSearch('name', 'alice');
    await nextTick();
    expect([sortUpdates, filterUpdates, searchUpdates]).toEqual([1, 1, 1]);

    state.setSorting([{ columnId: 'name', order: 'ascend' }]);
    state.setFilter('dept', ['A']);
    state.setSearch('name', 'alice');
    state.clearFilterByColumn('missing');
    state.clearSearchByColumn('missing');
    await nextTick();
    expect([sortUpdates, filterUpdates, searchUpdates]).toEqual([1, 1, 1]);

    stops.forEach((stop) => stop());
  });

  it('排序回调原地修改事件参数不会污染内部状态', () => {
    const columns = computed<STableColumn<Row>[]>(() => [
      { id: 'id', accessorKey: 'id', sorter: true },
    ]);
    const state = useSortFilter({
      columns,
      onUpdateSorting: (sorting) => sorting.splice(0),
      onSortChange: (sorting) => sorting.push({ columnId: 'name', order: 'descend' }),
    });

    state.setSorting([{ columnId: 'id', order: 'ascend' }]);

    expect(state.sorting.value).toEqual([{ columnId: 'id', order: 'ascend' }]);
  });

  it('多列默认排序在初始化时只提交一次完整状态', () => {
    const events: Array<Array<{ columnId: string; order: 'ascend' | 'descend' }>> = [];
    const state = useSortFilter<Row>({
      columns: computed(() => [
        { accessorKey: 'id', sorter: true, defaultSortOrder: 'ascend' as const },
        { accessorKey: 'name', sorter: true, defaultSortOrder: 'descend' as const },
      ]),
      multiSort: computed(() => true),
      onSortChange: (sorting) => events.push(sorting),
    });

    expect(events).toEqual([
      [
        { columnId: 'id', order: 'ascend' },
        { columnId: 'name', order: 'descend' },
      ],
    ]);
    expect(state.sorting.value).toEqual(events[0]);
  });

  it('排序：点sorter id 升序/降序，作用于全量数据', async () => {
    const columns: STableColumn<Row>[] = [
      { id: 'id', accessorKey: 'id', header: 'ID', sorter: (a, b) => a.id - b.id },
      { id: 'name', accessorKey: 'name', header: 'Name' },
    ];
    const mounted = mountSTable<Row>({ columns, dataSource: mkData() });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    // 初始顺序
    expect(getBodyCol(0)).toEqual(['3', '1', '2', '5', '4']);

    // 找到 id 列的 sorter 并点击一次（升序
    const sorter = host.querySelector('thead .s-table-column-sorter') as HTMLElement;
    sorter.click();
    await nextTick();
    expect(getBodyCol(0)).toEqual(['1', '2', '3', '4', '5']);

    // 再点一次（降序）
    sorter.click();
    await nextTick();
    expect(getBodyCol(0)).toEqual(['5', '4', '3', '2', '1']);
  });

  it('排序：sorter=true 使用内置自动排序，点击后数据真正重排', async () => {
    const columns: STableColumn<Row>[] = [
      { id: 'id', accessorKey: 'id', header: 'ID', sorter: true },
      { id: 'name', accessorKey: 'name', header: 'Name' },
    ];
    const mounted = mountSTable<Row>({ columns, dataSource: mkData() });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(getBodyCol(0)).toEqual(['3', '1', '2', '5', '4']);

    const sorter = host.querySelector('thead .s-table-column-sorter') as HTMLElement;
    sorter.click();
    await nextTick();
    // sorter:true 必须真正触发内置排序（回归：此前 enableSorting=false 导致点击无效
    expect(getBodyCol(0)).toEqual(['1', '2', '3', '4', '5']);

    sorter.click();
    await nextTick();
    expect(getBodyCol(0)).toEqual(['5', '4', '3', '2', '1']);
  });

  it('排序表头支持键盘操作并同aria-sort', async () => {
    const columns: STableColumn<Row>[] = [
      { id: 'id', accessorKey: 'id', header: 'ID', sorter: true },
    ];
    const mounted = mountSTable<Row>({ columns, dataSource: mkData() });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const header = host.querySelector<HTMLElement>('thead th[data-column-id="id"]')!;
    const title = header.querySelector<HTMLElement>('.s-table-cell-title-sortable')!;
    expect(header.getAttribute('aria-sort')).toBe('none');
    expect(title.getAttribute('role')).toBe('button');
    expect(title.tabIndex).toBe(0);

    title.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await nextTick();
    expect(header.getAttribute('aria-sort')).toBe('ascending');
    expect(getBodyCol(0)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('过滤：设dept=A 只保留匹配行（多OR', async () => {
    const columns: STableColumn<Row>[] = [
      { id: 'id', accessorKey: 'id', header: 'ID' },
      {
        id: 'dept',
        accessorKey: 'dept',
        header: 'Dept',
        filters: [
          { text: 'A', value: 'A' },
          { text: 'B', value: 'B' },
        ],
        onFilter: (value, record) => record.dept === value,
      },
    ];
    const mounted = mountSTable<Row>({ columns, dataSource: mkData() });
    app = mounted.app;
    host = mounted.host;
    await nextTick();
    expect(getBodyCol(0).length).toBe(5);

    // 验证 onFilter 桥接不报错、渲染正常（列顺序为 id, dept
    expect(getBodyCol(1)).toEqual(['A', 'B', 'A', 'B', 'A']);
  });

  it('过滤：未提供 onFilter 时按 accessor 值精确匹配且不抛', async () => {
    const columns: STableColumn<Row>[] = [
      { id: 'id', accessorKey: 'id', header: 'ID' },
      {
        id: 'dept',
        accessorKey: 'dept',
        header: 'Dept',
        filters: [
          { text: 'A', value: 'A' },
          { text: 'B', value: 'B' },
        ],
      },
    ];
    const mounted = mountSTable<Row>({ columns, dataSource: mkData(), rowKey: 'id' });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host.querySelector<HTMLElement>('.s-table-filter-trigger')!.click();
    await nextTick();
    document.querySelector<HTMLElement>('.s-table-filter-dropdown-menu-item')!.click();
    document.querySelector<HTMLElement>('.s-table-filter-dropdown-btn-confirm')!.click();
    await nextTick();

    expect(getBodyCol(1)).toEqual(['A', 'A', 'A']);
  });

  it('动态移除列过滤能力时清理陈旧状态并恢复完整行模', async () => {
    const columns = shallowRef<STableColumn<Row>[]>([
      { id: 'id', accessorKey: 'id', header: 'ID' },
      {
        id: 'dept',
        accessorKey: 'dept',
        header: 'Dept',
        filters: [
          { text: 'A', value: 'A' },
          { text: 'B', value: 'B' },
        ],
        defaultFilteredValues: ['A'],
      },
    ]);
    const mounted = mountSTable<Row>(() => ({
      columns: columns.value,
      dataSource: mkData(),
      rowKey: 'id',
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();
    expect(getBodyCol(1)).toEqual(['A', 'A', 'A']);

    columns.value = [
      { id: 'id', accessorKey: 'id', header: 'ID' },
      { id: 'dept', accessorKey: 'dept', header: 'Dept' },
    ];
    await nextTick();

    expect(getBodyCol(1)).toEqual(['A', 'B', 'A', 'B', 'A']);
  });

  it('搜索：通过 accessorFn 取值，不直接索引原始对', async () => {
    const columns: STableColumn<Row>[] = [
      { id: 'id', accessorKey: 'id', header: 'ID' },
      {
        id: 'displayName',
        accessorFn: (record) => `${record.name}-${record.dept}`,
        header: 'Display name',
        search: true,
      },
    ];
    const mounted = mountSTable<Row>({ columns, dataSource: mkData(), rowKey: 'id' });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host.querySelector<HTMLElement>('.s-table-search-trigger')!.click();
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('.s-table-search-input')!;
    input.value = 'alice-b';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector<HTMLElement>('.s-table-search-dropdown-btn-confirm')!.click();
    await nextTick();

    expect(getBodyCol(0)).toEqual(['1']);
    expect(getBodyCol(1)).toEqual(['Alice-B']);
  });

  it('分页：pageSize=2 时只渲染当前页行数，total 反映全量', async () => {
    const columns: STableColumn<Row>[] = [
      { id: 'id', accessorKey: 'id', header: 'ID' },
      { id: 'name', accessorKey: 'name', header: 'Name' },
    ];
    const mounted = mountSTable<Row>({
      columns,
      dataSource: mkData(),
      pagination: { defaultPageSize: 2 },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    // 第一页只渲染 2
    expect(getBodyCol(0)).toEqual(['3', '1']);
  });

  it('原地关闭列过滤能力时也会清理陈旧过滤状', async () => {
    const columns = reactive([
      { id: 'id', accessorKey: 'id', header: 'ID' },
      {
        id: 'dept',
        accessorKey: 'dept',
        header: 'Dept',
        filters: [
          { text: 'A', value: 'A' },
          { text: 'B', value: 'B' },
        ],
        defaultFilteredValues: ['A'],
      },
    ] as Array<Record<string, unknown>>) as unknown as STableColumn<Row>[];
    const mounted = mountSTable<Row>(() => ({
      columns,
      dataSource: mkData(),
      rowKey: 'id',
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();
    expect(getBodyCol(1)).toEqual(['A', 'A', 'A']);

    columns[1]!.filters = undefined;
    columns[1]!.defaultFilteredValues = undefined;
    await nextTick();
    expect(getBodyCol(1)).toEqual(['A', 'B', 'A', 'B', 'A']);
  });
});
