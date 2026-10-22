/** 导出数据来源。 */
export type STableExportSource = 'all' | 'currentPage' | 'selected';

/** 导出列定义；未提供时使用当前可见业务叶子列。 */
export interface STableExportColumn<TData = unknown> {
  /** 列 ID。 */
  columnId: string;
  /** 表头文本；默认取列定义中的字符串表头。 */
  header?: string;
  /** 自定义取值；默认按列 accessor 读取。 */
  getValue?: (record: TData, rowIndex: number) => unknown;
  /** 序列化前的最终格式化。 */
  format?: (value: unknown, record: TData, rowIndex: number) => unknown;
}

/** CSV / Excel 共用的导出选项。 */
export interface STableExportOptions<TData = unknown> {
  /** 导出列；默认当前可见业务叶子列。 */
  columns?: STableExportColumn<TData>[];
  /** 数据来源；默认 `all`。 */
  dataSource?: STableExportSource | readonly TData[];
  /** 是否包含表头行。 @default true */
  includeHeaders?: boolean;
  /** 字段分隔符。 @default ',' */
  delimiter?: string;
  /** 是否写入 UTF-8 BOM。 @default true */
  bom?: boolean;
  /** 是否防止公式注入。 @default true */
  preventFormulaInjection?: boolean;
  /** 异步分块大小。 @default 5000 */
  chunkSize?: number;
  /** 分块进度回调。 */
  onProgress?: (processed: number, total: number) => void;
  /** 取消信号。 */
  signal?: AbortSignal;
}

/** CSV 导出选项。 */
export interface STableCsvOptions<TData = unknown> extends STableExportOptions<TData> {
  /** 下载文件名。 @default 'table.csv' */
  filename?: string;
  /** 是否触发浏览器下载。 */
  download?: boolean;
}

/** 生成 Excel 所需的、与具体 Excel 库无关的二维数据。 */
export interface STableExcelSheet {
  /** 工作表名称。 */
  name: string;
  /** 列信息。 */
  columns: Array<{ header: string; width?: number }>;
  /** 数据行；不包含表头行。 */
  rows: unknown[][];
}

/** Excel 序列化适配器；由使用方注册，核心不引入 xlsx 依赖。 */
export interface STableExcelAdapter {
  /** 文件扩展名，例如 `xlsx`。 */
  extension: string;
  /** MIME 类型。 */
  mimeType: string;
  /** 把与库无关的 sheet 写成文件内容。 */
  write: (
    sheet: STableExcelSheet,
    options: STableExcelOptions<any>
  ) => Promise<Blob | Uint8Array | ArrayBuffer> | Blob | Uint8Array | ArrayBuffer;
}

/** Excel 导出选项。 */
export interface STableExcelOptions<TData = unknown> extends STableExportOptions<TData> {
  /** 单次调用适配器；优先于全局注册。 */
  adapter?: STableExcelAdapter;
  /** 工作表名称。 @default 'Sheet1' */
  sheetName?: string;
  /** 下载文件名；默认使用适配器扩展名。 */
  filename?: string;
  /** 是否触发下载。 @default false */
  download?: boolean;
}
