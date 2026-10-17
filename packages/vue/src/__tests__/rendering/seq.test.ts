import { describe, it, expect, afterEach } from 'vitest';
import { nextTick, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn } from '../../types';
import { zh_CN } from '../../locales';

interface Row {
  id: number;
  name: string;
}

let app: App | null = null;
let host: HTMLElement | null = null;

const mkData = (n: number): Row[] =>
  Array.from({ length: n }).map((_, i) => ({ id: i + 1, name: `n${i + 1}` }));

const columns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: 'Name' },
];

/** 读取序号列（第一列）的文本*/
const getSerialCol = (): string[] => {
  const bodyRows = Array.from(host!.querySelectorAll('tbody tr.s-table-row'));
  return bodyRows.map((tr) => {
    const cell = tr.querySelector('td.s-table-cell:first-child');
    return cell?.textContent?.trim() ?? '';
  });
};

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('内置序号', () => {
  it('seq=true：无分页时从 1 连续编号', async () => {
    const mounted = mountSTable<Row>({ columns, dataSource: mkData(3), seq: true });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(getSerialCol()).toEqual(['1', '2', '3']);
    expect(host.querySelector('thead th .s-table-cell-title')?.textContent?.trim()).toBe('No.');
  });

  it('分页联动：第二页序号11 续算', async () => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource: mkData(25),
      seq: true,
      pagination: { defaultPageSize: 10 },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(getSerialCol()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);

    const nextBtn = host.querySelector<HTMLElement>('.s-pagination-next')!;
    nextBtn.click();
    await nextTick();

    expect(getSerialCol()).toEqual(['11', '12', '13', '14', '15', '16', '17', '18', '19', '20']);
  });

  it('paginate=false：每页均startIndex 重新计数', async () => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource: mkData(25),
      seq: { paginate: false, startIndex: 1 },
      pagination: { defaultPageSize: 10 },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const nextBtn = host.querySelector<HTMLElement>('.s-pagination-next')!;
    nextBtn.click();
    await nextTick();

    // 第二页仍?1 计数
    expect(getSerialCol()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
  });

  it('startIndex 与自定义标题生效', async () => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource: mkData(2),
      seq: { startIndex: 0, title: 'No.' },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(getSerialCol()).toEqual(['0', '1']);
    const firstHeader = host.querySelector('thead th .s-table-cell-title')?.textContent?.trim();
    expect(firstHeader).toBe('No.');
  });

  it('默认序号列表头跟locale', async () => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource: mkData(1),
      seq: true,
      locale: zh_CN,
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(host.querySelector('thead th .s-table-cell-title')?.textContent?.trim()).toBe('序号');
  });

  it('renderCell 自定义渲染序号内', async () => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource: mkData(2),
      seq: { renderCell: (index: number) => `#${index}` },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(getSerialCol()).toEqual(['#1', '#2']);
  });
});
