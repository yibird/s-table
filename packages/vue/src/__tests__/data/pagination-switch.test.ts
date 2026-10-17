import { describe, it, expect, afterEach } from 'vitest';
import { nextTick, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn } from '../../types';

interface Row {
  id: number;
  name: string;
}

let app: App | null = null;
let host: HTMLElement | null = null;

const mkData = (): Row[] =>
  Array.from({ length: 25 }).map((_, i) => ({ id: i + 1, name: `n${i + 1}` }));

const columns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: 'Name' },
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

describe('切换分页数据变化', () => {
  it('defaultCurrent 在首次行模型计算后仍保持指定', async () => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource: mkData(),
      pagination: { defaultPageSize: 10, defaultCurrent: 2 },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(getBodyCol(0)).toEqual(['11', '12', '13', '14', '15', '16', '17', '18', '19', '20']);
  });

  it('点击下一页：渲染的行切换到第二页', async () => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource: mkData(),
      pagination: { defaultPageSize: 10 },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(getBodyCol(0)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);

    const nextBtn = host.querySelector<HTMLElement>('.s-pagination-next')!;
    nextBtn.click();
    await nextTick();

    expect(getBodyCol(0)).toEqual(['11', '12', '13', '14', '15', '16', '17', '18', '19', '20']);
  });

  it('点击页码 3：渲染最后一页剩余行', async () => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource: mkData(),
      pagination: { defaultPageSize: 10 },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const pageBtns = Array.from(host.querySelectorAll<HTMLElement>('.s-pagination-item'));
    const page3 = pageBtns.find((b) => b.textContent?.trim() === '3');
    expect(page3).toBeTruthy();
    page3!.click();
    await nextTick();

    expect(getBodyCol(0)).toEqual(['21', '22', '23', '24', '25']);
  });
});
