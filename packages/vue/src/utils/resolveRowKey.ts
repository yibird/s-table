/** Vue 兼容入口；行键算法属于 core。 */
import type { RowData } from '@tanstack/table-core';
import type { STableRowKey, STableRowKeyField } from '@zchengfeng/s-table-core';
import { resolveRowKey as resolveCoreRowKey } from '@zchengfeng/s-table-core';

export {
  createRowIdAllocator,
  decodeRowKey,
  disambiguateRowId,
  encodeRowKey,
} from '@zchengfeng/s-table-core';

export const resolveRowKey = <TData extends RowData>(
  record: TData,
  index: number,
  rowKey?: STableRowKeyField<TData> | ((record: TData) => STableRowKey)
): STableRowKey =>
  resolveCoreRowKey(record, index, rowKey, {
    onInvalid: (message) => {
      if (import.meta.env?.DEV) console.warn(message);
    },
  });
