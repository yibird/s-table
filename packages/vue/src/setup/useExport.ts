import type { RowData } from '@tanstack/vue-table';
import {
  buildCsvChunksAsync,
  buildCsvContent,
  buildExcelSheet,
  downloadBlob,
  getPath,
  getSTableExcelAdapter,
  type STableCsvOptions,
  type STableExcelOptions,
  type STableExportColumn,
  type STableExportOptions,
  type STableExportSource,
} from '@zchengfeng/s-table-core';
import { isInternalColumn } from '../utils';
import type { STableSetupContext } from './types';
import type { useDataState } from './useDataState';
import type { useTableModel } from './useTableModel';

type UseExportOptions<TData extends RowData> = {
  context: STableSetupContext<TData>;
  dataState: ReturnType<typeof useDataState<TData>>;
  tableModel: ReturnType<typeof useTableModel<TData>>;
};

type ExportColumnAccessor<TData> = {
  columnId: string;
  header: string;
  read: (record: TData, rowIndex: number) => unknown;
};

/**
 * 导出能力：把当前行模型 / 可见列投影为二维矩阵，并复用 core 的 CSV / Excel 基础设施。
 */
export const useExport = <TData extends RowData>({
  context,
  dataState,
  tableModel,
}: UseExportOptions<TData>) => {
  const { table } = tableModel;

  /** 解析导出数据源；`all` 为过滤排序后、分页前的行。 */
  const getExportRows = (source: STableExportSource | readonly TData[] = 'all'): TData[] => {
    if (Array.isArray(source)) return [...source];
    if (source === 'selected') return [...dataState.selectedRows.value];
    if (context.props.manualPagination) return [...context.dataSource.value];
    if (source === 'currentPage') {
      return table
        .getPaginatedRowModel()
        .flatRows.filter((row) => !row.getIsGrouped?.())
        .map((row) => row.original);
    }
    return table
      .getPrePaginatedRowModel()
      .flatRows.filter((row) => !row.getIsGrouped?.())
      .map((row) => row.original);
  };

  const createDefaultColumn = (column: {
    id: string;
    columnDef: Record<string, unknown>;
  }): ExportColumnAccessor<TData> => {
    const def = column.columnDef;
    const accessorKey =
      typeof def.accessorKey === 'string'
        ? def.accessorKey
        : typeof def.dataIndex === 'string'
          ? def.dataIndex
          : undefined;
    const accessorFn =
      typeof def.accessorFn === 'function'
        ? (def.accessorFn as (record: TData, index: number) => unknown)
        : undefined;
    return {
      columnId: column.id,
      header: typeof def.header === 'string' ? def.header : column.id,
      read: (record, rowIndex) => {
        if (accessorFn) return accessorFn(record, rowIndex);
        if (accessorKey) return getPath(record as never, accessorKey);
        return undefined;
      },
    };
  };

  /** 解析导出列；默认使用可见业务叶子列，排除注入列。 */
  const createDefaultColumns = (): STableExportColumn<TData>[] =>
    table
      .getVisibleLeafColumns()
      .filter((column) => !isInternalColumn(column.id))
      .map((column) => {
        const accessor = createDefaultColumn(
          column as unknown as { id: string; columnDef: Record<string, unknown> }
        );
        return {
          columnId: accessor.columnId,
          header: accessor.header,
          getValue: accessor.read,
        };
      });

  const resolveColumns = (columns?: STableExportColumn<TData>[]): STableExportColumn<TData>[] => {
    if (!columns?.length) return createDefaultColumns();
    // 自定义列未提供 getValue 时，按同名列的默认 accessor 取值。
    const defaults = new Map(createDefaultColumns().map((column) => [column.columnId, column]));
    return columns.map((column) => {
      const fallback = defaults.get(column.columnId);
      if (!fallback) return column;
      return {
        ...column,
        header: column.header ?? fallback.header,
        getValue: column.getValue ?? fallback.getValue,
      };
    });
  };

  const getExportColumns = (
    options?: Pick<STableExportOptions<TData>, 'columns'>
  ): STableExportColumn<TData>[] => resolveColumns(options?.columns);

  const resolveCellValue = (
    column: STableExportColumn<TData>,
    record: TData,
    rowIndex: number
  ): unknown => {
    const raw = column.getValue?.(record, rowIndex);
    return column.format ? column.format(raw, record, rowIndex) : raw;
  };

  const buildMatrix = (
    columns: STableExportColumn<TData>[],
    rows: TData[],
    includeHeaders: boolean
  ): unknown[][] => {
    const matrix = rows.map((record, rowIndex) =>
      columns.map((column) => resolveCellValue(column, record, rowIndex))
    );
    if (!includeHeaders) return matrix;
    return [columns.map((column) => column.header ?? column.columnId), ...matrix];
  };

  const resolveOptions = (options: STableExportOptions<TData>) => {
    const columns = resolveColumns(options.columns);
    const rows = getExportRows(options.dataSource);
    return {
      columns,
      rows,
      matrix: buildMatrix(columns, rows, options.includeHeaders !== false),
    };
  };

  /** 同步导出 CSV 文本；可选触发下载。 */
  const exportCsv = (options: STableCsvOptions<TData> = {}): string => {
    const { matrix } = resolveOptions(options);
    const content = buildCsvContent(matrix, options);
    if (options.download) {
      downloadBlob(
        new Blob([content], { type: 'text/csv;charset=utf-8' }),
        options.filename ?? 'table.csv'
      );
    }
    return content;
  };

  /** 异步分块导出 CSV；默认触发下载并返回 Blob。 */
  const exportCsvAsync = async (options: STableCsvOptions<TData> = {}): Promise<Blob> => {
    const { matrix } = resolveOptions(options);
    const chunks = await buildCsvChunksAsync(matrix, options);
    const blob = new Blob(chunks, { type: 'text/csv;charset=utf-8' });
    if (options.download !== false) {
      downloadBlob(blob, options.filename ?? 'table.csv');
    }
    return blob;
  };

  /** 导出 Excel；需要单次 adapter 或全局注册的 adapter。 */
  const exportExcel = async (
    options: STableExcelOptions<TData> = {}
  ): Promise<Blob | Uint8Array | ArrayBuffer> => {
    const adapter = options.adapter ?? getSTableExcelAdapter();
    if (!adapter) {
      throw new Error(
        'No Excel adapter registered. Call registerSTableExcelAdapter() or pass options.adapter.'
      );
    }
    const { columns, rows } = resolveOptions(options);
    const sheet = buildExcelSheet(
      columns.map((column) => ({ header: column.header ?? column.columnId })),
      rows.map((record, rowIndex) =>
        columns.map((column) => resolveCellValue(column, record, rowIndex))
      ),
      options.sheetName ?? 'Sheet1'
    );
    const result = await adapter.write(sheet, options);
    if (options.download) {
      const blob =
        typeof Blob !== 'undefined' && result instanceof Blob
          ? result
          : new Blob([result as BlobPart], { type: adapter.mimeType });
      downloadBlob(blob, options.filename ?? `table.${adapter.extension}`);
    }
    return result;
  };

  return {
    getExportRows,
    getExportColumns,
    exportCsv,
    exportCsvAsync,
    exportExcel,
  };
};

// 供 setup/useApi 推断返回值。
export type UseExportReturn<TData extends RowData> = ReturnType<typeof useExport<TData>>;
