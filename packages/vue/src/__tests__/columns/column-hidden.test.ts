import { describe, it, expect, afterEach } from 'vite-plus/test';
import { nextTick, reactive, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn } from '../../types';

/**
 * 列可见性（column.hidden）回归测试 *
 * 验证声明`column.hidden: true` 通过桥接TanStack columnVisibilityFeature 后，
 * 该列的表头与单元格都不渲染，其余列正常 */

interface Row {
  id: number;
  name: string;
  secret: string;
}

let app: App | null = null;
let host: HTMLElement | null = null;

const data: Row[] = [
  { id: 1, name: 'a', secret: 'x' },
  { id: 2, name: 'b', secret: 'y' },
];

const headerTexts = (): string[] =>
  Array.from(host!.querySelectorAll('thead th')).map((th) => th.textContent?.trim() ?? '');

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('column.hidden 列可见', () => {
  it('hidden:true 的列不渲染表头，可见列正常渲', async () => {
    const columns: STableColumn<Row>[] = [
      { id: 'id', accessorKey: 'id', header: 'ID' },
      { id: 'name', accessorKey: 'name', header: 'Name' },
      { id: 'secret', accessorKey: 'secret', header: 'Secret', hidden: true },
    ];
    const mounted = mountSTable<Row>({ columns, dataSource: data, rowKey: 'id' });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const headers = headerTexts();
    expect(headers).toContain('ID');
    expect(headers).toContain('Name');
    expect(headers).not.toContain('Secret');
  });

  it('未设 hidden 时全部列渲染', async () => {
    const columns: STableColumn<Row>[] = [
      { id: 'id', accessorKey: 'id', header: 'ID' },
      { id: 'name', accessorKey: 'name', header: 'Name' },
      { id: 'secret', accessorKey: 'secret', header: 'Secret' },
    ];
    const mounted = mountSTable<Row>({ columns, dataSource: data, rowKey: 'id' });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(headerTexts()).toContain('Secret');
  });

  it('分组hidden:true 时递归隐藏全部叶子', async () => {
    const columns: STableColumn<Row>[] = [
      { id: 'id', accessorKey: 'id', header: 'ID' },
      {
        id: 'private',
        header: 'Private',
        hidden: true,
        columns: [
          { id: 'name', accessorKey: 'name', header: 'Name' },
          { id: 'secret', accessorKey: 'secret', header: 'Secret' },
        ],
      },
    ];
    const mounted = mountSTable<Row>({ columns, dataSource: data, rowKey: 'id' });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(headerTexts()).toEqual(['ID']);
  });

  it('动态切hidden 时行单元格与表头保持同步', async () => {
    const columns = reactive([
      { id: 'id', accessorKey: 'id', header: 'ID' },
      { id: 'name', accessorKey: 'name', header: 'Name' },
    ] as Array<Record<string, unknown>>) as unknown as STableColumn<Row>[];
    const mounted = mountSTable<Row>(() => ({ columns, dataSource: data, rowKey: 'id' }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(host.querySelectorAll('tbody tr.s-table-row:first-child td')).toHaveLength(2);
    columns[1]!.hidden = true;
    await nextTick();
    expect(headerTexts()).toEqual(['ID']);
    expect(host.querySelectorAll('tbody tr.s-table-row:first-child td')).toHaveLength(1);
  });
});
