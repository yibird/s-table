import { escapeDelimitedValue } from '../clipboard';
import { protectFormulaPrefix } from '../utils/sanitize';
import type { STableExportOptions } from './types';

const BOM = '\uFEFF';
const DEFAULT_DELIMITER = ',';
const DEFAULT_CHUNK_SIZE = 5000;

type CsvEncodingOptions = Pick<
  STableExportOptions,
  'delimiter' | 'preventFormulaInjection' | 'bom'
>;

const resolveDelimiter = (options: CsvEncodingOptions): string =>
  options.delimiter && options.delimiter.length > 0 ? options.delimiter : DEFAULT_DELIMITER;

/**
 * 导出单元格序列化：只对字符串做公式注入防护。
 * 负数、布尔值等保持原样输出，避免把 `-5` 误判为公式。
 */
const serializeExportCell = (value: unknown, options: CsvEncodingOptions): string => {
  if (value == null) return '';
  const text = String(value);
  const protectedText =
    typeof value === 'string'
      ? protectFormulaPrefix(text, options.preventFormulaInjection !== false)
      : text;
  return escapeDelimitedValue(protectedText, resolveDelimiter(options));
};

const serializeExportRows = (
  rows: readonly (readonly unknown[])[],
  options: CsvEncodingOptions
): string =>
  rows
    .map((row) =>
      row.map((value) => serializeExportCell(value, options)).join(resolveDelimiter(options))
    )
    .join('\r\n');

/** 把二维矩阵编码为 CSV 文本（可选 BOM，CRLF 行分隔）。 */
export const buildCsvContent = (
  rows: readonly (readonly unknown[])[],
  options: CsvEncodingOptions = {}
): string => {
  const content = serializeExportRows(rows, options);
  return options.bom === false ? content : BOM + content;
};

/** 分块编码；每一块都是可独立拼接的文本片段（首块含 BOM，块之间补 CRLF）。 */
export const buildCsvChunks = (
  rows: readonly (readonly unknown[])[],
  options: CsvEncodingOptions & { chunkSize?: number } = {}
): string[] => {
  const chunkSize =
    options.chunkSize && options.chunkSize > 0
      ? Math.max(1, Math.floor(options.chunkSize))
      : DEFAULT_CHUNK_SIZE;
  const chunks: string[] = [];
  for (let start = 0; start < rows.length; start += chunkSize) {
    const slice = rows.slice(start, start + chunkSize);
    const text =
      start === 0 ? buildCsvContent(slice, options) : serializeExportRows(slice, options);
    chunks.push(start === 0 ? text : `\r\n${text}`);
  }
  if (rows.length === 0) chunks.push(options.bom === false ? '' : BOM);
  return chunks;
};

/** 异步分块编码，按块让出主线程，并支持取消与进度回调。 */
export const buildCsvChunksAsync = async (
  rows: readonly (readonly unknown[])[],
  options: CsvEncodingOptions & {
    chunkSize?: number;
    onProgress?: (processed: number, total: number) => void;
    signal?: AbortSignal;
  } = {}
): Promise<string[]> => {
  const chunkSize =
    options.chunkSize && options.chunkSize > 0
      ? Math.max(1, Math.floor(options.chunkSize))
      : DEFAULT_CHUNK_SIZE;
  const total = rows.length;
  const chunks: string[] = [];

  for (let start = 0; start < total; start += chunkSize) {
    if (options.signal?.aborted) {
      throw new DOMException('Export aborted', 'AbortError');
    }
    const slice = rows.slice(start, start + chunkSize);
    chunks.push(
      start === 0 ? buildCsvContent(slice, options) : `\r\n${serializeExportRows(slice, options)}`
    );
    const processed = Math.min(start + chunkSize, total);
    options.onProgress?.(processed, total);
    // 让出主线程，避免大表导出阻塞滚动/输入。
    await new Promise<void>((resolve) => {
      if (typeof setTimeout === 'function') setTimeout(resolve, 0);
      else resolve();
    });
  }

  if (total === 0) chunks.push(options.bom === false ? '' : BOM);
  return chunks;
};
