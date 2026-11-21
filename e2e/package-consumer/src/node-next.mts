import type {
  STableColumns,
  STableInstance,
  STableProps,
  STableSlots,
  STableRowKeyField,
  STableFilterValue,
  STableColumnFilterValue,
  STableAggregation,
  STableAggregationFn,
  STableBuiltInAggregation,
  STableSelectionHeaderContext,
  STableCsvRowSource,
  STableEmits,
  STablePaginationProps,
} from '@zchengfeng/s-table-vue';

import {
  buildCsvChunksAsync,
  type STableCsvRowSource as ExportCsvRowSource,
} from '@zchengfeng/s-table-vue/export';

interface RecordRow {
  id: number;
  name: string;
  details?: { active: boolean };
}

export const unsupportedPagination: STablePaginationProps = {
  // @ts-expect-error Pagination only supports its built-in item content.
  itemRender: () => 'custom',
};

export const rowKey: STableRowKeyField<RecordRow> = 'id';
// @ts-expect-error Unknown row fields cannot become a row key.
export const invalidRowKey: STableRowKeyField<RecordRow> = 'missing';
// @ts-expect-error Object-valued fields cannot be row keys.
export const objectRowKey: STableRowKeyField<RecordRow> = 'details';
export const filter: STableFilterValue = false;
// @ts-expect-error Filter values are scalar, not arbitrary objects.
export const invalidFilter: STableFilterValue = {};
export const builtIn: STableBuiltInAggregation = 'sum';
export const aggregate: STableAggregationFn<RecordRow, number> = (values, records) =>
  values.reduce((sum, value) => sum + value, 0) + records.length;
export const aggregation: STableAggregation<RecordRow, number> = aggregate;
// @ts-expect-error Unknown built-in aggregations are rejected.
export const invalidAggregation: STableAggregation<RecordRow> = 'invalid';
export const cancelCopy: NonNullable<STableProps<RecordRow>['onCellRangeCopy']> = () => false;
// @ts-expect-error Cancellation is a callback prop, not a notification emit.
export type CopyNotification = STableEmits<RecordRow>['cellRangeCopy'];
export const csvRows: STableCsvRowSource = { length: 1, getRow: () => [1, 'Ada'] };
export const exportRows: ExportCsvRowSource = csvRows;
export const csvChunks = () => buildCsvChunksAsync(exportRows);

export type PackageContracts = {
  columns: STableColumns<RecordRow>;
  instance: STableInstance<RecordRow>;
  props: STableProps<RecordRow>;
  slots: STableSlots<RecordRow>;
  selectionHeader: STableSelectionHeaderContext<RecordRow>;
  columnFilter: STableColumnFilterValue;
};
