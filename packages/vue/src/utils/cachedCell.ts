import { constructCell } from '@tanstack/vue-table';
import type { Cell, Column, Row, RowData, TableFeatures } from '@tanstack/vue-table';

type STableCell<TData extends RowData> = Cell<TableFeatures, TData>;
type STableColumn<TData extends RowData> = Column<TableFeatures, TData, unknown>;

/** 按行和列懒缓存 Cell，保持 Body 与交互逻辑使用同一份实例。 */
export const getCachedCell = <TData extends RowData>(
  row: Row<TableFeatures, TData>,
  column: STableColumn<TData>
): STableCell<TData> => {
  const cache = row._cellsCache ?? (row._cellsCache = new WeakMap());
  let cell = cache.get(column);
  if (!cell) {
    cell = constructCell(column, row, row.table);
    cache.set(column, cell);
  }
  return cell;
};
