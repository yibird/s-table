import { protectFormulaPrefix } from '../utils/sanitize';

const QUOTE = '"';

export interface DelimitedCellOptions {
  /** 字段分隔符（CSV 为 `,`，剪贴板 TSV 为 `\t`）。 */
  delimiter: string;
  /** 是否阻止电子表格把字段当作公式执行。默认开启。 */
  preventFormulaInjection?: boolean;
}

/** RFC 4180 转义：包含分隔符、引号或换行时整体加引号并转义内部引号。 */
export const escapeDelimitedValue = (value: string, delimiter: string): string => {
  if (value === '') return value;
  if (
    !value.includes(delimiter) &&
    !value.includes(QUOTE) &&
    !value.includes('\n') &&
    !value.includes('\r')
  ) {
    return value;
  }
  return `${QUOTE}${value.replaceAll(QUOTE, QUOTE + QUOTE)}${QUOTE}`;
};

/** 把任意单元格值序列化为一个分隔符字段（含公式注入防护与 RFC 4180 转义）。 */
export const serializeDelimitedCell = (
  value: unknown,
  { delimiter, preventFormulaInjection = true }: DelimitedCellOptions
): string =>
  escapeDelimitedValue(
    protectFormulaPrefix(value == null ? '' : String(value), preventFormulaInjection),
    delimiter
  );

/** 把二维值矩阵序列化为分页文本（行以 CRLF 分隔，不含 BOM）。 */
export const serializeDelimitedRows = (
  rows: readonly (readonly unknown[])[],
  options: DelimitedCellOptions
): string =>
  rows
    .map((row) =>
      row.map((value) => serializeDelimitedCell(value, options)).join(options.delimiter)
    )
    .join('\r\n');
