import { table_getRowsInDisplayOrder } from '@tanstack/table-core/static-functions';
import type { Row, RowData, RowModel, Table, TableFeatures } from '@tanstack/vue-table';
import type { Ref } from 'vue';

/**
 * `table_getRowsInDisplayOrder` 只依赖这两个字段；把最小输入形状留在适配层，
 * 避免业务编排代码伪造一个完整的 TanStack Table。
 */
type DisplayOrderTable<TData extends RowData> = {
  getPrePaginatedRowModel: () => Pick<RowModel<TableFeatures, TData>, 'rows'>;
  options: Pick<Table<TableFeatures, TData>['options'], 'paginateExpandedRows'>;
};

export const getRowsInDisplayOrder = <TData extends RowData>(table: DisplayOrderTable<TData>) =>
  table_getRowsInDisplayOrder(table as Table<TableFeatures, TData>);

type VisibleRowIndexCache = {
  sourceRows: readonly object[];
  pinning: object | undefined;
  indexes: WeakMap<object, number>;
};

const visibleRowIndexCache = new WeakMap<object, VisibleRowIndexCache>();

/** 返回当前分页窗口及固定行重排后的公开可见索引。 */
export const getRowVisibleIndex = <TData extends RowData>(
  row: Row<TableFeatures, TData>
): number => {
  const table = row.table;
  const pinning = table.options.state?.rowPinning;
  const pinned = Boolean(pinning && (pinning.top.length > 0 || pinning.bottom.length > 0));
  const sourceRows = table.getRowModel().rows;
  const cached = visibleRowIndexCache.get(table);
  if (cached && cached.sourceRows === sourceRows && cached.pinning === pinning) {
    return cached.indexes.get(row) ?? -1;
  }

  const visibleRows = pinned
    ? [...table.getTopRows(), ...table.getCenterRows(), ...table.getBottomRows()]
    : sourceRows;
  const indexes = new WeakMap<object, number>();
  for (let index = 0; index < visibleRows.length; index++) {
    const visibleRow = visibleRows[index];
    if (visibleRow) indexes.set(visibleRow, index);
  }
  visibleRowIndexCache.set(table, { sourceRows, pinning, indexes });
  return indexes.get(row) ?? -1;
};

type InstallPinnedRowsDisplayOrderOptions<TData extends RowData> = {
  table: Table<TableFeatures, TData>;
  rows: Readonly<Ref<RowModel<TableFeatures, TData>['rows']>>;
  enabled: Readonly<Ref<boolean>>;
};

/**
 * 让 TanStack 的公开显示索引与 STable 固定行后的实际渲染顺序一致。
 * 对上游实例方法的兼容包装集中在 adapter，业务 hook 不感知其实现细节。
 *
 * 为什么需要 restoreDefaultIndexes 状态机：TanStack 的 `table_getRowsInDisplayOrder`
 * 是带 memoDeps 的记忆化方法，memo 命中时不会重跑函数体（也就不会重建
 * `_displayIndexCache`）。关闭固定行后必须主动调用一次 `getRowsInDisplayOrder(table)`
 * 强制重建索引缓存，否则显示索引会停留在固定行顺序上。
 */
export const installPinnedRowsDisplayOrder = <TData extends RowData>({
  table,
  rows,
  enabled,
}: InstallPinnedRowsDisplayOrderOptions<TData>) => {
  const getDefaultRowsInDisplayOrder = table.getRowsInDisplayOrder.bind(table);
  let indexedRows: RowModel<TableFeatures, TData>['rows'] | undefined;
  let restoreDefaultIndexes = false;
  const pinnedTable: DisplayOrderTable<TData> = {
    getPrePaginatedRowModel: () => ({ rows: rows.value }),
    options: { paginateExpandedRows: true },
  };

  table.getRowsInDisplayOrder = () => {
    if (!enabled.value) {
      const displayRows = getDefaultRowsInDisplayOrder();
      if (restoreDefaultIndexes) {
        getRowsInDisplayOrder(table);
        indexedRows = undefined;
        restoreDefaultIndexes = false;
      }
      return displayRows;
    }

    restoreDefaultIndexes = true;
    if (indexedRows === rows.value) return rows.value;
    indexedRows = getRowsInDisplayOrder(pinnedTable);
    return indexedRows;
  };
};
