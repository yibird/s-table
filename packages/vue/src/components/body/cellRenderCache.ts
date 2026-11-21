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
  row: object;
  state: CachedCellRenderState;
};

/** 默认最多缓存多少条 record 的渲染上下文；虚拟滚动实际只占用视口附近少量行。 */
const DEFAULT_MAX_CACHED_ROWS = 1000;

export type CellRenderCache<TData extends RowData> = {
  (cell: Cell<TableFeatures, TData>, dependencies: CellRenderDependencies): CachedCellRenderState;
  /** 当前缓存的行数，用于内存回归测试与诊断。 */
  getCachedRowCount(): number;
};

/**
 * 按 record + row id + column id 保存稳定渲染状态，跳过同一 Row 的无关重绘。
 * Row 重建（例如过滤后重新分组）、数据或列版本变化时更新 context，避免旧聚合值与事件闭包。
 *
 * recordCache 使用有界 LRU：按行淘汰，避免完整浏览大表后缓存随“曾渲染过的记录”无限增长。
 */
export const createCellRenderCache = <TData extends RowData>(
  options: {
    /** 忽略行索引与列 token 的缓存键；仅适用于不读取这些输入的纯渲染函数。 */
    ignoreCellKey?: () => boolean;
    /** 最多缓存的行数；默认 1000。 */
    maxRows?: number;
  } = {}
): CellRenderCache<TData> => {
  const maxRows = Math.max(1, Math.floor(options.maxRows ?? DEFAULT_MAX_CACHED_ROWS));
  let recordCache = new Map<object, Map<string, CellRenderCacheEntry>>();
  let cellFallbackCache = new WeakMap<Cell<TableFeatures, TData>, CellRenderCacheEntry>();
  let activeColumnSetToken: CellRenderDependencies['columnSetToken'] | undefined;
  let activeDataSourceToken: CellRenderDependencies['dataSourceToken'];
  let activeIgnoreCellKey: boolean | undefined;
  // 同一行的单元格连续渲染，只在该行首次访问时更新 LRU，避免每格两次 Map 操作。
  let lastTouchedRecord: object | undefined;

  const cache = ((
    cell: Cell<TableFeatures, TData>,
    dependencies: CellRenderDependencies
  ): CachedCellRenderState => {
    const ignoreCellKey = options.ignoreCellKey?.() ?? false;
    if (
      activeColumnSetToken !== dependencies.columnSetToken ||
      activeDataSourceToken !== dependencies.dataSourceToken ||
      activeIgnoreCellKey !== ignoreCellKey
    ) {
      activeIgnoreCellKey = ignoreCellKey;
      // Body 同一时刻只消费一套数据与列。版本切换时整代失效，既让 context 失效，
      // 也立即释放已删除列的条目，避免动态列长期切换造成缓存增长。
      recordCache = new Map();
      cellFallbackCache = new WeakMap();
      lastTouchedRecord = undefined;
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
      const recordKey = record as object;
      rowCache = recordCache.get(recordKey);
      if (rowCache) {
        // LRU：命中行移到队尾，淘汰时优先移除最久未渲染的行。
        if (recordKey !== lastTouchedRecord) {
          recordCache.delete(recordKey);
          recordCache.set(recordKey, rowCache);
          lastTouchedRecord = recordKey;
        }
      } else {
        rowCache = new Map();
        recordCache.set(recordKey, rowCache);
        lastTouchedRecord = recordKey;
        while (recordCache.size > maxRows) {
          const oldest = recordCache.keys().next().value;
          if (oldest === undefined) break;
          recordCache.delete(oldest);
          if (oldest === lastTouchedRecord) lastTouchedRecord = undefined;
        }
      }
      cached = rowCache.get(cacheKey);
    } else {
      cached = cellFallbackCache.get(cell);
    }
    if (
      cached &&
      cached.row === cell.row &&
      cached.render === dependencies.render &&
      (ignoreCellKey ||
        (cached.columnToken === dependencies.columnToken &&
          cached.rowIndex === dependencies.rowIndex))
    ) {
      return cached.state;
    }

    const state: CachedCellRenderState = {
      render: dependencies.render,
      props: cell.getContext(),
    };
    const entry: CellRenderCacheEntry = {
      row: cell.row,
      render: dependencies.render,
      columnToken: dependencies.columnToken,
      rowIndex: dependencies.rowIndex,
      state,
    };
    if (rowCache) rowCache.set(cacheKey, entry);
    else cellFallbackCache.set(cell, entry);
    return state;
  }) as CellRenderCache<TData>;
  cache.getCachedRowCount = () => recordCache.size;
  return cache;
};
