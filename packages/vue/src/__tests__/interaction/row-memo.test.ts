import { describe, it, expect, afterEach, vi } from 'vite-plus/test';
import { h, nextTick, reactive, ref, shallowRef, type App } from 'vue';
import { mountSTable } from '../helpers';
import type {
  STableCellRenderContext,
  STableColumn,
  STableInstance,
  STableRowKey,
  STableStyles,
} from '../../types';

/**
 * 行级 v-memo 正确性回归测试 *
 * body/index.vue 给每个主`<tr>` 加了 v-memo，只有当行的 memo key（数据身/ 位置 /
 * 选中 / 展开 / 拖拽状/ 固定列样/ 框/ 语义class-style）变化时才重建其单元格子树 *
 * 风险：memo key 漏项会导致行渲染滞后。此处验证最容易受影响的两类交互— * 选中状态切换、展开状态切换、以及数据变更——行 class 与内容都能正确更新，
 * 证明 memo key 覆盖完整、没有把该更新的行错误跳过 */

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

const getRowClasses = (): string[] => {
  return Array.from(host!.querySelectorAll('tbody tr.s-table-row')).map((tr) => tr.className);
};

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('行级 v-memo 正确', () => {
  it('切换选中状态：未读取选择状态的 cell 渲染器不会重复执行', async () => {
    const state = reactive<{ keys: STableRowKey[] }>({ keys: [] });
    const renderCounts = new Map<number, number>();
    const renderCell = ({ row }: { row: { original: Row } }) => {
      const id = row.original.id;
      renderCounts.set(id, (renderCounts.get(id) ?? 0) + 1);
      return row.original.name;
    };
    const renderColumns: STableColumn<Row>[] = [
      { id: 'id', accessorKey: 'id', header: 'ID' },
      { id: 'name', accessorKey: 'name', header: 'Name', cell: renderCell },
    ];
    const dataSource: Row[] = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
      { id: 3, name: 'c' },
    ];
    const mounted = mountSTable<Row>(
      () =>
        ({
          columns: renderColumns,
          dataSource,
          rowKey: 'id',
          rowSelection: {},
          selectedRowKeys: state.keys,
          'onUpdate:selectedRowKeys': (keys: STableRowKey[]) => {
            state.keys = keys;
          },
        }) as never
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect([...renderCounts.values()]).toEqual([1, 1, 1]);
    state.keys = [2];
    await nextTick();

    expect(renderCounts).toEqual(
      new Map([
        [1, 1],
        [2, 1],
        [3, 1],
      ])
    );
  });

  it('缓存 VNode 单元格：状态变化不会丢失节点内容', async () => {
    const state = reactive<{ keys: STableRowKey[] }>({ keys: [] });
    const renderCell = ({ row }: { row: { original: Row } }) =>
      h('strong', { class: `cell-${row.original.id}` }, row.original.name);
    const renderColumns: STableColumn<Row>[] = [
      { id: 'id', accessorKey: 'id', header: 'ID' },
      { id: 'name', accessorKey: 'name', header: 'Name', cell: renderCell },
    ];
    const dataSource: Row[] = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ];
    const mounted = mountSTable<Row>(
      () =>
        ({
          columns: renderColumns,
          dataSource,
          rowKey: 'id',
          rowSelection: {},
          selectedRowKeys: state.keys,
        }) as never
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    state.keys = [2];
    await nextTick();

    expect(host.querySelector('.cell-1')?.textContent).toBe('a');
    expect(host.querySelector('.cell-2')?.textContent).toBe('b');
  });

  it('单元格渲染器读取外部 ref 时保持 Vue 响应式更新', async () => {
    const suffix = ref('first');
    const renderCell = vi.fn(({ row }: { row: { original: Row } }) => {
      return `${row.original.name}:${suffix.value}`;
    });
    const mounted = mountSTable<Row>({
      columns: [{ id: 'name', accessorKey: 'name', header: 'Name', cell: renderCell }],
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(host.querySelector('tbody td')?.textContent).toBe('a:first');
    expect(renderCell).toHaveBeenCalledTimes(1);

    suffix.value = 'second';
    await nextTick();

    expect(host.querySelector('tbody td')?.textContent).toBe('a:second');
    expect(renderCell).toHaveBeenCalledTimes(2);
  });

  it('单元格渲染器读取 getIsSelected 时随框选状态刷新', async () => {
    const renderCell = vi.fn(({ cell }: STableCellRenderContext<Row>) =>
      cell.getIsSelected() ? 'selected' : 'idle'
    );
    const mounted = mountSTable<Row>({
      columns: [{ id: 'name', accessorKey: 'name', header: 'Name', cell: renderCell }],
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
      cellRangeSelection: { mode: 'cell' },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const cell = host.querySelector<HTMLTableCellElement>('tbody td')!;
    expect(cell.textContent).toBe('idle');
    const renderCountBeforeSelection = renderCell.mock.calls.length;

    cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await nextTick();

    expect(cell.textContent).toBe('selected');
    expect(renderCell).toHaveBeenCalledTimes(renderCountBeforeSelection + 1);
  });

  it('相同 record 放入新 dataSource 数组后刷新为当前 Row 和 Cell context', async () => {
    const record: Row = { id: 1, name: 'a' };
    const data = shallowRef<Row[]>([record]);
    const tableRef = ref<STableInstance<Row>>();
    const contexts: Array<{ row: unknown; cell: unknown }> = [];
    const mounted = mountSTable<Row>(() => ({
      columns: [
        {
          id: 'name',
          accessorKey: 'name',
          header: 'Name',
          cell: ({ row, cell }) => {
            contexts.push({ row, cell });
            return row.original.name;
          },
        },
      ],
      dataSource: data.value,
      rowKey: 'id',
      ref: tableRef,
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    data.value = [record];
    await nextTick();

    const currentRow = tableRef.value!.getTanStackTable().getRowModel().rows[0]!;
    const currentCell = currentRow.getAllCells().find((cell) => cell.column.id === 'name');
    expect(contexts).toHaveLength(2);
    expect(contexts.at(-1)).toEqual({ row: currentRow, cell: currentCell });
  });

  it('数据替换后 VNode 事件闭包使用新 record', async () => {
    const firstRecord: Row = { id: 1, name: 'first' };
    const secondRecord: Row = { id: 1, name: 'second' };
    const data = shallowRef<Row[]>([firstRecord]);
    const clickedRecords: Row[] = [];
    const mounted = mountSTable<Row>(() => ({
      columns: [
        {
          id: 'name',
          accessorKey: 'name',
          header: 'Name',
          cell: ({ row }) =>
            h(
              'button',
              { class: 'context-button', onClick: () => clickedRecords.push(row.original) },
              row.original.name
            ),
        },
      ],
      dataSource: data.value,
      rowKey: 'id',
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    data.value = [secondRecord];
    await nextTick();
    host.querySelector<HTMLButtonElement>('.context-button')!.click();

    expect(host.querySelector('.context-button')?.textContent).toBe('second');
    expect(clickedRecords).toEqual([secondRecord]);
  });

  it('切换选中：仅目标行获selected class，其余行不受影响', async () => {
    const state = reactive<{ keys: STableRowKey[] }>({ keys: [] });
    const mounted = mountSTable<Row>(
      () =>
        ({
          columns,
          dataSource: [
            { id: 1, name: 'a' },
            { id: 2, name: 'b' },
            { id: 3, name: 'c' },
          ],
          rowKey: 'id',
          rowSelection: {},
          selectedRowKeys: state.keys,
          'onUpdate:selectedRowKeys': (keys: STableRowKey[]) => {
            state.keys = keys;
          },
        }) as never
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    // 初始无选中
    expect(getRowClasses().every((c) => !c.includes('s-table-row-selected'))).toBe(true);

    // 受控选中?2
    state.keys = [2];
    await nextTick();

    const classes = getRowClasses();
    expect(classes[0].includes('s-table-row-selected')).toBe(false);
    expect(classes[1].includes('s-table-row-selected')).toBe(true);
    expect(classes[2].includes('s-table-row-selected')).toBe(false);

    // 切换到第 1?
    state.keys = [1, 3];
    await nextTick();
    const classes2 = getRowClasses();
    expect(classes2[0].includes('s-table-row-selected')).toBe(true);
    expect(classes2[1].includes('s-table-row-selected')).toBe(false);
    expect(classes2[2].includes('s-table-row-selected')).toBe(true);
  });

  it('数据变更：memo 不会跳过内容更新（行文本随数据刷新）', async () => {
    const state = reactive<{ data: Row[] }>({
      data: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
    });
    const mounted = mountSTable<Row>(() => ({ columns, dataSource: state.data, rowKey: 'id' }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const firstRowText = () =>
      host!.querySelector('tbody tr.s-table-row td.s-table-cell:nth-child(2)')?.textContent?.trim();
    expect(firstRowText()).toBe('a');

    // 替换数据源（新行对象引用）→ memo key 中的 item.row 变化 ?行必须重渲染
    state.data = [
      { id: 1, name: 'AAA' },
      { id: 2, name: 'b' },
    ];
    await nextTick();
    expect(firstRowText()).toBe('AAA');
  });

  it('原地修改 bodyCell style 时会使行memo 失效', async () => {
    const styles = reactive<STableStyles>({ bodyCell: { color: 'red' } });
    const mounted = mountSTable<Row>(() => ({
      columns,
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
      styles,
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const firstCell = () => host!.querySelector<HTMLElement>('tbody td.s-table-cell')!;
    expect(firstCell().style.color).toBe('red');

    styles.bodyCell!.color = 'blue';
    await nextTick();

    expect(firstCell().style.color).toBe('blue');
  });

  it('编辑草稿变化只使当前编辑行失效', async () => {
    const tableRef = ref<STableInstance<Row>>();
    const renderCounts = new Map<number, number>();
    const editingColumns: STableColumn<Row>[] = [
      { accessorKey: 'id', header: 'ID' },
      {
        accessorKey: 'name',
        header: 'Name',
        editable: true,
        cell: ({ row }) => {
          const id = row.original.id;
          renderCounts.set(id, (renderCounts.get(id) ?? 0) + 1);
          return row.original.name;
        },
      },
    ];
    const mounted = mountSTable<Row>({
      columns: editingColumns,
      dataSource: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 3, name: 'c' },
      ],
      rowKey: 'id',
      ref: tableRef,
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const untouchedBefore = [renderCounts.get(2), renderCounts.get(3)];
    expect(tableRef.value!.startCellEdit(1, 'name')).toBe(true);
    await nextTick();
    tableRef.value!.setEditValue('name', 'updated');
    await nextTick();

    expect([renderCounts.get(2), renderCounts.get(3)]).toEqual(untouchedBefore);
  });

  it('行 class/style 回调随响应式依赖变化立即重算', async () => {
    const presentation = reactive<{ cls: string; color: string }>({
      cls: 'first-class',
      color: 'red',
    });
    const rowClassName = vi.fn(() => presentation.cls);
    const rowStyle = vi.fn(() => ({ color: presentation.color }));
    const mounted = mountSTable<Row>({
      columns,
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
      rowClassName,
      rowStyle,
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const row = () => host!.querySelector<HTMLElement>('tbody tr.s-table-row')!;
    expect(row().classList).toContain('first-class');
    expect(row().style.color).toBe('red');

    presentation.cls = 'second-class';
    presentation.color = 'blue';
    await nextTick();

    expect(row().classList).toContain('second-class');
    expect(row().classList).not.toContain('first-class');
    expect(row().style.color).toBe('blue');
  });

  it('行 class/style 回调热替换会立即刷新真实行节点', async () => {
    const state = reactive<{
      rowClassName: (record: Row) => string;
      rowStyle: (record: Row) => { color: string };
    }>({
      rowClassName: (_record: Row) => 'first-class',
      rowStyle: (_record: Row) => ({ color: 'red' }),
    });
    const mounted = mountSTable<Row>(() => ({
      columns,
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
      rowClassName: state.rowClassName,
      rowStyle: state.rowStyle,
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const row = () => host!.querySelector<HTMLElement>('tbody tr.s-table-row')!;
    expect(row().classList).toContain('first-class');
    expect(row().style.color).toBe('red');

    state.rowClassName = () => 'second-class';
    state.rowStyle = () => ({ color: 'blue' });
    await nextTick();

    expect(row().classList).toContain('second-class');
    expect(row().classList).not.toContain('first-class');
    expect(row().style.color).toBe('blue');
  });

  it('列 meta 和 editor 热替换会刷新真实 Cell 上下文与编辑器', async () => {
    const tableRef = ref<STableInstance<Row>>();
    const dynamicColumns = reactive<STableColumn<Row>[]>([
      { id: 'id', accessorKey: 'id', header: 'ID' },
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        editable: true,
        editor: 'text',
        meta: { label: 'old' } as never,
        cell: ({ column }) => String((column.columnDef.meta as { label: string }).label),
      },
    ]);
    const mounted = mountSTable<Row>(
      () =>
        ({
          columns: dynamicColumns,
          dataSource: [{ id: 1, name: 'a' }],
          rowKey: 'id',
          editConfig: { trigger: 'manual' },
          ref: tableRef,
        }) as never
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const nameCell = () => host!.querySelectorAll<HTMLTableCellElement>('tbody td')[1]!;
    expect(nameCell().textContent).toBe('old');

    dynamicColumns[1]!.meta = { label: 'new' } as never;
    await nextTick();
    expect(nameCell().textContent).toBe('new');

    expect(tableRef.value!.startCellEdit(1, 'name')).toBe(true);
    await nextTick();
    expect(nameCell().querySelector('input')?.type).toBe('text');
    dynamicColumns[1]!.editor = 'number';
    await nextTick();
    expect(nameCell().querySelector('input')?.type).toBe('number');
  });

  it('列 header 热替换会刷新读取 columnDef 的单元格 renderer', async () => {
    const dynamicColumns = reactive([
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Old',
        cell: ({ column }: STableCellRenderContext<Row>) => String(column.columnDef.header),
      },
    ]) as unknown as STableColumn<Row>[];
    const mounted = mountSTable<Row>(
      () =>
        ({
          columns: dynamicColumns,
          dataSource: [{ id: 1, name: 'a' }],
          rowKey: 'id',
        }) as never
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const cell = () => host!.querySelector('tbody td')!;
    expect(cell().textContent).toBe('Old');
    dynamicColumns[0]!.header = 'New';
    await nextTick();

    expect(cell().textContent).toBe('New');
  });

  it('固定列宽度变化复用 Row，并用新 Column 上下文刷新单元格', async () => {
    const tableRef = ref<STableInstance<Row>>();
    const renderCell = vi.fn(({ row }: { row: { original: Row } }) => row.original.name);
    const resizableColumns = reactive([
      { id: 'id', accessorKey: 'id', header: 'ID', fixed: 'left', width: 60 },
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        fixed: 'left',
        width: 120,
        cell: renderCell,
      },
    ]) as unknown as STableColumn<Row>[];
    const dataSource: Row[] = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ];
    const mounted = mountSTable<Row>(() => ({
      columns: resizableColumns,
      dataSource,
      rowKey: 'id',
      ref: tableRef,
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(renderCell).toHaveBeenCalledTimes(2);
    const rowBeforeResize = tableRef.value!.getTanStackTable().getRowModel().rows[0];
    resizableColumns[0]!.width = 100;
    await nextTick();

    expect(tableRef.value!.getTanStackTable().getRowModel().rows[0]).toBe(rowBeforeResize);
    // 仅改变 ID 列宽度；按列 token 缓存不会让 Name 的业务 cell 无效。
    expect(renderCell).toHaveBeenCalledTimes(2);
    const secondCell = host.querySelector<HTMLElement>('tbody tr.s-table-row td:nth-child(2)')!;
    const variableName = /^var\((--[^)]+)\)$/.exec(secondCell.style.left)?.[1];
    expect(variableName).toBeTruthy();
    expect(secondCell.closest('table')?.style.getPropertyValue(variableName!)).toBe('100px');
  });
});
