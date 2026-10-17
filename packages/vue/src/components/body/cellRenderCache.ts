import type { Cell, RowData, TableFeatures } from '@tanstack/vue-table';

export type CachedCellRenderState = {
  render: unknown;
  props: object;
};

type CellRenderDependencies = {
  render: unknown;
  columnToken: readonly unknown[] | undefined;
  columnSetToken: readonly string[];
  dataSourceToken: readonly unknown[] | undefined;
  rowIndex: number;
};

type CellRenderCacheEntry = Omit<CellRenderDependencies, 'columnSetToken' | 'dataSourceToken'> & {
  state: CachedCellRenderState;
};

/**
 * 对对象行按 record + row id + column id 保存稳定渲染状态，使 TanStack 重建 Row/Cell 包装对象时
 * 仍可跳过无关重绘；数据数组身份或列渲染 token 变化后会重建 context，避免复用旧事件闭包。
 */
export const createCellRenderCache = <TData extends RowData>() => {
  let recordCache = new WeakMap<object, Map<string, CellRenderCacheEntry>>();
  let cellFallbackCache = new WeakMap<Cell<TableFeatures, TData>, CellRenderCacheEntry>();
  let activeColumnSetToken: CellRenderDependencies['columnSetToken'] | undefined;
  let activeDataSourceToken: CellRenderDependencies['dataSourceToken'];

  return (
    cell: Cell<TableFeatures, TData>,
    dependencies: CellRenderDependencies
  ): CachedCellRenderState => {
    if (
      activeColumnSetToken !== dependencies.columnSetToken ||
      activeDataSourceToken !== dependencies.dataSourceToken
    ) {
      // Body 同一时刻只消费一套数据与列。版本切换时替换整代 WeakMap，既让 context 失效，
      // 也立即释放仍存活 record 下已删除列的 Map 条目，避免动态列长期切换造成缓存增长。
      recordCache = new WeakMap();
      cellFallbackCache = new WeakMap();
      activeColumnSetToken = dependencies.columnSetToken;
      activeDataSourceToken = dependencies.dataSourceToken;
    }

    const record = cell.row.original;
    const canUseRecordIdentity =
      record !== null && (typeof record === 'object' || typeof record === 'function');
    let rowCache: Map<string, CellRenderCacheEntry> | undefined;
    let cached: CellRenderCacheEntry | undefined;
    const cacheKey = `${cell.row.id}:${cell.column.id}`;
    if (canUseRecordIdentity) {
      rowCache = recordCache.get(record as object);
      if (!rowCache) {
        rowCache = new Map();
        recordCache.set(record as object, rowCache);
      }
      cached = rowCache.get(cacheKey);
    } else {
      cached = cellFallbackCache.get(cell);
    }
    if (
      cached &&
      cached.render === dependencies.render &&
      cached.columnToken === dependencies.columnToken &&
      cached.rowIndex === dependencies.rowIndex
    ) {
      return cached.state;
    }

    const state: CachedCellRenderState = {
      render: dependencies.render,
      props: cell.getContext(),
    };
    const entry: CellRenderCacheEntry = {
      render: dependencies.render,
      columnToken: dependencies.columnToken,
      rowIndex: dependencies.rowIndex,
      state,
    };
    if (rowCache) rowCache.set(cacheKey, entry);
    else cellFallbackCache.set(cell, entry);
    return state;
  };
};
