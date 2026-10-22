/**
 * 导出子入口：仅依赖 core 的纯函数，便于按需加载且不把导出逻辑打进主 bundle。
 */
export {
  buildCsvChunksAsync,
  buildCsvContent,
  buildExcelSheet,
  downloadBlob,
  getSTableExcelAdapter,
  registerSTableExcelAdapter,
} from '@zchengfeng/s-table-core';
export type {
  STableCsvOptions,
  STableExcelAdapter,
  STableExcelOptions,
  STableExcelSheet,
  STableExportColumn,
  STableExportOptions,
  STableExportSource,
} from '@zchengfeng/s-table-core';
