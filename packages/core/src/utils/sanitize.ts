/** 防止字段被电子表格软件解释为公式（剪贴板 TSV 注入防护）。 */
export const protectFormulaPrefix = (value: string, enabled: boolean): string =>
  enabled && /^[=+\-@\t\r\n]/.test(value) ? `'${value}` : value;
