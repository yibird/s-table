import { afterEach, describe, expect, it } from 'vite-plus/test';
import { h, nextTick, reactive, ref, type App, type VNodeChild } from 'vue';
import { mountSTable } from '../helpers';
import type {
  STableColumn,
  STableEditingState,
  STableFilterPanelSlotContext,
  STableInstance,
  STableSortItem,
} from '../../types';

interface TestRow {
  id: number;
  name: string;
  score?: number;
  children?: TestRow[];
}

let app: App | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

const baseColumns: STableColumn<TestRow>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Name' },
];

describe('高级表格能力', () => {
  it('公开行和单元格 click/contextmenu/mouseenter/mouseleave 事件', async () => {
    const calls: string[] = [];
    const editingUpdates: Array<STableEditingState | null> = [];
    const mounted = mountSTable<TestRow>({
      columns: baseColumns,
      dataSource: [{ id: 1, name: 'Ada' }],
      rowKey: 'id',
      onRowClick: ({ rowKey }: { rowKey: string | number }) => calls.push(`row-click:${rowKey}`),
      onCellClick: ({ columnId }: { columnId: string }) => calls.push(`cell-click:${columnId}`),
      onCellContextMenu: ({ columnId }: { columnId: string }) =>
        calls.push(`cell-context:${columnId}`),
      onCellMouseenter: ({ columnId }: { columnId: string }) =>
        calls.push(`cell-enter:${columnId}`),
      onCellMouseleave: ({ columnId }: { columnId: string }) =>
        calls.push(`cell-leave:${columnId}`),
      'onUpdate:editing': (value: STableEditingState | null) => editingUpdates.push(value),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const cell = host.querySelector<HTMLTableCellElement>('tbody td.s-table-cell')!;
    expect(cell.dataset).toMatchObject({
      rowIndex: '0',
      colIndex: '0',
      rowId: 'n:1',
      columnId: 'id',
    });
    cell.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(() => cell.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
    expect(() => cell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))).not.toThrow();
    const contextmenu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    cell.dispatchEvent(contextmenu);
    cell.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    await nextTick();

    expect(calls).toContain('row-click:1');
    expect(calls).toContain('cell-click:id');
    expect(calls).toContain('cell-context:id');
    expect(calls).toContain('cell-enter:id');
    expect(calls).toContain('cell-leave:id');
    expect(editingUpdates).toEqual([]);
    expect(contextmenu.defaultPrevented).toBe(false);
  });

  it('嵌套表格事件不会冒泡为外层行和单元格事件', async () => {
    const outerCalls: string[] = [];
    const mounted = mountSTable<TestRow>({
      columns: [
        { accessorKey: 'id', header: 'ID' },
        {
          accessorKey: 'name',
          header: 'Name',
          cell: () =>
            h('table', { class: 'nested-table' }, [
              h('tbody', [
                h('tr', { class: 's-table-row', 'data-row-index': '0' }, [
                  h(
                    'td',
                    {
                      class: 's-table-cell',
                      'data-row-id': 'nested',
                      'data-column-id': 'nested',
                      'data-col-index': '0',
                    },
                    'nested'
                  ),
                ]),
              ]),
            ]),
        },
      ],
      dataSource: [{ id: 1, name: 'Ada' }],
      rowKey: 'id',
      onRowClick: () => outerCalls.push('row'),
      onCellClick: () => outerCalls.push('cell'),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host
      .querySelector<HTMLTableCellElement>('.nested-table td')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(outerCalls).toEqual([]);
  });

  it('支持单元格编辑并通过 update:dataSource 不可变提交', async () => {
    const updates: TestRow[][] = [];
    const editingUpdates: Array<STableEditingState | null> = [];
    let editChangeCount = 0;
    const columns: STableColumn<TestRow>[] = [
      { accessorKey: 'id', header: 'ID' },
      { accessorKey: 'name', header: 'Name', editable: true },
    ];
    const source = [{ id: 1, name: 'Ada' }];
    const mounted = mountSTable<TestRow>({
      columns,
      dataSource: source,
      rowKey: 'id',
      editConfig: { mode: 'cell', trigger: 'dblclick' },
      'onUpdate:dataSource': (value: TestRow[]) => updates.push(value),
      'onUpdate:editing': (value: STableEditingState | null) => editingUpdates.push(value),
      onEditChange: () => editChangeCount++,
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const nameCell = host.querySelectorAll<HTMLTableCellElement>('tbody td')[1]!;
    nameCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await nextTick();
    const input = nameCell.querySelector<HTMLInputElement>('input.s-table-cell-editor')!;
    input.value = 'Grace';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await nextTick();

    expect(updates.at(-1)?.[0]?.name).toBe('Grace');
    expect(source[0]!.name).toBe('Ada');
    expect(editingUpdates.at(-1)).toBeNull();
    expect(editChangeCount).toBe(1);
  });

  it('编辑数组点路径时保留数组结构和未修改项', async () => {
    interface NestedRow {
      id: number;
      addresses: Array<{ city: string }>;
    }
    const tableRef = ref<STableInstance<NestedRow>>();
    const updates: NestedRow[][] = [];
    const source: NestedRow[] = [{ id: 1, addresses: [{ city: '杭州' }, { city: '上海' }] }];
    const mounted = mountSTable<NestedRow>({
      columns: [
        { accessorKey: 'id', header: 'ID' },
        { id: 'city', accessorKey: 'addresses.0.city', header: '城市', editable: true },
      ],
      dataSource: source,
      rowKey: 'id',
      editConfig: { trigger: 'manual' },
      ref: tableRef,
      'onUpdate:dataSource': (value: NestedRow[]) => updates.push(value),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(tableRef.value!.startCellEdit(1, 'city')).toBe(true);
    tableRef.value!.setEditValue('city', '苏州');
    expect(await tableRef.value!.commitEdit()).toBe(true);

    expect(Array.isArray(updates[0]![0]!.addresses)).toBe(true);
    expect(updates[0]![0]!.addresses).toEqual([{ city: '苏州' }, { city: '上海' }]);
    expect(source[0]!.addresses[0]!.city).toBe('杭州');
  });

  it('分页后选择、编辑和行事件统一使用当前可见索引', async () => {
    const tableRef = ref<STableInstance<TestRow>>();
    const selectionIndexes: number[] = [];
    const parserIndexes: number[] = [];
    const eventIndexes: number[] = [];
    const mounted = mountSTable<TestRow>({
      columns: [
        { accessorKey: 'id', header: 'ID' },
        {
          accessorKey: 'name',
          header: 'Name',
          editable: true,
          valueParser: (value: unknown, _record: TestRow, index: number) => {
            parserIndexes.push(index);
            return String(value);
          },
        },
      ],
      dataSource: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 3, name: 'c' },
      ],
      rowKey: 'id',
      pagination: { defaultCurrent: 2, defaultPageSize: 2 },
      rowSelection: {
        renderCell: (
          _checked: boolean,
          _record: TestRow,
          index: number,
          originNode: VNodeChild
        ) => {
          selectionIndexes.push(index);
          return originNode;
        },
      },
      editConfig: { trigger: 'manual' },
      onRowClick: ({ rowIndex }: { rowIndex: number }) => eventIndexes.push(rowIndex),
      ref: tableRef,
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host.querySelector<HTMLElement>('tbody tr.s-table-row')!.click();
    expect(tableRef.value!.startCellEdit(3, 'name')).toBe(true);
    tableRef.value!.setEditValue('name', 'updated');

    expect(selectionIndexes.length).toBeGreaterThan(0);
    expect(selectionIndexes.every((index) => index === 0)).toBe(true);
    expect(parserIndexes).toEqual([0]);
    expect(eventIndexes).toEqual([0]);
  });

  it('patch 编辑模式只提交目标行增量，不替换 dataSource', async () => {
    const tableRef = ref<STableInstance<TestRow>>();
    const dataUpdates: TestRow[][] = [];
    const patches: Array<{
      rowKey: string | number;
      values: Readonly<Record<string, unknown>>;
      revision: number;
      nextRecord: TestRow;
    }> = [];
    const source = [{ id: 1, name: 'Ada' }];
    const mounted = mountSTable<TestRow>({
      columns: [
        { accessorKey: 'id', header: 'ID' },
        { accessorKey: 'name', header: 'Name', editable: true },
      ],
      dataSource: source,
      rowKey: 'id',
      editConfig: { trigger: 'manual', updateMode: 'patch' },
      ref: tableRef,
      'onUpdate:dataSource': (value: TestRow[]) => dataUpdates.push(value),
      onEditPatch: (patch: (typeof patches)[number]) => patches.push(patch),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(tableRef.value!.startCellEdit(1, 'name')).toBe(true);
    tableRef.value!.setEditValue('name', 'Grace');
    expect(await tableRef.value!.commitEdit()).toBe(true);
    expect(dataUpdates).toEqual([]);
    expect(source[0]!.name).toBe('Ada');
    expect(patches).toHaveLength(1);
    expect(patches[0]).toMatchObject({
      rowKey: 1,
      values: { name: 'Grace' },
      revision: 1,
      nextRecord: { id: 1, name: 'Grace' },
    });
  });

  it('支持列级编辑触发、值解析和自动聚焦', async () => {
    const tableRef = ref<STableInstance<TestRow>>();
    const updates: TestRow[][] = [];
    const mounted = mountSTable<TestRow>({
      columns: [
        { accessorKey: 'id', header: 'ID' },
        {
          accessorKey: 'name',
          header: 'Name',
          editable: true,
          editableTrigger: 'click',
          valueParser: (value: unknown) => String(value).trim(),
        },
      ],
      dataSource: [{ id: 1, name: 'Ada' }],
      rowKey: 'id',
      editConfig: { trigger: 'dblclick' },
      'onUpdate:dataSource': (value: TestRow[]) => updates.push(value),
      ref: tableRef,
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const nameCell = host.querySelectorAll<HTMLTableCellElement>('tbody td')[1]!;
    nameCell.click();
    await nextTick();
    const input = nameCell.querySelector<HTMLInputElement>('input.s-table-cell-editor')!;
    expect(document.activeElement).toBe(input);
    input.value = '  Grace  ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(await tableRef.value!.commitEdit()).toBe(true);
    expect(updates.at(-1)?.[0]?.name).toBe('Grace');

    expect(tableRef.value!.startCellEdit(1, 'name')).toBe(true);
    await nextTick();
    tableRef.value!.cancelEdit();
    expect(tableRef.value!.getEditing()).toBeNull();
  });

  it('异步校验返回后不会提交已过期的编辑草稿', async () => {
    const tableRef = ref<STableInstance<TestRow>>();
    const updates: TestRow[][] = [];
    let resolveValidation!: (value: boolean) => void;
    const validation = new Promise<boolean>((resolve) => {
      resolveValidation = resolve;
    });
    const mounted = mountSTable<TestRow>({
      columns: [
        { accessorKey: 'id', header: 'ID' },
        { accessorKey: 'name', header: 'Name', editable: true },
      ],
      dataSource: [{ id: 1, name: 'Ada' }],
      rowKey: 'id',
      editConfig: { trigger: 'manual', validate: () => validation },
      'onUpdate:dataSource': (value: TestRow[]) => updates.push(value),
      ref: tableRef,
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(tableRef.value!.startCellEdit(1, 'name')).toBe(true);
    tableRef.value!.setEditValue('name', 'stale');
    const pendingCommit = tableRef.value!.commitEdit();
    tableRef.value!.setEditValue('name', 'latest');
    resolveValidation(true);

    await expect(pendingCommit).resolves.toBe(false);
    expect(updates).toEqual([]);
    expect(tableRef.value!.getEditing()?.values.name).toBe('latest');
  });

  it('编辑校验器抛错时派发 editValidateError 并保留草稿', async () => {
    const tableRef = ref<STableInstance<TestRow>>();
    const errors: Array<string | undefined> = [];
    const mounted = mountSTable<TestRow>({
      columns: [
        { accessorKey: 'id', header: 'ID' },
        { accessorKey: 'name', header: 'Name', editable: true },
      ],
      dataSource: [{ id: 1, name: 'Ada' }],
      rowKey: 'id',
      editConfig: {
        trigger: 'manual',
        validate: async () => {
          throw new Error('校验服务不可用');
        },
      },
      onEditValidateError: (message: string | undefined) => errors.push(message),
      ref: tableRef,
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(tableRef.value!.startCellEdit(1, 'name')).toBe(true);
    tableRef.value!.setEditValue('name', 'Grace');
    await expect(tableRef.value!.commitEdit()).resolves.toBe(false);
    expect(errors).toEqual(['校验服务不可用']);
    expect(tableRef.value!.getEditing()?.values.name).toBe('Grace');
  });

  it('树形数据复用 expandedRowKeys，嵌套节点可展开且缩进不挤压触发器', async () => {
    const mounted = mountSTable<TestRow>({
      columns: baseColumns,
      dataSource: [
        {
          id: 1,
          name: 'Parent',
          children: [
            {
              id: 2,
              name: 'Child',
              children: [{ id: 3, name: 'Grandchild' }],
            },
          ],
        },
      ],
      rowKey: 'id',
      tree: { indentSize: 20 },
      defaultExpandedRowKeys: [1, 2],
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    let rows = host.querySelectorAll('tbody tr.s-table-row');
    let triggers = host.querySelectorAll<HTMLButtonElement>('tbody .s-table-expand-trigger');
    expect(rows).toHaveLength(3);
    expect(triggers).toHaveLength(2);
    expect(triggers[0]!.disabled).toBe(false);
    expect(triggers[1]!.disabled).toBe(false);
    expect(rows[2]!.querySelector('.s-table-expand-trigger')).toBeNull();
    expect((rows[1]!.children[1] as HTMLElement).style.paddingInlineStart).toBe(
      'calc(var(--s-tree-indent-base) + 20px)'
    );
    expect((rows[2]!.children[1] as HTMLElement).style.paddingInlineStart).toBe(
      'calc(var(--s-tree-indent-base) + 40px)'
    );
    expect(
      (rows[1]!.querySelector('.s-table-expand-cell') as HTMLElement).style.paddingInlineStart
    ).toBe('');

    triggers[1]!.click();
    await nextTick();
    expect(host.querySelectorAll('tbody tr.s-table-row')).toHaveLength(2);

    rows = host.querySelectorAll('tbody tr.s-table-row');
    triggers = host.querySelectorAll<HTMLButtonElement>('tbody .s-table-expand-trigger');
    triggers[1]!.click();
    await nextTick();
    expect(host.querySelectorAll('tbody tr.s-table-row')).toHaveLength(3);
    expect(host.querySelectorAll('tbody tr.s-table-expanded-row')).toHaveLength(0);
  });

  it('运行时替换 childrenColumnName 会重建 Core Row Model', async () => {
    interface DynamicTreeRow {
      id: number;
      name: string;
      children?: DynamicTreeRow[];
      nodes?: DynamicTreeRow[];
    }
    const state = reactive({ childrenColumnName: 'children' });
    const mounted = mountSTable<DynamicTreeRow>(() => ({
      columns: [
        { accessorKey: 'id', header: 'ID' },
        { accessorKey: 'name', header: 'Name' },
      ],
      dataSource: [
        {
          id: 1,
          name: 'Parent',
          children: [{ id: 2, name: 'Child A' }],
          nodes: [{ id: 3, name: 'Child B' }],
        },
      ],
      rowKey: 'id',
      tree: { childrenColumnName: state.childrenColumnName },
      defaultExpandedRowKeys: [1],
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const rowKeys = () =>
      [...host!.querySelectorAll<HTMLElement>('tbody tr.s-table-row')].map(
        (row) => row.dataset.rowKey
      );
    expect(rowKeys()).toEqual(['1', '2']);

    state.childrenColumnName = 'nodes';
    await nextTick();
    expect(rowKeys()).toEqual(['1', '3']);
  });

  it('defaultExpandAllRows 会等待异步首批数据后应用一次', async () => {
    const state = reactive<{ data: TestRow[] }>({ data: [] });
    const mounted = mountSTable<TestRow>(() => ({
      columns: baseColumns,
      dataSource: state.data,
      rowKey: 'id',
      tree: { childrenColumnName: 'children' },
      defaultExpandAllRows: true,
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    state.data = [{ id: 1, name: 'Parent', children: [{ id: 2, name: 'Child' }] }];
    await nextTick();

    expect(host.querySelectorAll('tbody tr.s-table-row')).toHaveLength(2);
  });

  it('树形数据缺少 rowKey 时仍为不同分支生成不冲突的内部行 ID', async () => {
    const tableRef = ref<STableInstance<TestRow>>();
    const mounted = mountSTable<TestRow>({
      columns: baseColumns,
      dataSource: [
        { id: 1, name: 'Parent A', children: [{ id: 11, name: 'Child A' }] },
        { id: 2, name: 'Parent B', children: [{ id: 21, name: 'Child B' }] },
      ],
      tree: {},
      ref: tableRef,
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const model = tableRef.value!.getTanStackTable().getCoreRowModel();
    expect(model.flatRows).toHaveLength(4);
    expect(Object.keys(model.rowsById)).toHaveLength(4);
  });

  it('多列排序保留有序优先级并公开完整 sorting', async () => {
    const changes: STableSortItem[][] = [];
    const columns: STableColumn<TestRow>[] = [
      { accessorKey: 'name', header: 'Name', sorter: true },
      { accessorKey: 'score', header: 'Score', sorter: true },
    ];
    const mounted = mountSTable<TestRow>({
      columns,
      dataSource: [
        { id: 1, name: 'b', score: 1 },
        { id: 2, name: 'a', score: 2 },
      ],
      rowKey: 'id',
      multiSort: true,
      onSortChange: (payload: { sorting: STableSortItem[] }) => changes.push(payload.sorting),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const sorters = host.querySelectorAll<HTMLElement>('.s-table-column-sorter');
    // 多列排序由 TanStack 内置 handler 处理：需要按住修饰键（shift/meta/ctrl）。
    sorters[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
    sorters[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
    await nextTick();

    expect(changes.at(-1)).toEqual([
      { columnId: 'name', order: 'ascend' },
      { columnId: 'score', order: 'ascend' },
    ]);

    // 无修饰键点击回到单列排序，并按内置方向循环推进到 descend。
    sorters[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(changes.at(-1)).toEqual([{ columnId: 'name', order: 'descend' }]);
  });

  it('列 filteredValue 变化会同步筛选 UI 与行模型', async () => {
    const filteredValue = ref<Array<'active' | 'inactive'>>(['active']);
    const buildColumns = (): STableColumn<TestRow>[] => [
      { accessorKey: 'id', header: 'ID' },
      {
        accessorKey: 'name',
        header: 'Name',
        filters: [
          { text: 'Active', value: 'active' },
          { text: 'Inactive', value: 'inactive' },
        ],
        filteredValue: filteredValue.value,
        onFilter: (value, record) => (value === 'active' ? record.score === 1 : record.score === 0),
      },
    ];
    const mounted = mountSTable<TestRow>(() => ({
      columns: buildColumns(),
      dataSource: [
        { id: 1, name: 'Ada', score: 1 },
        { id: 2, name: 'Grace', score: 0 },
      ],
      rowKey: 'id',
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(host.querySelector('tbody')?.textContent).toContain('Ada');
    expect(host.querySelector('tbody')?.textContent).not.toContain('Grace');
    filteredValue.value = ['inactive'];
    await nextTick();
    expect(host.querySelector('tbody')?.textContent).not.toContain('Ada');
    expect(host.querySelector('tbody')?.textContent).toContain('Grace');
  });

  it('自定义 filterPanel 可提交选择并派发 filterChange', async () => {
    const changes: Array<Record<string, Array<string | number | boolean>>> = [];
    const mounted = mountSTable<TestRow>(
      {
        columns: [
          {
            accessorKey: 'name',
            header: 'Name',
            filterMode: 'custom',
            onFilter: (value: string | number | boolean, record: TestRow) =>
              value === 'active' ? record.score === 1 : record.score === 0,
          },
        ],
        dataSource: [
          { id: 1, name: 'Ada', score: 1 },
          { id: 2, name: 'Grace', score: 0 },
        ],
        rowKey: 'id',
        onFilterChange: (payload: { filters: Record<string, Array<string | number | boolean>> }) =>
          changes.push(payload.filters),
      } as never,
      {
        filterPanel: (scope: STableFilterPanelSlotContext<TestRow>) =>
          h(
            'button',
            {
              id: 'custom-filter-apply',
              onClick: () => {
                scope.setSelectedKeys(['active']);
                scope.confirm();
              },
            },
            'Apply'
          ),
      }
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host.querySelector<HTMLButtonElement>('.s-table-filter-trigger')!.click();
    await nextTick();
    document.querySelector<HTMLButtonElement>('#custom-filter-apply')!.click();
    await nextTick();

    expect(changes.at(-1)).toEqual({ name: ['active'] });
    expect(host.querySelector('tbody')?.textContent).toContain('Ada');
    expect(host.querySelector('tbody')?.textContent).not.toContain('Grace');
  });

  it('支持逐行 class/style', async () => {
    const mounted = mountSTable<TestRow>({
      columns: baseColumns,
      dataSource: [{ id: 1, name: 'Ada' }],
      rowKey: 'id',
      rowClassName: (record) => `row-${record.id}`,
      rowStyle: { color: 'rgb(255, 0, 0)' },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const row = host.querySelector<HTMLElement>('tbody tr.s-table-row')!;
    expect(row.classList.contains('row-1')).toBe(true);
    expect(row.style.color).toBe('rgb(255, 0, 0)');
  });

  it('列虚拟化限制极端 overscan，并只创建中心窗口单元格和宽度占位', async () => {
    const columns: STableColumn<TestRow>[] = Array.from({ length: 50 }, (_, index) => ({
      id: `column-${index}`,
      header: `Column ${index}`,
      width: 120,
      accessorFn: (record) => `${record.name}-${index}`,
    }));
    const mounted = mountSTable<TestRow>({
      columns,
      dataSource: [{ id: 1, name: 'Ada' }],
      rowKey: 'id',
      pagination: true,
      virtual: { y: false, x: true, columnOverscan: 200 },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const cells = host.querySelectorAll('tbody tr.s-table-row > td');
    expect(cells.length).toBeLessThanOrEqual(21);
    expect(host.querySelector('tbody .s-table-column-virtual-spacer')).not.toBeNull();
    expect(host.querySelector('.s-table-virtual-spacer-cell')).toBeNull();
    expect(host.querySelector('.s-table-pagination-wrapper')).not.toBeNull();
  });
});
