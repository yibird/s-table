import { describe, it, expect, afterEach } from 'vitest';
import { nextTick, reactive, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn } from '../../types';

/**
 * 列宽 <col> 输出策略测试 *
 * 未显式设宽的列不应输出固<col width>（留空由 table-layout:fixed 平分容器宽度 * 容器 overflow:auto 已自动扣除竖向滚动条宽度）；显式设宽的列才输出固定宽度 */

interface Row {
  id: number;
  name: string;
}

let app: App | null = null;
let host: HTMLElement | null = null;

const mount = async (columns: STableColumn<Row>[]) => {
  const mounted = mountSTable<Row>({
    columns,
    dataSource: [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ],
  });
  app = mounted.app;
  host = mounted.host;
  await nextTick();
};

const getColWidths = (): (string | null)[] => {
  const cols = Array.from(host!.querySelectorAll('colgroup col'));
  return cols.map((c) => (c as HTMLElement).style.width || null);
};

const getResolvedPosition = (element: HTMLElement, property: 'left' | 'right') => {
  const value = element.style.getPropertyValue(property);
  const variableName = /^var\((--[^)]+)\)$/.exec(value)?.[1];
  return variableName ? element.closest('table')?.style.getPropertyValue(variableName) : value;
};

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('列宽 <col> 输出策略', () => {
  it('全部未设宽：所<col> 不输出固width', async () => {
    await mount([
      { id: 'id', accessorKey: 'id', header: 'ID' },
      { id: 'name', accessorKey: 'name', header: 'Name' },
    ]);
    expect(getColWidths()).toEqual([null, null]);
  });

  it('部分设宽：仅设宽列输width，未设宽列留', async () => {
    await mount([
      { id: 'id', accessorKey: 'id', header: 'ID', width: 80 },
      { id: 'name', accessorKey: 'name', header: 'Name' },
    ]);
    const widths = getColWidths();
    expect(widths[0]).toBe('80px');
    expect(widths[1]).toBeNull();
  });

  it('固定列未设宽时锁TanStack 默认宽度，保sticky 偏移一', async () => {
    await mount([
      { id: 'id', accessorKey: 'id', header: 'ID', fixed: 'left' },
      { id: 'name', accessorKey: 'name', header: 'Name' },
    ]);
    expect(getColWidths()).toEqual(['150px', null]);
  });

  it('内部拖拽、选择和展开列保留各自的紧凑宽度', async () => {
    const mounted = mountSTable<Row>({
      columns: [{ id: 'name', accessorKey: 'name', header: 'Name' }],
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
      rowDrag: true,
      rowSelection: { type: 'checkbox' },
      expandable: {},
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(getColWidths()).toEqual(['40px', '62px', '40px', null]);
  });

  it('分组列固定配置向叶子列继承，并锁定对应宽', async () => {
    await mount([
      { id: 'prefix', accessorKey: 'id', header: 'Prefix', fixed: 'left', width: 50 },
      {
        id: 'identity',
        header: 'Identity',
        fixed: 'left',
        columns: [
          { id: 'id', accessorKey: 'id', header: 'ID' },
          { id: 'name', accessorKey: 'name', header: 'Name' },
        ],
      },
    ]);

    expect(getColWidths()).toEqual(['50px', '150px', '150px']);
    expect(host!.querySelectorAll('tbody .s-table-cell-fixed-left')).toHaveLength(6);
    const groupHeader = Array.from(host!.querySelectorAll<HTMLTableCellElement>('thead th')).find(
      (cell) => cell.textContent?.trim() === 'Identity'
    );
    expect(groupHeader?.classList.contains('s-table-cell-fixed-left')).toBe(true);
    expect(getResolvedPosition(groupHeader!, 'left')).toBe('50px');
  });

  it('响应式修改前置固定列宽度后刷新后sticky 偏移', async () => {
    const columns = reactive([
      { id: 'id', accessorKey: 'id', header: 'ID', fixed: 'left', width: 50 },
      { id: 'name', accessorKey: 'name', header: 'Name', fixed: 'left', width: 80 },
    ]) as unknown as STableColumn<Row>[];
    const mounted = mountSTable<Row>(() => ({
      columns,
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const getSecondCell = () =>
      host!.querySelector<HTMLTableCellElement>('tbody tr.s-table-row td:nth-child(2)')!;
    expect(getResolvedPosition(getSecondCell(), 'left')).toBe('50px');

    columns[0]!.width = 100;
    await nextTick();

    expect(getResolvedPosition(getSecondCell(), 'left')).toBe('100px');
  });
});
