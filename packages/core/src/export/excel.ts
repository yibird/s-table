import type { STableExcelAdapter, STableExcelSheet } from './types';

let registeredAdapter: STableExcelAdapter | undefined;

/** 注册全局 Excel 适配器；传 null 清除。 */
export const registerSTableExcelAdapter = (adapter: STableExcelAdapter | null): void => {
  registeredAdapter = adapter ?? undefined;
};

/** 读取全局 Excel 适配器。 */
export const getSTableExcelAdapter = (): STableExcelAdapter | undefined => registeredAdapter;

/**
 * 把表头与二维数据投影为与 Excel 库无关的 sheet。
 * 数值 / 布尔值保持原类型，由适配器决定如何写入。
 */
export const buildExcelSheet = (
  columns: readonly { header: string; width?: number }[],
  rows: readonly (readonly unknown[])[],
  name = 'Sheet1'
): STableExcelSheet => ({
  name,
  columns: columns.map((column) => ({ header: column.header, width: column.width })),
  rows: rows.map((row) => [...row]),
});
