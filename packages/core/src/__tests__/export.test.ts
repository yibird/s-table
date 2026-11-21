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

  it('惰性行源逐块读取，保留编码和进度，并在取消后停止读取', async () => {
    const rows = [['header'], ['a,b'], ['=1+1'], [-5], ['quote "x"']];
    const reads: number[] = [];
    const source = {
      length: rows.length,
      getRow: (index: number) => {
        reads.push(index);
        return rows[index]!;
      },
    };
    const progress: number[][] = [];
    const chunks = await buildCsvChunksAsync(source, {
      chunkSize: 2,
      onProgress: (processed, total) => progress.push([processed, total]),
    });
    expect(chunks.join('')).toBe(buildCsvContent(rows));
    expect(reads).toEqual([0, 1, 2, 3, 4]);
    expect(progress).toEqual([
      [2, 5],
      [4, 5],
      [5, 5],
    ]);

    reads.length = 0;
    const controller = new AbortController();
    await expect(
      buildCsvChunksAsync(source, {
        chunkSize: 2,
        signal: controller.signal,
        onProgress: () => controller.abort(),
      })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(reads).toEqual([0, 1]);
    expect(await buildCsvChunksAsync({ length: 0, getRow: () => [] })).toEqual(['\uFEFF']);
    expect(await buildCsvChunksAsync({ length: 0, getRow: () => [] }, { bom: false })).toEqual([
      '',
    ]);
  });

  it('惰性行源保留 getRow 方法的 this 接收者', async () => {
    const source = {
      length: 2,
      values: [['first'], ['second']],
      getRow(index: number) {
        return this.values[index]!;
      },
    };
    expect((await buildCsvChunksAsync(source, { chunkSize: 1 })).join('')).toBe(
      buildCsvContent(source.values)
    );
  });

  it('空数据预取消和最后一个进度回调取消也拒绝导出', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(buildCsvChunksAsync([], { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    const finalController = new AbortController();
    await expect(
      buildCsvChunksAsync([[1]], {
        signal: finalController.signal,
        onProgress: () => finalController.abort(),
      })
    ).rejects.toMatchObject({ name: 'AbortError' });
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
