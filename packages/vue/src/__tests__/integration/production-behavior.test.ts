import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { nextTick, reactive, ref, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn, STableInstance } from '../../types';

interface Row {
  id: number;
  name: string;
  children?: Row[];
}

let app: App | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
  vi.restoreAllMocks();
});

describe('生产环境基础行为', () => {
  it('表格内置操作按钮全部声明 type=button，避免提交外层表', async () => {
    const columns: STableColumn<Row>[] = [
      {
        accessorKey: 'name',
        header: '姓名',
        sorter: true,
        search: true,
        filters: [{ text: 'A', value: 'A' }],
        onFilter: (value, row) => row.name === value,
      },
    ];
    const mounted = mountSTable<Row>({
      columns,
      dataSource: [{ id: 1, name: 'A' }],
      rowKey: 'id',
      rowSelection: { type: 'checkbox' },
      expandable: {},
      pagination: true,
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
    expect(buttons.length).toBeGreaterThan(5);
    expect(buttons.every((button) => button.type === 'button')).toBe(true);
  });

  it('发现重复 rowKey 时给出明确诊断，生产构建也会提示', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const mounted = mountSTable<Row>({
      columns: [{ accessorKey: 'name', header: '姓名' }],
      dataSource: [
        { id: 1, name: 'A' },
        { id: 1, name: 'B' },
      ],
      rowKey: 'id',
      rowSelection: { type: 'checkbox' },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('重复的 rowKey "1"'));
    const rowIds = [...host.querySelectorAll<HTMLElement>('tbody tr.s-table-row')].map(
      (row) => row.dataset.rowId
    );
    expect(rowIds).toHaveLength(2);
    expect(new Set(rowIds).size).toBe(2);
  });

  it('同一个记录对象重复出现时仍分配不同的内部 Row ID', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const record: Row = { id: 1, name: 'A' };
    const mounted = mountSTable<Row>({
      columns: [{ accessorKey: 'name', header: '姓名' }],
      dataSource: [record, record],
      rowKey: 'id',
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const rowIds = [...host.querySelectorAll<HTMLElement>('tbody tr.s-table-row')].map(
      (row) => row.dataset.rowId
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('重复的 rowKey "1"'));
    expect(rowIds).toHaveLength(2);
    expect(new Set(rowIds).size).toBe(2);
  });

  it('异步树数据到达并重建行模型后保持重复 key 的内部 ID 稳定', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const state = reactive<{ data: Row[] }>({ data: [] });
    const tableRef = ref<STableInstance<Row>>();
    const mounted = mountSTable<Row>(() => ({
      columns: [{ accessorKey: 'name', header: '姓名' }],
      dataSource: state.data,
      rowKey: 'id',
      tree: {},
      ref: tableRef,
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(tableRef.value!.getTanStackTable().getCoreRowModel().flatRows).toHaveLength(0);
    state.data = [
      {
        id: 1,
        name: 'Parent',
        children: [{ id: 1, name: 'Child' }],
      },
    ];
    await nextTick();

    const firstIds = tableRef
      .value!.getTanStackTable()
      .getCoreRowModel()
      .flatRows.map((row) => row.id);
    expect(firstIds).toHaveLength(2);
    expect(new Set(firstIds).size).toBe(2);

    // 用同一批记录重建根数组，验证重复 key 后缀不会跨 Row Model 构建累加。
    state.data = [...state.data];
    await nextTick();
    const rebuiltIds = tableRef
      .value!.getTanStackTable()
      .getCoreRowModel()
      .flatRows.map((row) => row.id);
    expect(rebuiltIds).toEqual(firstIds);
  });
});
