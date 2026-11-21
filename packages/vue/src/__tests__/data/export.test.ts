import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { nextTick, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn, STableInstance } from '../../types';

interface Row {
  id: number;
  name: string;
  score: number;
}

const columns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'score', accessorKey: 'score', header: 'Score' },
];

const dataSource: Row[] = [
  { id: 1, name: 'a', score: 10 },
  { id: 2, name: 'b', score: 20 },
  { id: 3, name: 'c', score: 30 },
];

let app: App | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

const mountWithInstance = async (props: Record<string, unknown> = {}) => {
  let instance: STableInstance<Row> | null = null;
  const mounted = mountSTable<Row>({
    columns,
    dataSource,
    rowKey: 'id',
    ref: (value: unknown) => {
      instance = value as STableInstance<Row>;
    },
    ...props,
  } as never);
  app = mounted.app;
  host = mounted.host;
  await nextTick();
  return instance!;
};

const csvLines = (content: string) => content.replace(/^\uFEFF/, '').split('\r\n');

describe('实例导出 API', () => {
  it('默认导出全部行并排除内部注入列', async () => {
    const instance = await mountWithInstance({ rowSelection: { type: 'checkbox' }, seq: true });

    const content = instance.exportCsv();
    expect(csvLines(content)).toEqual(['ID,Name,Score', '1,a,10', '2,b,20', '3,c,30']);
    expect(instance.getExportColumns().map((column) => column.columnId)).toEqual([
      'id',
      'name',
      'score',
    ]);
  });

  it('getAllData / getCurrentPageData 返回当前行模型快照', async () => {
    const instance = await mountWithInstance({
      columns: columns.map((column) => ({ ...column, sorter: true })),
      pagination: { defaultPageSize: 2 },
    });

    expect(instance.getAllData().map((row) => row.id)).toEqual([1, 2, 3]);
    expect(instance.getCurrentPageData().map((row) => row.id)).toEqual([1, 2]);

    instance.setSorting([{ columnId: 'score', order: 'descend' }]);
    await nextTick();

    expect(instance.getAllData().map((row) => row.id)).toEqual([3, 2, 1]);
    expect(instance.getCurrentPageData().map((row) => row.id)).toEqual([3, 2]);

    // 返回快照数组，调用方修改不会污染内部行模型。
    instance.getAllData().pop();
    expect(instance.getAllData()).toHaveLength(3);
  });

  it('currentPage / selected / 自定义列来源', async () => {
    const instance = await mountWithInstance({
      rowSelection: { type: 'checkbox' },
      pagination: { defaultCurrent: 2, defaultPageSize: 2 },
    });
    expect(csvLines(instance.exportCsv({ dataSource: 'currentPage' }))).toEqual([
      'ID,Name,Score',
      '3,c,30',
    ]);

    instance.toggleRowSelection(dataSource[0]!, true);
    await nextTick();
    expect(csvLines(instance.exportCsv({ dataSource: 'selected' }))).toEqual([
      'ID,Name,Score',
      '1,a,10',
    ]);

    expect(
      csvLines(
        instance.exportCsv({
          columns: [
            { columnId: 'name', header: '名称' },
            {
              columnId: 'double',
              header: '双倍',
              getValue: (row) => row.score * 2,
            },
          ],
          dataSource: [dataSource[1]!],
        })
      )
    ).toEqual(['名称,双倍', 'b,40']);
  });

  it('异步 CSV 只在当前块取值，取消后不格式化后续行', async () => {
    const instance = await mountWithInstance();
    const controller = new AbortController();
    const format = vi.fn((value: unknown) => value);
    const progress = vi.fn(() => controller.abort());
    await expect(
      instance.exportCsvAsync({
        download: false,
        chunkSize: 2,
        columns: [{ columnId: 'name', format }],
        signal: controller.signal,
        onProgress: progress,
      })
    ).rejects.toMatchObject({ name: 'AbortError' });
    // 表头占第一块的一行，因此只应格式化首条业务记录。
    expect(format).toHaveBeenCalledTimes(1);
    expect(progress).toHaveBeenCalledWith(2, 4);
  });

  it('无表头和空数据的异步 CSV 保持字节一致，取消不触发默认下载', async () => {
    const instance = await mountWithInstance();
    for (const rows of [dataSource, []]) {
      const options = { dataSource: rows, includeHeaders: false, download: false, bom: false };
      const blob = await instance.exportCsvAsync(options);
      expect(await blob.text()).toBe(instance.exportCsv(options));
    }
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    try {
      const controller = new AbortController();
      await expect(
        instance.exportCsvAsync({
          signal: controller.signal,
          onProgress: () => controller.abort(),
        })
      ).rejects.toMatchObject({ name: 'AbortError' });
      expect(click).not.toHaveBeenCalled();
    } finally {
      click.mockRestore();
    }
  });

  it('异步 CSV 与同步输出一致，Excel 每个值只格式化一次', async () => {
    const instance = await mountWithInstance();
    const format = vi.fn((value: unknown) => `value:${value}`);
    const options = { columns: [{ columnId: 'name', format }], download: false };
    const sync = instance.exportCsv(options);
    format.mockClear();
    const blob = await instance.exportCsvAsync({ ...options, chunkSize: 2 });
    expect(await blob.text()).toBe(sync);
    expect(format).toHaveBeenCalledTimes(dataSource.length);
    format.mockClear();
    await instance.exportExcel({
      ...options,
      adapter: {
        extension: 'xlsx',
        mimeType: 'application/vnd.ms-excel',
        write: (sheet) => {
          expect(sheet.rows).toEqual([['value:a'], ['value:b'], ['value:c']]);
          return new Uint8Array();
        },
      },
    });
    expect(format).toHaveBeenCalledTimes(dataSource.length);
  });

  it('exportExcel 需要适配器并按需调用', async () => {
    const instance = await mountWithInstance();
    await expect(instance.exportExcel()).rejects.toThrow(/No Excel adapter registered/);

    const sheetNames: string[] = [];
    const result = await instance.exportExcel({
      adapter: {
        extension: 'xlsx',
        mimeType: 'application/vnd.ms-excel',
        write: (sheet) => {
          sheetNames.push(sheet.name);
          return new Uint8Array([sheet.rows.length]);
        },
      },
      dataSource: [dataSource[0]!],
    });

    expect(sheetNames).toEqual(['Sheet1']);
    expect(result).toBeInstanceOf(Uint8Array);
    expect((result as Uint8Array)[0]).toBe(1);
  });
});
