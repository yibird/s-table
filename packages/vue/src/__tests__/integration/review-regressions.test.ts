import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { h, nextTick, reactive, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn, STableInstance, STableRowKey } from '../../types';
import { decodeRowKey, encodeRowKey } from '../../utils';

interface Row {
  id: number | string;
  name: string;
  score?: number;
}

let app: App | null = null;
let host: HTMLElement | null = null;

const baseColumns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: 'Name' },
];

const bodyRows = () => Array.from(host!.querySelectorAll('tbody tr.s-table-row'));
const bodyCheckboxes = () =>
  Array.from(host!.querySelectorAll<HTMLInputElement>('tbody .s-table-selection-cell input'));

afterEach(() => {
  app?.unmount();
  host?.remove();
  document
    .querySelectorAll(
      '.s-table-filter-dropdown, .s-table-search-dropdown, .s-table-selection-dropdown-menu'
    )
    .forEach((el) => el.remove());
  app = null;
  host = null;
});

describe('审查回归：分页与选择语义', () => {
  it('公开实例可类型安全地访问底层 TanStack Table', async () => {
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>({
      columns: baseColumns,
      dataSource: [{ id: 1, name: 'a' }],
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const table = instance!.getTanStackTable();
    expect(table.getRowModel().rows).toHaveLength(1);
    expect(table.getColumn('name')?.id).toBe('name');
    expect(table.options.manualSorting).toBe(false);
    expect(table.options.manualFiltering).toBe(false);
  });

  it('TanStack 官方排序、过滤和分页 API 可写回 STable 受控状态', async () => {
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>({
      columns: [{ id: 'name', accessorKey: 'name', sorter: true, search: true }],
      dataSource: [
        { id: 1, name: 'b' },
        { id: 2, name: 'a' },
      ],
      pagination: { defaultPageSize: 1 },
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const table = instance!.getTanStackTable();
    table.getColumn('name')!.toggleSorting(false);
    await nextTick();
    expect(host.querySelector('tbody td')?.textContent).toContain('a');

    table.setColumnFilters([{ id: 'name', value: 'b' }]);
    await nextTick();
    expect(host.querySelector('tbody td')?.textContent).toContain('b');

    table.setColumnFilters([]);
    await nextTick();
    table.nextPage();
    await nextTick();
    expect(host.querySelector('tbody td')?.textContent).toContain('b');
  });

  it.each([undefined, false] as const)('pagination=%s 时不渲染分页', async (pagination) => {
    const mounted = mountSTable<Row>({
      columns: baseColumns,
      dataSource: [{ id: 1, name: 'a' }],
      pagination,
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(host.querySelector('.s-table-pagination-wrapper')).toBeNull();
  });

  it('未启用分页时“选择当前页”选择全部可见', async () => {
    let instance: STableInstance<Row> | null = null;
    const data = Array.from({ length: 25 }, (_, index) => ({
      id: index + 1,
      name: `n${index + 1}`,
    }));
    const mounted = mountSTable<Row>({
      columns: baseColumns,
      dataSource: data,
      rowKey: 'id',
      rowSelection: { type: 'checkbox' },
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host.querySelector<HTMLElement>('.s-table-selection-dropdown-trigger')!.click();
    await nextTick();
    const actions = Array.from(
      document.querySelectorAll<HTMLElement>('.s-table-selection-dropdown-item')
    );
    actions.at(-1)!.click();
    await nextTick();

    expect(instance!.getSelectedRowKeys()).toHaveLength(25);
  });

  it('数据删除后自动清理非保留模式的选中 key', async () => {
    const state = reactive({
      data: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 3, name: 'c' },
      ] as Row[],
    });
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>(() => ({
      columns: baseColumns,
      dataSource: state.data,
      rowKey: 'id',
      rowSelection: { type: 'checkbox', preserveSelectedRowKeys: false },
      defaultSelectedRowKeys: [1, 2, 3],
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    state.data = state.data.slice(0, 2);
    await nextTick();

    expect(instance!.getSelectedRowKeys()).toEqual([1, 2]);
  });

  it('非保留模式复用 TanStack rowsById 校验树形子行 key', async () => {
    interface TreeRow extends Row {
      children?: TreeRow[];
    }
    const child: TreeRow = { id: 'child', name: 'child' };
    const data: TreeRow[] = [{ id: 'parent', name: 'parent', children: [child] }];
    let instance: STableInstance<TreeRow> | null = null;
    const mounted = mountSTable<TreeRow>({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID' },
        { id: 'name', accessorKey: 'name', header: 'Name' },
      ],
      dataSource: data,
      rowKey: 'id',
      tree: { childrenColumnName: 'children' },
      rowSelection: { type: 'checkbox', preserveSelectedRowKeys: false },
      defaultSelectedRowKeys: ['child'],
      ref: (value: unknown) => {
        instance = value as STableInstance<TreeRow>;
      },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(instance!.getSelectedRowKeys()).toEqual(['child']);
    expect(instance!.getSelectedRows()).toEqual([child]);
  });

  it('树形选择与展开按完整节点路径恢复数据源顺序', async () => {
    interface TreeRow extends Row {
      children?: TreeRow[];
    }
    const childA1: TreeRow = {
      id: 'child-a1',
      name: 'child-a1',
    };
    const childB0: TreeRow = {
      id: 'child-b0',
      name: 'child-b0',
    };
    const data: TreeRow[] = [
      {
        id: 'parent-a',
        name: 'parent-a',
        children: [{ id: 'child-a0', name: 'child-a0' }, childA1],
      },
      { id: 'parent-b', name: 'parent-b', children: [childB0] },
    ];
    let instance: STableInstance<TreeRow> | null = null;
    const mounted = mountSTable<TreeRow>({
      columns: baseColumns,
      dataSource: data,
      rowKey: 'id',
      tree: { childrenColumnName: 'children' },
      rowSelection: { type: 'checkbox' },
      expandable: {},
      ref: (value: unknown) => {
        instance = value as STableInstance<TreeRow>;
      },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    instance!.toggleRowSelection(childB0, true);
    instance!.toggleRowSelection(childA1, true);
    instance!.expandRow('child-b0');
    instance!.expandRow('child-a1');
    await nextTick();

    expect(instance!.getSelectedRowKeys()).toEqual(['child-a1', 'child-b0']);
    expect(instance!.getExpandedRowKeys()).toEqual(['child-a1', 'child-b0']);
  });

  it('大数据末行选择后不再线性扫dataSource 校验 key', async () => {
    const data = Array.from({ length: 5000 }, (_, index) => ({
      id: index + 1,
      name: `n${index + 1}`,
    }));
    let rowKeyCalls = 0;
    const getRowKey = (record: Row) => {
      rowKeyCalls++;
      return record.id;
    };
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>({
      columns: baseColumns,
      dataSource: data,
      rowKey: getRowKey,
      rowSelection: { type: 'checkbox' },
      virtual: { y: true, x: false, rowHeight: 47 },
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    rowKeyCalls = 0;
    instance!.toggleRowSelection(data.at(-1)!, true);
    await nextTick();

    expect(instance!.getSelectedRowKeys()).toEqual([5000]);
    expect(rowKeyCalls).toBeLessThan(100);
  });

  it('保留缺失 key 时数据对象替换仍刷新 getSelectedRows', async () => {
    const state = reactive({
      data: [{ id: 1, name: 'old' }] as Row[],
    });
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>(() => ({
      columns: baseColumns,
      dataSource: state.data,
      rowKey: 'id',
      rowSelection: { type: 'checkbox', preserveSelectedRowKeys: true },
      defaultSelectedRowKeys: [1],
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const replacement = { id: 1, name: 'new' };
    state.data = [replacement];
    await nextTick();

    expect(instance!.getSelectedRows()).toEqual([replacement]);
  });

  it('实例状getter 返回可修改快照而不暴露内部缓存', async () => {
    const record = { id: 1, name: 'a' };
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>({
      columns: baseColumns,
      dataSource: [record],
      rowKey: 'id',
      rowSelection: { type: 'checkbox' },
      expandable: {},
      defaultSelectedRowKeys: [1],
      defaultExpandedRowKeys: [1],
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    instance!.getSelectedRowKeys().length = 0;
    instance!.getSelectedRows().length = 0;
    instance!.getExpandedRowKeys().length = 0;

    expect(instance!.getSelectedRowKeys()).toEqual([1]);
    expect(instance!.getSelectedRows()).toEqual([record]);
    expect(instance!.getExpandedRowKeys()).toEqual([1]);
  });

  it('选择和展开从受控切为非受控时继承最后一次受控值', async () => {
    const state = reactive<{
      selected: STableRowKey[] | undefined;
      expanded: STableRowKey[] | undefined;
    }>({ selected: [2], expanded: [2] });
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>(
      () => ({
        columns: baseColumns,
        dataSource: [
          { id: 1, name: 'a' },
          { id: 2, name: 'b' },
        ],
        rowKey: 'id',
        rowSelection: { type: 'checkbox' },
        expandable: {},
        defaultSelectedRowKeys: [1],
        defaultExpandedRowKeys: [1],
        selectedRowKeys: state.selected,
        expandedRowKeys: state.expanded,
        ref: (value: unknown) => {
          instance = value as STableInstance<Row>;
        },
      }),
      { expandedRowRender: ({ record }) => (record as Row).name }
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    state.selected = [1];
    state.expanded = [1];
    await nextTick();
    expect(instance!.getSelectedRowKeys()).toEqual([1]);
    expect(instance!.getExpandedRowKeys()).toEqual([1]);

    state.selected = undefined;
    state.expanded = undefined;
    await nextTick();

    expect(instance!.getSelectedRowKeys()).toEqual([1]);
    expect(instance!.getExpandedRowKeys()).toEqual([1]);
  });

  it('复选框透传 checked，并支持 TanStack Shift 范围选择', async () => {
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>({
      columns: baseColumns,
      dataSource: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 3, name: 'c' },
      ],
      rowKey: 'id',
      rowSelection: {
        type: 'checkbox',
        getTitleCheckboxProps: () => ({ checked: true }),
        getCheckboxProps: (record) => ({ checked: record.id === 2 }),
      },
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(host.querySelector<HTMLInputElement>('thead input')!.checked).toBe(true);
    expect(bodyCheckboxes().map((input) => input.checked)).toEqual([false, true, false]);

    bodyCheckboxes()[0]!.click();
    await nextTick();
    bodyCheckboxes()[2]!.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
    await nextTick();

    expect(instance!.getSelectedRowKeys()).toEqual([1, 2, 3]);
  });

  it('表头 checked 覆盖状态时按控件新值执行选择命令', async () => {
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>({
      columns: baseColumns,
      dataSource: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
      rowKey: 'id',
      defaultSelectedRowKeys: [1],
      rowSelection: {
        type: 'checkbox',
        getTitleCheckboxProps: () => ({ checked: true, indeterminate: false }),
      },
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const headerCheckbox = host.querySelector<HTMLInputElement>('thead input')!;
    expect(headerCheckbox.checked).toBe(true);
    expect(headerCheckbox.indeterminate).toBe(false);

    headerCheckbox.click();
    await nextTick();

    expect(instance!.getSelectedRowKeys()).toEqual([]);
  });

  it('修改 pageSize 时只派发一次分页通知', async () => {
    const changes: Array<{ page: number; pageSize: number }> = [];
    const pageEvents: Array<{ page: number; pageSize: number }> = [];
    const mounted = mountSTable<Row>({
      columns: baseColumns,
      dataSource: Array.from({ length: 30 }, (_, index) => ({
        id: index + 1,
        name: `n${index + 1}`,
      })),
      pagination: {
        defaultCurrent: 3,
        defaultPageSize: 10,
        showSizeChanger: true,
        pageSizeOptions: [10, 20],
        onChange: (page: number, pageSize: number) => changes.push({ page, pageSize }),
      },
      onPageChange: (payload: { page: number; pageSize: number }) => pageEvents.push(payload),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host.querySelector<HTMLElement>('.s-pagination-size-changer .s-select-selector')!.click();
    await nextTick();
    const options = Array.from(
      document.querySelectorAll<HTMLElement>('.s-select-dropdown .s-select-item-option')
    );
    options[1]!.click();
    await nextTick();

    expect(changes).toEqual([{ page: 2, pageSize: 20 }]);
    expect(pageEvents).toEqual([{ page: 2, pageSize: 20 }]);
  });

  it('客户端排序和过滤后重置到第一', async () => {
    const columns: STableColumn<Row>[] = [
      { id: 'id', accessorKey: 'id', header: 'ID', sorter: true },
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        filters: [
          { text: 'odd', value: 'odd' },
          { text: 'even', value: 'even' },
        ],
        onFilter: (value, record) => record.name === value,
      },
    ];
    const data = Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      name: (index + 1) % 2 ? 'odd' : 'even',
    }));
    const mounted = mountSTable<Row>({
      columns,
      dataSource: data,
      pagination: { defaultCurrent: 3, defaultPageSize: 5 },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host.querySelector<HTMLElement>('.s-table-column-sorter')!.click();
    await nextTick();
    expect(bodyRows().map((row) => row.querySelector('td')?.textContent?.trim())).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
    ]);

    host.querySelector<HTMLElement>('.s-table-filter-trigger')!.click();
    await nextTick();
    document.querySelector<HTMLElement>('.s-table-filter-dropdown-menu-item')!.click();
    document.querySelector<HTMLElement>('.s-table-filter-dropdown-btn-confirm')!.click();
    await nextTick();
    expect(bodyRows().map((row) => row.querySelector('td')?.textContent?.trim())).toEqual([
      '1',
      '3',
      '5',
      '7',
      '9',
    ]);
  });

  it('过滤 Teleport 浮层继承触发节点的主题变量', async () => {
    const mounted = mountSTable<Row>({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID' },
        {
          id: 'name',
          accessorKey: 'name',
          header: 'Name',
          filters: [{ text: 'odd', value: 'odd' }],
        },
      ],
      dataSource: [{ id: 1, name: 'odd' }],
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const trigger = host.querySelector<HTMLElement>('.s-table-filter-trigger-wrapper')!;
    const triggerButton = trigger.querySelector<HTMLButtonElement>('.s-table-filter-trigger')!;
    trigger.style.setProperty('--s-primary-color', '#0f766e');
    trigger.style.setProperty('--s-color-bg-cell', '#ecfdf5');
    triggerButton.click();
    await nextTick();

    const dropdown = document.querySelector<HTMLElement>('.s-table-filter-dropdown')!;
    expect(dropdown.style.getPropertyValue('--s-primary-color')).toBe('#0f766e');
    expect(dropdown.style.getPropertyValue('--s-color-bg-cell')).toBe('#ecfdf5');
  });

  it('数字与同文本字符串 rowKey 保持独立且可逆', async () => {
    const data: Row[] = [
      { id: 1, name: 'number' },
      { id: '1', name: 'string' },
    ];
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>({
      columns: baseColumns,
      dataSource: data,
      rowKey: 'id',
      rowSelection: { type: 'checkbox' },
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    instance!.toggleRowSelection(data[0]!, true);
    instance!.toggleRowSelection(data[1]!, true);
    await nextTick();

    expect(instance!.getSelectedRowKeys()).toEqual([1, '1']);
    expect(instance!.getTanStackTable().getCoreRowModel().rowsById['n:1']?.original).toBe(data[0]);
    expect(instance!.getTanStackTable().getCoreRowModel().rowsById['s:1']?.original).toBe(data[1]);
    expect(decodeRowKey(encodeRowKey('001'))).toBe('001');
    expect(decodeRowKey(encodeRowKey('1e3'))).toBe('1e3');
    expect(decodeRowKey(`${encodeRowKey(1)}\0${2}`)).toBe(1);
  });

  it('自定义批量选择项收到当前选择快照', async () => {
    const selected: Array<{ keys: STableRowKey[]; rows: Row[] }> = [];
    const mounted = mountSTable<Row>({
      columns: baseColumns,
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
      defaultSelectedRowKeys: [1],
      rowSelection: {
        type: 'checkbox',
        selections: [
          {
            key: 'archive',
            text: 'Archive selected',
            onSelect: (keys, rows) => selected.push({ keys, rows }),
          },
        ],
      },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host.querySelector<HTMLElement>('.s-table-selection-dropdown-trigger')!.click();
    await nextTick();
    const action = Array.from(
      document.querySelectorAll<HTMLElement>('.s-table-selection-dropdown-item')
    ).find((item) => item.textContent?.includes('Archive selected'))!;
    action.click();

    expect(selected).toEqual([{ keys: [1], rows: [{ id: 1, name: 'a' }] }]);
  });
});

describe('审查回归：TanStack 缓存失效', () => {
  it('dataSource 原地 push 后更新核心行模型', async () => {
    const data = reactive<Row[]>([{ id: 1, name: 'a' }]);
    const mounted = mountSTable<Row>(() => ({
      columns: baseColumns,
      dataSource: data,
      rowKey: 'id',
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    data.push({ id: 2, name: 'b' });
    await nextTick();

    expect(bodyRows()).toHaveLength(2);
  });

  it('动态替accessorFn 后不复用旧行值缓', async () => {
    const data: Row[] = [
      { id: 1, name: 'b', score: 1 },
      { id: 2, name: 'a', score: 2 },
    ];
    const columns = reactive([
      {
        id: 'dynamic',
        accessorFn: (record: Row) => record.name,
        header: 'Dynamic',
      },
    ]) as unknown as STableColumn<Row>[];
    const mounted = mountSTable<Row>(() => ({ columns, dataSource: data, rowKey: 'id' }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(bodyRows().map((row) => row.textContent?.trim())).toEqual(['b', 'a']);
    columns[0]!.accessorFn = (record) => record.score;
    await nextTick();

    expect(bodyRows().map((row) => row.textContent?.trim())).toEqual(['1', '2']);
  });

  it('动态切rowKey 后重TanStack rowsById', async () => {
    const data: Row[] = [{ id: 1, name: 'a' }];
    const state = reactive<{ rowKey: 'id' | 'name' }>({ rowKey: 'id' });
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>(() => ({
      columns: baseColumns,
      dataSource: data,
      rowKey: state.rowKey,
      rowSelection: { type: 'checkbox' },
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    state.rowKey = 'name';
    await nextTick();
    instance!.toggleRowSelection(data[0]!, true);
    await nextTick();

    expect(instance!.getSelectedRowKeys()).toEqual(['a']);
  });

  it('仅表头配置变化时保留核心 Row 缓存，不重复执行全量 rowKey', async () => {
    const data: Row[] = Array.from({ length: 500 }, (_, index) => ({
      id: index,
      name: `name-${index}`,
    }));
    const state = reactive({ header: 'Name' });
    let rowKeyCalls = 0;
    const getRowKey = (record: Row) => {
      rowKeyCalls++;
      return record.id;
    };
    const mounted = mountSTable<Row>(() => ({
      columns: [{ id: 'name', accessorKey: 'name', header: state.header }],
      dataSource: data,
      rowKey: getRowKey,
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    rowKeyCalls = 0;
    state.header = 'Renamed';
    await nextTick();

    expect(host.querySelector('th')?.textContent).toContain('Renamed');
    expect(rowKeyCalls).toBe(0);
  });

  it('动态启用纯 display 功能列时保留核心 Row 缓存', async () => {
    const data: Row[] = Array.from({ length: 500 }, (_, index) => ({
      id: index,
      name: `name-${index}`,
    }));
    const state = reactive({ selectable: false });
    let rowKeyCalls = 0;
    const getRowKey = (record: Row) => {
      rowKeyCalls++;
      return record.id;
    };
    const mounted = mountSTable<Row>(() => ({
      columns: baseColumns,
      dataSource: data,
      rowKey: getRowKey,
      rowSelection: state.selectable ? { type: 'checkbox' } : undefined,
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    rowKeyCalls = 0;
    state.selectable = true;
    await nextTick();

    expect(host.querySelectorAll('.s-table-selection-cell')).not.toHaveLength(0);
    expect(rowKeyCalls).toBe(0);
  });
});

describe('审查回归：展开与滚动实例 API', () => {
  it('通过 expandable.isRowExpandable 禁用指定行', async () => {
    const mounted = mountSTable<Row>({
      columns: baseColumns,
      dataSource: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 3, name: 'c' },
      ],
      rowKey: 'id',
      expandable: {
        isRowExpandable: (record) => record.id === 1,
      },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const triggers = Array.from(
      host.querySelectorAll<HTMLButtonElement>('tbody .s-table-expand-trigger')
    );
    expect(triggers.map((trigger) => trigger.disabled)).toEqual([false, true, true]);
  });

  it('默认展开 key 不能强制展开被禁用的行', async () => {
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>(
      {
        columns: baseColumns,
        dataSource: [
          { id: 1, name: 'a' },
          { id: 2, name: 'b' },
        ],
        rowKey: 'id',
        expandable: { isRowExpandable: (record) => record.id === 1 },
        defaultExpandedRowKeys: [2],
        ref: (value: unknown) => {
          instance = value as STableInstance<Row>;
        },
      },
      { expandedRowRender: () => 'detail' }
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(instance!.getExpandedRowKeys()).toEqual([]);
    expect(host.querySelector('.s-table-expanded-row')).toBeNull();
  });

  it('数据删除后清理非受控展开 key', async () => {
    const state = reactive({
      data: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ] as Row[],
    });
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>(() => ({
      columns: baseColumns,
      dataSource: state.data,
      rowKey: 'id',
      expandable: {},
      defaultExpandedRowKeys: [1, 2],
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    state.data = [state.data[0]!];
    await nextTick();

    expect(instance!.getExpandedRowKeys()).toEqual([1]);
  });

  it('普通表格模式支持滚动到行、顶部和底部', async () => {
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>({
      columns: baseColumns,
      dataSource: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
      rowKey: 'id',
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const container = host.querySelector<HTMLElement>('.s-table-container')!;
    const secondRow = host.querySelector<HTMLElement>('.s-table-row[data-index="1"]')!;
    container.getBoundingClientRect = () => ({ top: 10 }) as DOMRect;
    secondRow.getBoundingClientRect = () => ({ top: 110 }) as DOMRect;
    Object.defineProperty(container, 'scrollHeight', { configurable: true, value: 500 });
    Object.defineProperty(container, 'clientHeight', { configurable: true, value: 100 });

    instance!.scrollToRow(2);
    expect(container.scrollTop).toBe(100);
    instance!.scrollToBottom();
    expect(container.scrollTop).toBe(400);
    instance!.scrollToTop();
    expect(container.scrollTop).toBe(0);
    container.scrollLeft = 36;
    expect(instance!.getScrollPosition()).toEqual({ left: 36, top: 0 });
  });

  it('固定顶行后 scrollToRow 使用中间区坐标，不会滚到错误行', async () => {
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>({
      columns: baseColumns,
      dataSource: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 3, name: 'c' },
        { id: 4, name: 'd' },
      ],
      rowKey: 'id',
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    instance!.pinRow(1, 'top');
    await nextTick();

    const container = host.querySelector<HTMLElement>('.s-table-container')!;
    const target = host.querySelector<HTMLElement>('.s-table-row[data-row-key="3"]')!;
    const wrong = host.querySelector<HTMLElement>('.s-table-row[data-row-key="4"]')!;
    expect(target.dataset.index).toBe('1');
    expect(wrong.dataset.index).toBe('2');
    container.getBoundingClientRect = () => ({ top: 10 }) as DOMRect;
    target.getBoundingClientRect = () => ({ top: 90 }) as DOMRect;
    wrong.getBoundingClientRect = () => ({ top: 210 }) as DOMRect;

    expect(instance!.scrollToRow(3)).toBe(true);
    expect(container.scrollTop).toBe(80);
    expect(instance!.scrollToRow(1)).toBe(true);
  });
});

describe('审查回归：TanStack 列排', () => {
  it('draggable=false 只限制拖拽源，仍可作为合法落点', async () => {
    const events: Array<{ columnOrder: string[] }> = [];
    const mounted = mountSTable<Row>({
      columns: [
        { id: 'name', accessorKey: 'name', header: 'Name', draggable: true },
        { id: 'score', accessorKey: 'score', header: 'Score', draggable: false },
      ],
      dataSource: [{ id: 1, name: 'b', score: 1 }],
      rowKey: 'id',
      onColumnOrderChange: (payload: { columnOrder: string[] }) => events.push(payload),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const source = host.querySelector<HTMLElement>('th[data-column-id="name"]')!;
    const target = host.querySelector<HTMLElement>('th[data-column-id="score"]')!;
    source.dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }));
    target.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    target.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    await nextTick();

    expect(events.at(-1)?.columnOrder).toEqual(['score', 'name']);
  });

  it('columnDrag.canDrag 返回 false 时阻止该列拖拽，允许时正常拖拽', async () => {
    const events: Array<{ columnOrder: string[] }> = [];
    const canDrag = vi.fn(({ columnId }: { columnId: string }) => columnId !== 'name');
    const mounted = mountSTable<Row>({
      columns: [
        { id: 'name', accessorKey: 'name', header: 'Name', draggable: true },
        { id: 'score', accessorKey: 'score', header: 'Score', draggable: true },
      ],
      dataSource: [{ id: 1, name: 'b', score: 1 }],
      rowKey: 'id',
      columnDrag: { canDrag },
      onColumnOrderChange: (payload: { columnOrder: string[] }) => events.push(payload),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const nameHeader = host.querySelector<HTMLElement>('th[data-column-id="name"]')!;
    const scoreHeader = host.querySelector<HTMLElement>('th[data-column-id="score"]')!;

    const blocked = new Event('dragstart', { bubbles: true, cancelable: true });
    nameHeader.dispatchEvent(blocked);
    expect(blocked.defaultPrevented).toBe(true);
    expect(canDrag).toHaveBeenCalledWith(expect.objectContaining({ columnId: 'name', index: 0 }));

    scoreHeader.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    scoreHeader.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    await nextTick();
    expect(events).toHaveLength(0);

    const allowed = new Event('dragstart', { bubbles: true, cancelable: true });
    scoreHeader.dispatchEvent(allowed);
    expect(allowed.defaultPrevented).toBe(false);
    nameHeader.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    nameHeader.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    await nextTick();
    expect(events.at(-1)?.columnOrder).toEqual(['score', 'name']);
  });

  it('嵌套叶子列拖拽通过 columnOrder 改变实际渲染顺序', async () => {
    const events: Array<{ columnOrder: string[]; fromIndex: number; toIndex: number }> = [];
    const columns: STableColumn<Row>[] = [
      {
        id: 'group',
        header: 'Group',
        columns: [
          { id: 'name', accessorKey: 'name', header: 'Name', draggable: true },
          { id: 'score', accessorKey: 'score', header: 'Score', draggable: true },
        ],
      },
    ];
    const mounted = mountSTable<Row>({
      columns,
      dataSource: [{ id: 1, name: 'b', score: 1 }],
      rowKey: 'id',
      onColumnOrderChange: (payload: {
        columnOrder: string[];
        fromIndex: number;
        toIndex: number;
      }) => events.push(payload),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const nameHeader = host.querySelector<HTMLElement>('th[data-column-id="name"]')!;
    const scoreHeader = host.querySelector<HTMLElement>('th[data-column-id="score"]')!;
    nameHeader.dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }));
    scoreHeader.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    scoreHeader.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    await nextTick();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ columnOrder: ['score', 'name'], fromIndex: 0, toIndex: 1 });
    const cells = Array.from(host.querySelectorAll('tbody tr.s-table-row td')).map((cell) =>
      cell.textContent?.trim()
    );
    expect(cells).toEqual(['1', 'b']);
  });

  it('异步 beforeDrop 等待期间列顺序变化时不覆盖最新顺序', async () => {
    let instance: STableInstance<Row> | null = null;
    let resolveDrop!: (accepted: boolean) => void;
    const events: unknown[] = [];
    const mounted = mountSTable<Row>({
      columns: [
        { id: 'name', accessorKey: 'name', header: 'Name', draggable: true },
        { id: 'score', accessorKey: 'score', header: 'Score', draggable: true },
        { id: 'id', accessorKey: 'id', header: 'ID', draggable: true },
      ],
      dataSource: [{ id: 1, name: 'b', score: 10 }],
      rowKey: 'id',
      columnDrag: {
        beforeDrop: () =>
          new Promise<boolean>((resolve) => {
            resolveDrop = resolve;
          }),
      },
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
      onColumnOrderChange: (payload: unknown) => events.push(payload),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host
      .querySelector<HTMLElement>('th[data-column-id="name"]')!
      .dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }));
    host
      .querySelector<HTMLElement>('th[data-column-id="score"]')!
      .dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    host
      .querySelector<HTMLElement>('th[data-column-id="score"]')!
      .dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));

    instance!.setColumnOrder(['id', 'name', 'score']);
    await nextTick();
    resolveDrop(true);
    await Promise.resolve();
    await nextTick();

    expect(instance!.getColumnOrder()).toEqual(['id', 'name', 'score']);
    expect(events).toEqual([]);
  });

  it('表头原生 DnD 未启动时通过鼠标桥接提交列顺序', async () => {
    const events: Array<{ columnOrder: string[]; fromIndex: number; toIndex: number }> = [];
    const mounted = mountSTable<Row>({
      columns: [
        { id: 'name', accessorKey: 'name', header: 'Name', draggable: true },
        { id: 'score', accessorKey: 'score', header: 'Score', draggable: true },
      ],
      dataSource: [{ id: 1, name: 'b', score: 1 }],
      rowKey: 'id',
      onColumnOrderChange: (payload: {
        columnOrder: string[];
        fromIndex: number;
        toIndex: number;
      }) => events.push(payload),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const nameHeader = host.querySelector<HTMLElement>('th[data-column-id="name"]')!;
    const scoreHeader = host.querySelector<HTMLElement>('th[data-column-id="score"]')!;
    nameHeader.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, clientX: 10 })
    );
    scoreHeader.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: 30 })
    );
    scoreHeader.dispatchEvent(
      new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0, clientX: 30 })
    );
    await nextTick();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ columnOrder: ['score', 'name'], fromIndex: 0, toIndex: 1 });
    const cells = Array.from(host.querySelectorAll('tbody tr.s-table-row td')).map((cell) =>
      cell.textContent?.trim()
    );
    expect(cells).toEqual(['1', 'b']);
  });

  it('父组件重建同 ID 列数组时保留用户拖拽顺序', async () => {
    const state = reactive({ bordered: false });
    const mounted = mountSTable<Row>(() => ({
      bordered: state.bordered,
      columns: [
        { id: 'name', accessorKey: 'name', header: 'Name', draggable: true },
        { id: 'score', accessorKey: 'score', header: 'Score', draggable: true },
      ] as STableColumn<Row>[],
      dataSource: [{ id: 1, name: 'b', score: 1 }],
      rowKey: 'id',
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host
      .querySelector<HTMLElement>('th[data-column-id="name"]')!
      .dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }));
    host
      .querySelector<HTMLElement>('th[data-column-id="score"]')!
      .dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    host
      .querySelector<HTMLElement>('th[data-column-id="score"]')!
      .dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    await nextTick();
    expect(
      Array.from(host.querySelectorAll('tbody tr.s-table-row td')).map((cell) =>
        cell.textContent?.trim()
      )
    ).toEqual(['1', 'b']);

    state.bordered = true;
    await nextTick();
    expect(
      Array.from(host.querySelectorAll('tbody tr.s-table-row td')).map((cell) =>
        cell.textContent?.trim()
      )
    ).toEqual(['1', 'b']);
  });
});

describe('审查回归：locale 与过滤', () => {
  it('locale 覆盖不会丢失默认分支', async () => {
    const mounted = mountSTable<Row>({
      columns: [
        {
          id: 'name',
          accessorKey: 'name',
          header: 'Name',
          filters: [{ text: 'a', value: 'a' }],
        },
      ],
      dataSource: [{ id: 1, name: 'a' }],
      locale: { filter: { confirm: 'Apply' } },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host.querySelector<HTMLElement>('.s-table-filter-trigger')!.click();
    await nextTick();
    expect(document.querySelector('.s-table-filter-dropdown-btn-reset')?.textContent?.trim()).toBe(
      'Reset'
    );
    expect(
      document.querySelector('.s-table-filter-dropdown-btn-confirm')?.textContent?.trim()
    ).toBe('Apply');
  });

  it('级联过滤选项会渲染子项并可提交过', async () => {
    const mounted = mountSTable<Row>({
      columns: [
        {
          id: 'name',
          accessorKey: 'name',
          header: 'Name',
          filters: [
            {
              text: 'Group',
              value: 'group',
              children: [{ text: 'Child', value: 'child' }],
            },
          ],
        },
      ],
      dataSource: [
        { id: 1, name: 'group' },
        { id: 2, name: 'child' },
      ],
      rowKey: 'id',
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host.querySelector<HTMLElement>('.s-table-filter-trigger')!.click();
    await nextTick();
    const options = Array.from(
      document.querySelectorAll<HTMLElement>('.s-table-filter-dropdown-menu-item')
    );
    expect(options.map((option) => option.textContent?.trim())).toEqual(['Group', 'Child']);
    options[1]!.click();
    document.querySelector<HTMLElement>('.s-table-filter-dropdown-btn-confirm')!.click();
    await nextTick();

    expect(bodyRows().map((row) => row.textContent?.trim())).toEqual(['child']);
  });
});

describe('审查回归：右键菜单', () => {
  it('slot 直接收到原始业务行对象，不创建深层响应式代理', async () => {
    const record: Row = { id: 1, name: 'a' };
    let slotRow: Row | undefined;
    const mounted = mountSTable<Row>(
      {
        columns: baseColumns,
        dataSource: [record],
        rowKey: 'id',
      },
      {
        contextMenu: ({ row }) => {
          slotRow = row;
          return h('div', 'Menu');
        },
      }
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host
      .querySelector<HTMLElement>('tbody tr.s-table-row')!
      .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await nextTick();

    expect(slotRow).toBe(record);
  });

  it('document capture 监听不会吞掉 Teleport 菜单内部点击', async () => {
    let actionCount = 0;
    const mounted = mountSTable<Row>(
      {
        columns: baseColumns,
        dataSource: [{ id: 1, name: 'a' }],
        rowKey: 'id',
      },
      {
        contextMenu: () =>
          h(
            'button',
            {
              class: 'context-action',
              onClick: () => actionCount++,
            },
            'Action'
          ),
      }
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host
      .querySelector<HTMLElement>('tbody tr.s-table-row')!
      .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const action = document.querySelector<HTMLElement>('.context-action')!;
    action.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    action.click();

    expect(actionCount).toBe(1);
    expect(document.querySelector('.s-table-context-menu')).not.toBeNull();
  });

  it('右键菜单 Teleport 浮层继承表格实例的主题变量', async () => {
    const mounted = mountSTable<Row>(
      {
        columns: baseColumns,
        dataSource: [{ id: 1, name: 'a' }],
      },
      { contextMenu: () => h('button', 'Action') }
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const table = host.querySelector<HTMLElement>('.s-table')!;
    table.style.setProperty('--s-primary-color', '#0f766e');
    table.style.setProperty('--s-shadow-menu', 'none');
    host
      .querySelector<HTMLElement>('tbody tr.s-table-row')!
      .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await nextTick();

    const menu = document.querySelector<HTMLElement>('.s-table-context-menu')!;
    expect(menu.style.getPropertyValue('--s-primary-color')).toBe('#0f766e');
    expect(menu.style.getPropertyValue('--s-shadow-menu')).toBe('none');
  });
});
