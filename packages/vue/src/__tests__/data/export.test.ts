import { afterEach, describe, expect, it } from 'vite-plus/test';
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
