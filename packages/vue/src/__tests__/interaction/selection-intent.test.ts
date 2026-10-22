import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { nextTick, ref, type App } from 'vue';
import type { STableColumn, STableInstance, STableSelectionIntent } from '../../types';
import { mountSTable } from '../helpers';

interface Row {
  id: number;
  name: string;
}

const columns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: '姓名' },
];

let app: App | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('选择意图', () => {
  it('refreshes selected records when data changes with the same selection intent', async () => {
    const tableRef = ref<STableInstance<Row>>();
    const dataSource = ref<Row[]>([{ id: 1, name: 'Before' }]);
    const mounted = mountSTable<Row>(() => ({
      columns,
      dataSource: dataSource.value,
      rowKey: 'id',
      rowSelection: { strategy: 'intent' },
      defaultSelectionIntent: { mode: 'all', excludedRowKeys: [] },
      ref: tableRef,
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(tableRef.value!.getSelectedRows()).toEqual([{ id: 1, name: 'Before' }]);
    dataSource.value = [
      { id: 1, name: 'After' },
      { id: 2, name: 'New' },
    ];
    await nextTick();

    expect(tableRef.value!.getSelectedRows()).toEqual(dataSource.value);
    expect(tableRef.value!.getSelectionIntent()).toEqual({ mode: 'all', excludedRowKeys: [] });
  });

  it('全选和单行排除只保存例外，不物化全部 rowKey', async () => {
    const tableRef = ref<STableInstance<Row>>();
    const intents: STableSelectionIntent[] = [];
    const legacyUpdates: Array<Array<string | number>> = [];
    const dataSource = Array.from({ length: 1_000 }, (_, id) => ({ id, name: `row-${id}` }));
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      rowKey: 'id',
      rowSelection: { type: 'checkbox', strategy: 'intent' },
      pagination: { defaultPageSize: 20 },
      ref: tableRef,
      'onUpdate:selectionIntent': (intent: STableSelectionIntent) => intents.push(intent),
      'onUpdate:selectedRowKeys': (keys: Array<string | number>) => legacyUpdates.push(keys),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    tableRef.value!.selectAll();
    await nextTick();
    expect(tableRef.value!.getSelectionIntent()).toEqual({ mode: 'all', excludedRowKeys: [] });
    expect(tableRef.value!.getSelectedRowKeys()).toEqual([]);
    expect(intents.at(-1)).toEqual({ mode: 'all', excludedRowKeys: [] });
    expect(legacyUpdates).toEqual([]);

    const table = tableRef.value!.getTanStackTable();
    expect(Object.keys(table.options.state?.rowSelection ?? {})).toHaveLength(1);
    expect(host.querySelector('.s-table-row-selected')).not.toBeNull();

    tableRef.value!.toggleRowSelection(dataSource[500]!, false);
    await nextTick();
    expect(tableRef.value!.getSelectionIntent()).toEqual({
      mode: 'all',
      excludedRowKeys: [500],
    });
  });

  it('全选意图不选中 disabled 行，也不把它暴露给实例查询', async () => {
    const tableRef = ref<STableInstance<Row>>();
    const dataSource: Row[] = [
      { id: 1, name: 'Ada' },
      { id: 2, name: 'Disabled' },
      { id: 3, name: 'Grace' },
    ];
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      rowKey: 'id',
      rowSelection: {
        type: 'checkbox',
        strategy: 'intent',
        getCheckboxProps: (row: Row) => ({ disabled: row.id === 2 }),
      },
      ref: tableRef,
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    tableRef.value!.selectAll();
    await nextTick();

    expect(tableRef.value!.getSelectedRows()).toEqual([dataSource[0], dataSource[2]]);
    const selectedKeys = [...host.querySelectorAll<HTMLElement>('.s-table-row-selected')].map(
      (row) => row.dataset.rowKey
    );
    expect(selectedKeys).toEqual(['1', '3']);
    expect(host.querySelector('[data-row-key="2"]')?.classList).not.toContain(
      's-table-row-selected'
    );
  });

  it('受控意图只派发下一快照', async () => {
    const tableRef = ref<STableInstance<Row>>();
    const updates: STableSelectionIntent[] = [];
    const mounted = mountSTable<Row>({
      columns,
      dataSource: [{ id: 1, name: 'Ada' }],
      rowKey: 'id',
      rowSelection: { strategy: 'intent' },
      selectionIntent: { mode: 'include', includedRowKeys: [] },
      ref: tableRef,
      'onUpdate:selectionIntent': (intent: STableSelectionIntent) => updates.push(intent),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    tableRef.value!.toggleRowSelection({ id: 1, name: 'Ada' }, true);
    expect(updates).toEqual([]);
    tableRef.value!.setSelectionIntent({ mode: 'include', includedRowKeys: [1] });
    expect(updates).toEqual([{ mode: 'include', includedRowKeys: [1] }]);
    expect(tableRef.value!.getSelectionIntent()).toEqual({
      mode: 'include',
      includedRowKeys: [],
    });
  });

  it('intent 模式下 getCheckboxProps 为纯回调，可在一轮渲染内多次解析', async () => {
    const getCheckboxProps = vi.fn((row: Row) => ({ disabled: row.id === 2 }));
    const tableRef = ref<STableInstance<Row>>();
    const mounted = mountSTable<Row>({
      columns,
      dataSource: [
        { id: 1, name: 'Ada' },
        { id: 2, name: 'Disabled' },
        { id: 3, name: 'Grace' },
      ],
      rowKey: 'id',
      rowSelection: { type: 'checkbox', strategy: 'intent', getCheckboxProps },
      ref: tableRef,
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    // 不再承诺"每行每轮只解析一次"；回调应为纯函数，可被多次调用。
    expect(getCheckboxProps.mock.calls.length).toBeGreaterThanOrEqual(3);

    tableRef.value!.setSelectionIntent({ mode: 'all', excludedRowKeys: [] });
    await nextTick();

    expect(getCheckboxProps.mock.calls.length).toBeGreaterThanOrEqual(6);
  });
});
