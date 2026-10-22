import { describe, it, expect, expectTypeOf, afterEach } from 'vite-plus/test';
import { h, nextTick, reactive, ref, type App } from 'vue';
import { mountSTable } from '../helpers';
import { createSTableColumnHelper } from '../../utils/column';
import type { STableAccessorKeyColumn, STableColumn, STableInstance } from '../../types';

interface User {
  id: number;
  name: string;
  score: number;
}

let app: App | null = null;
let host: HTMLElement | null = null;

const data: User[] = [
  { id: 1, name: 'Tom', score: 90 },
  { id: 2, name: 'Jerry', score: 80 },
];

const headerTexts = (): string[] =>
  Array.from(host!.querySelectorAll('thead th')).map((th) => th.textContent?.trim() ?? '');

const firstBodyRowCells = (): string[] =>
  Array.from(host!.querySelectorAll('tbody tr.s-table-row:first-child td.s-table-cell')).map(
    (td) => td.textContent?.trim() ?? ''
  );

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('解耦列 API + createSTableColumnHelper', () => {
  it('helper.accessor / display 渲染正确，cell 渲染函数拿到 row.original', async () => {
    const col = createSTableColumnHelper<User>();
    const columns = [
      col.accessor('name', { header: '姓名', width: 120 }),
      col.accessor('score', {
        header: '分数',
        cell: ({ row }) => `${row.original.score} 分`,
      }),
      col.display({
        id: 'action',
        header: '操作',
        cell: ({ row }) => h('button', {}, `编辑#${row.original.id}`),
      }),
    ];

    const mounted = mountSTable<User>({ columns, dataSource: data, rowKey: 'id' });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(headerTexts()).toEqual(['姓名', '分数', '操作']);
    const cells = firstBodyRowCells();
    expect(cells[0]).toBe('Tom');
    expect(cells[1]).toBe('90 分');
    expect(cells[2]).toBe('编辑#1');
  });

  it('helper.group 生成分组表头', async () => {
    const col = createSTableColumnHelper<User>();
    const columns = [
      col.group({
        id: 'basicInfo',
        header: '基本信息',
        columns: [
          col.accessor('name', { header: '姓名' }),
          col.accessor('score', { header: '分数' }),
        ],
      }),
    ];

    const mounted = mountSTable<User>({ columns, dataSource: data, rowKey: 'id' });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const headers = headerTexts();
    expect(headers).toContain('基本信息');
    expect(headers).toContain('姓名');
    expect(headers).toContain('分数');
  });

  it('satisfies 可直接约束列数组，无需运行时 identity helper', async () => {
    const columns = [
      { accessorKey: 'name', header: '姓名' },
      { accessorKey: 'score', header: '分数' },
    ] satisfies STableColumn<User>[];

    const mounted = mountSTable<User>({ columns, dataSource: data, rowKey: 'id' });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(headerTexts()).toEqual(['姓名', '分数']);
  });

  it('顶层 accessorKey 推导对应字段值类型', () => {
    const col = createSTableColumnHelper<User>();
    const score = col.accessor('score', {
      cell: ({ getValue }) => getValue().toFixed(1),
    });

    expectTypeOf(score).toEqualTypeOf<STableAccessorKeyColumn<User, number>>();
  });

  it('仅声accessorKey 的列也能解析 onCell 配置', async () => {
    const columns: STableColumn<User>[] = [
      {
        accessorKey: 'name',
        header: '姓名',
        onCell: (_record, rowIndex) => ({ rowSpan: rowIndex === 0 ? 2 : 0 }),
      },
    ];

    const mounted = mountSTable<User>({ columns, dataSource: data, rowKey: 'id' });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const cells = host.querySelectorAll('tbody td.s-table-cell');
    expect(cells).toHaveLength(1);
    expect(cells[0]?.getAttribute('rowspan')).toBe('2');
  });

  it('spanRows 直接复用 TanStack cellSpanningFeature', async () => {
    const columns: STableColumn<User>[] = [{ accessorKey: 'name', header: '姓名', spanRows: true }];
    const repeatedData: User[] = [
      { id: 1, name: 'Tom', score: 90 },
      { id: 2, name: 'Tom', score: 80 },
    ];

    const mounted = mountSTable<User>({ columns, dataSource: repeatedData, rowKey: 'id' });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const cells = host.querySelectorAll('tbody td.s-table-cell');
    expect(cells).toHaveLength(1);
    expect(cells[0]?.getAttribute('rowspan')).toBe('2');
  });

  it('spanRows 函数接收稳定业务上下文而非 TanStack Row', async () => {
    const contexts: Array<{
      record: User;
      previousRecord: User;
      rowIndex: number;
      columnId: string;
    }> = [];
    const columns: STableColumn<User>[] = [
      {
        accessorKey: 'name',
        header: '姓名',
        spanRows: (context) => {
          contexts.push(context);
          expect('row' in context).toBe(false);
          return context.previousRecord.name === context.record.name;
        },
      },
    ];
    const repeatedData: User[] = [
      { id: 1, name: 'Tom', score: 90 },
      { id: 2, name: 'Tom', score: 80 },
    ];

    const mounted = mountSTable<User>({ columns, dataSource: repeatedData, rowKey: 'id' });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(contexts.length).toBeGreaterThan(0);
    expect(contexts[0]!.record.name).toBe('Tom');
    expect(contexts[0]!.columnId).toBe('name');
    expect(host.querySelector('tbody td.s-table-cell')?.getAttribute('rowspan')).toBe('2');
  });

  it('响应式原地修改列配置后会重新归一TanStack 列定', async () => {
    const columns = reactive([
      { accessorKey: 'name', header: '姓名' },
      { accessorKey: 'score', header: '分数' },
    ] as Array<Record<string, unknown>>) as unknown as STableColumn<User>[];

    const mounted = mountSTable<User>(() => ({ columns, dataSource: data, rowKey: 'id' }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();
    expect(headerTexts()).toEqual(['姓名', '分数']);

    columns[0]!.header = '用户姓名';
    await nextTick();
    expect(headerTexts()).toEqual(['用户姓名', '分数']);
  });

  it('响应式修改单元格渲染器后会刷新已有行，而不是被 v-memo 锁住', async () => {
    const columns = reactive([
      {
        id: 'name',
        accessorKey: 'name',
        header: '姓名',
        cell: ({ getValue }: { getValue: () => unknown }) => `${String(getValue())}`,
      },
    ] as Array<Record<string, unknown>>) as unknown as STableColumn<User>[];

    const mounted = mountSTable<User>(() => ({ columns, dataSource: data, rowKey: 'id' }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();
    expect(firstBodyRowCells()).toEqual(['Tom']);

    columns[0]!.cell = ({ getValue }: { getValue: () => unknown }) => `${String(getValue())}`;
    await nextTick();
    expect(firstBodyRowCells()).toEqual(['Tom']);
  });

  it('响应式添加和移除 onCell 后会刷新已有行，而不是被 v-memo 锁住', async () => {
    const columns = reactive([{ id: 'name', accessorKey: 'name', header: '姓名' }] as Array<
      Record<string, unknown>
    >) as unknown as STableColumn<User>[];
    const mounted = mountSTable<User>(() => ({ columns, dataSource: data, rowKey: 'id' }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();
    expect(host.querySelectorAll('tbody td.s-table-cell')).toHaveLength(2);

    columns[0]!.onCell = () => ({ rowSpan: 0 });
    await nextTick();
    expect(host.querySelectorAll('tbody td.s-table-cell')).toHaveLength(0);

    delete columns[0]!.onCell;
    await nextTick();
    expect(host.querySelectorAll('tbody td.s-table-cell')).toHaveLength(2);
  });

  it('嵌套 accessorKey TanStack ID、单元格取值保持一', async () => {
    interface NestedUser {
      id: number;
      profile: { name: string };
    }
    const nestedColumns = [
      {
        accessorKey: 'profile.name',
        header: '姓名',
        sorter: true,
        fixed: 'left',
      },
    ] as unknown as STableColumn<NestedUser>[];
    const mounted = mountSTable<NestedUser>({
      columns: nestedColumns,
      dataSource: [{ id: 1, profile: { name: 'Tom' } }],
      rowKey: 'id',
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(host.querySelector('th[data-column-id="profile_name"]')).not.toBeNull();
    expect(host.querySelector('tbody tr.s-table-row td')?.textContent?.trim()).toBe('Tom');
  });

  it('列 align 会作用到表头和单元格', async () => {
    const mounted = mountSTable<User>({
      columns: [
        { accessorKey: 'name', header: '姓名' },
        { accessorKey: 'score', header: '分数', align: 'right' },
      ],
      dataSource: data,
      rowKey: 'id',
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const header = host.querySelector<HTMLElement>('th[data-column-id="score"]');
    const cell = host.querySelector<HTMLElement>('td[data-column-id="score"]');
    expect(header?.style.textAlign).toBe('right');
    expect(cell?.style.textAlign).toBe('right');
    expect(host.querySelector<HTMLElement>('th[data-column-id="name"]')?.style.textAlign).toBe('');
  });

  it('循环列树和超深列树会被统一截断', async () => {
    const cyclic = { id: 'cyclic', header: 'Cyclic' } as STableColumn<User>;
    cyclic.columns = [cyclic];

    let nested: STableColumn<User> = { id: 'leaf', accessorKey: 'name', header: 'Leaf' };
    for (let depth = 24; depth >= 0; depth--) {
      nested = { id: `group-${depth}`, header: `Group ${depth}`, columns: [nested] };
    }
    const tableRef = ref<STableInstance<User>>();
    const mounted = mountSTable<User>({
      columns: [cyclic, nested],
      dataSource: data,
      rowKey: 'id',
      ref: tableRef,
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const flatColumns = tableRef.value!.getTanStackTable().getAllFlatColumns();
    expect(flatColumns.some((column) => column.id === 'cyclic')).toBe(true);
    expect(flatColumns.filter((column) => column.id.startsWith('group-'))).toHaveLength(20);
    expect(flatColumns.some((column) => column.id === 'leaf')).toBe(false);
  });
});
