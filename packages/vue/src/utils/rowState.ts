import type { Row, RowData, TableFeatures } from '@tanstack/vue-table';
import type { STableRowKey } from '../types';
import {
  resolveRowStateEntries as resolveCoreRowStateEntries,
  type RowStateEntry,
} from '@zchengfeng/s-table-core';

type STableRow<TData extends RowData> = Row<TableFeatures, TData>;

export type STableRowStateEntry<TData extends RowData> = RowStateEntry<STableRow<TData>>;

/** Vue 兼容入口；行状态排序算法属于 core。 */
export const resolveRowStateEntries = <TData extends RowData>(
  state: Readonly<Record<string, boolean | undefined>>,
  model:
    | { rowsById: Record<string, STableRow<TData>>; flatRows: readonly STableRow<TData>[] }
    | undefined,
  preserveMissing: boolean
): STableRowStateEntry<TData>[] =>
  resolveCoreRowStateEntries(state, model, preserveMissing) as STableRowStateEntry<TData>[];

export type { STableRowKey };
