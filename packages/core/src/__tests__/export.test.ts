import { afterEach, describe, expect, it } from 'vite-plus/test';
import {
  buildCsvChunks,
  buildCsvChunksAsync,
  buildCsvContent,
  buildExcelSheet,
  getSTableExcelAdapter,
  registerSTableExcelAdapter,
  type STableExcelAdapter,
} from '../export';

describe('CSV 导出', () => {
  it('输出 BOM、CRLF、RFC 4180 转义，并只对字符串做公式注入防护', () => {
    const content = buildCsvContent([
      ['name', 'score', 'formula'],
      ['a,b', -5, '=SUM(A1)'],
      ['quote "x"', 1, '@cmd'],
    ]);

    expect(content.startsWith('\uFEFF')).toBe(true);
    expect(content).toBe(
      '\uFEFFname,score,formula\r\n"a,b",-5,\'=SUM(A1)\r\n"quote ""x""",1,\'@cmd'
    );
  });

  it('可关闭 BOM 与公式防护', () => {
    expect(buildCsvContent([['=1+1']], { bom: false, preventFormulaInjection: false })).toBe(
      '=1+1'
    );
  });

  it('小数 chunkSize 会被钳制为 1，不会无限循环', async () => {
    const rows = [[1], [2]];
    expect(buildCsvChunks(rows, { chunkSize: 0.5, bom: false }).join('')).toBe('1\r\n2');
    const chunks = await buildCsvChunksAsync(rows, { chunkSize: 0.5, bom: false });
    expect(chunks.join('')).toBe('1\r\n2');
  });

  it('分块结果拼接后与单块输出一致，并支持取消', async () => {
    const rows = Array.from({ length: 5 }, (_, index) => [index, `row-${index}`]);
    const chunks = await buildCsvChunksAsync(rows, { chunkSize: 2 });
    expect(chunks.join('')).toBe(buildCsvContent(rows));

    const controller = new AbortController();
    controller.abort();
    await expect(
      buildCsvChunksAsync(rows, { chunkSize: 2, signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('Excel 适配器', () => {
  const adapter: STableExcelAdapter = {
    extension: 'xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    write: (sheet) => new TextEncoder().encode(sheet.name),
  };

  afterEach(() => registerSTableExcelAdapter(null));

  it('buildExcelSheet 保留二维数据与列信息', () => {
    const sheet = buildExcelSheet(
      [{ header: 'A' }, { header: 'B', width: 120 }],
      [[1, true]],
      'S1'
    );
    expect(sheet).toEqual({
      name: 'S1',
      columns: [
        { header: 'A', width: undefined },
        { header: 'B', width: 120 },
      ],
      rows: [[1, true]],
    });
  });

  it('注册与清除全局适配器', () => {
    expect(getSTableExcelAdapter()).toBeUndefined();
    registerSTableExcelAdapter(adapter);
    expect(getSTableExcelAdapter()).toBe(adapter);
    registerSTableExcelAdapter(null);
    expect(getSTableExcelAdapter()).toBeUndefined();
  });
});
