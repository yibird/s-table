import type { Row, RowData, TableFeatures } from '@tanstack/vue-table';
import type { STableCellEvent, STableRowEvent } from '../types';
import { decodeRowKey } from './resolveRowKey';

type STableRow<TData extends RowData> = Row<TableFeatures, TData>;

/** 将 TanStack 行事件参数转换为 STable 的公开事件载荷。 */
export const toSTableRowEvent = <TData extends RowData, TEvent extends Event>(
  row: STableRow<TData>,
  index: number,
  event: TEvent
): STableRowEvent<TData, TEvent> => ({
  record: row.original,
  rowKey: decodeRowKey(row.id),
  rowIndex: index,
  event,
});

/** 在行事件载荷基础上补充列信息，统一所有单元格事件的适配逻辑。 */
export const toSTableCellEvent = <TData extends RowData, TEvent extends Event>(
  row: STableRow<TData>,
  columnId: string,
  index: number,
  columnIndex: number,
  event: TEvent
): STableCellEvent<TData, TEvent> => ({
  ...toSTableRowEvent(row, index, event),
  columnId,
  columnIndex,
  value: row.getValue(columnId),
});
