import {
  filterFn_includesString,
  type ColumnDef,
  type ColumnPinningState,
  type RowData,
  type TableFeatures,
} from '@tanstack/table-core';
import { resolveSafeColumnChildren } from '../utils/columnTree';
import { retainEqualArray } from '../utils/same';
import { resolveColumnId } from './columnId';
import type { STableColumnLike, STableColumnNormalizeMetadata } from './types';

/** 归一化阶段消费的过滤值形状；适配层负责把 UI 状态构造成该结构。 */
export interface STableColumnFilterValue {
  values?: readonly (string | number | boolean)[];
  valueSet?: ReadonlySet<string | number | boolean>;
  keyword?: string;
  normalizedKeyword?: string;
}

/** TanStack Column Sizing 的内置默认值；固定列未显式设宽时用它锁定真实布局宽度。 */
const DEFAULT_COLUMN_SIZE = 150;
const DEFAULT_MIN_COLUMN_SIZE = 20;

/** 仅保留非负有限数值，阻止负数 / `NaN` / `Infinity` 进入列宽计算与 CSS。 */
const resolveFiniteSize = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;

/**
 * 解析列的尺寸配置。
 *
 * 公开列读取 `width/minWidth/maxWidth`；内部注入列兼容 TanStack 的
 * `size/minSize/maxSize`。固定列未设宽时锁定为 TanStack 默认 150px，
 * 保证 DOM 实际列宽与 `column.getStart/getAfter` 的 sticky 偏移一致。
 */
export const resolveColumnSizing = <TData extends RowData, TValue>(
  column: STableColumnLike<TData, TValue>,
  inheritedFixed?: 'left' | 'right'
) => {
  const declaredSize =
    resolveFiniteSize(column.width) ??
    resolveFiniteSize(column.size) ??
    ((column.fixed ?? inheritedFixed) ? DEFAULT_COLUMN_SIZE : undefined);
  const minSize = resolveFiniteSize(column.minWidth) ?? resolveFiniteSize(column.minSize);
  const rawMaxSize = resolveFiniteSize(column.maxWidth) ?? resolveFiniteSize(column.maxSize);
  const maxSize =
    rawMaxSize === undefined ? undefined : Math.max(minSize ?? DEFAULT_MIN_COLUMN_SIZE, rawMaxSize);
  const resolvedSize =
    declaredSize === undefined
      ? undefined
      : Math.min(
          Math.max(minSize ?? DEFAULT_MIN_COLUMN_SIZE, declaredSize),
          maxSize ?? Number.MAX_SAFE_INTEGER
        );

  // declaredSize 作为 TanStack 的声明宽度（由 columnSizing 再按 minSize/maxSize clamp）；
  // resolvedSize 是此处预 clamp 后的值，供 explicitMinWidth 精确预判实际渲染宽度。
  return { declaredSize, resolvedSize, minSize, maxSize };
};

/**
 * 公开列配置中参与单元格渲染、需纳入缓存失效 token 的字段。
 *
 * `columns` 由列树递归处理，`size/minSize/maxSize` 是内部 TanStack 尺寸兼容字段，
 * 变更不影响单元格渲染面，故不参与 token。
 */
type CellRenderTokenField = Exclude<
  keyof STableColumnLike,
  'columns' | 'size' | 'minSize' | 'maxSize'
>;

/**
 * 用 `Record<CellRenderTokenField, null>` 约束：给 `STableColumnLike` 新增字段而未同步
 * 本表，会在编译期直接失败（缺 key 或多余 key 均报错），避免 cell render 缓存
 * 静默复用旧 context 的漂移 bug。值仅作占位，实际 token 由 key 顺序投影得到。
 */
const CELL_RENDER_TOKEN_FIELDS = {
  id: null,
  header: null,
  footer: null,
  meta: null,
  accessorKey: null,
  dataIndex: null,
  accessorFn: null,
  cell: null,
  width: null,
  minWidth: null,
  maxWidth: null,
  align: null,
  fixed: null,
  draggable: null,
  resizable: null,
  hidden: null,
  sorter: null,
  sortDirections: null,
  defaultSortOrder: null,
  sortOrder: null,
  filters: null,
  onFilter: null,
  filterMode: null,
  filterMultiple: null,
  defaultFilteredValues: null,
  filteredValue: null,
  search: null,
  editable: null,
  editableTrigger: null,
  editor: null,
  valueParser: null,
  valueSetter: null,
  spanRows: null,
  spanColumns: null,
  onCell: null,
  groupable: null,
  getGroupingValue: null,
  aggregation: null,
  aggregatedCell: null,
} satisfies Record<CellRenderTokenField, null>;

// 对象字面量的字符串 key 按插入序枚举，保证 token 顺序跨调用稳定（非数字键）。
const CELL_RENDER_TOKEN_KEYS = Object.keys(
  CELL_RENDER_TOKEN_FIELDS
) as readonly CellRenderTokenField[];

/**
 * 单元格渲染器接收到的是完整 Column context，而不是只有 cell/value。
 * 这里显式收集公开列配置，保证列配置原地变更后不会继续复用旧 context。
 * 每一列独立比较，修改一列不会让所有可见单元格失效。
 */
export const getCellRenderToken = <TData extends RowData, TValue>(
  column: STableColumnLike<TData, TValue>
): readonly unknown[] => CELL_RENDER_TOKEN_KEYS.map((key) => column[key]);

export const createColumnMetadata = <
  TData extends RowData,
  TValue,
  TColumn extends STableColumnLike<TData, TValue>,
>(
  columnMap?: ReadonlyMap<string, TColumn>
): STableColumnNormalizeMetadata<TData, TValue, TColumn> => {
  const ownedColumnMap = new Map<string, TColumn>();
  return {
    columnMap: columnMap ?? ownedColumnMap,
    mutableColumnMap: columnMap ? undefined : ownedColumnMap,
    columnPinning: { start: [], end: [] },
    columnVisibility: {},
    explicitMinWidth: 0,
    explicitWidthIds: new Set(),
    cellRenderToken: new Map(),
    rowModelDependencyToken: [],
    hasCellSpanning: false,
  };
};

/**
 * 将外部列配置规范化为 TanStack 可直接消费的内部列结构。
 *
 * 这是「公开列类型（解耦上游）→ TanStack ColumnDef」的唯一适配边界：
 * 把 `width/minWidth/maxWidth` 映射到 TanStack 的 `size/minSize/maxSize`，把 `sorter/onFilter`
 * 桥接为 `sortFn/filterFn`，并透传其余字段（TanStack 会忽略未知字段）。
 */
const normalizeColumn = <
  TData extends RowData,
  TValue,
  TColumn extends STableColumnLike<TData, TValue>,
>(
  column: TColumn,
  inheritedFixed?: 'left' | 'right',
  depth = 0,
  metadata?: STableColumnNormalizeMetadata<TData, TValue, TColumn>,
  inheritedHidden = false,
  ancestors: ReadonlySet<STableColumnLike<TData, TValue>> = new Set()
): ColumnDef<TableFeatures, TData, TValue> => {
  // 列树遍历只需要结构化字段；泛型 TColumn 仅用于保持 metadata 的列类型。
  const columnLike = column as STableColumnLike<TData, TValue>;
  const resolvedChildren = resolveSafeColumnChildren(columnLike, depth, ancestors);
  const childColumns = resolvedChildren.children;
  const hasChildren = childColumns.length > 0;
  const effectiveFixed = column.fixed ?? inheritedFixed;
  const hidden = inheritedHidden || column.hidden === true;
  const { declaredSize, resolvedSize, minSize, maxSize } = resolveColumnSizing(
    column,
    inheritedFixed
  );
  const columnId = resolveColumnId(column);
  // Ant Design 风格 dataIndex 作为 accessorKey 的别名；同一列两者都提供时 accessorKey 优先。
  const accessorKey = column.accessorKey ?? column.dataIndex;

  // 用户比较器只接触原始记录；升降序反转和 sorter=true 的类型选择交给 TanStack。
  const userSorter = column.sorter;
  const hasSorter = userSorter === true || typeof userSorter === 'function';
  // 搜索和筛选在同一个 filterFn 中完成，每行每列最多进入一次 TanStack 过滤热路径。
  const userOnFilter = column.onFilter;
  const userSearch = column.search;
  const hasFilterOptions =
    Array.isArray(column.filters) || Array.isArray(column.defaultFilteredValues);

  if (metadata && columnId) {
    metadata.mutableColumnMap?.set(columnId, column);
    if (!hasChildren) {
      if (effectiveFixed === 'left') metadata.columnPinning.start.push(columnId);
      if (effectiveFixed === 'right') metadata.columnPinning.end.push(columnId);
      if (hidden) metadata.columnVisibility[columnId] = false;
      if (resolvedSize !== undefined) {
        metadata.explicitMinWidth += resolvedSize;
        metadata.explicitWidthIds.add(columnId);
      }
      metadata.cellRenderToken.set(columnId, getCellRenderToken(columnLike));
      if (column.spanRows !== undefined || column.spanColumns !== undefined) {
        metadata.hasCellSpanning = true;
      }
      // 纯 display column 的增删由 TanStack Column/Cell 模型处理，不应强制重建全部 Row。
      if (
        accessorKey !== undefined ||
        column.accessorFn !== undefined ||
        typeof column.getGroupingValue === 'function' ||
        hasSorter ||
        typeof userOnFilter === 'function' ||
        Boolean(userSearch) ||
        hasFilterOptions
      ) {
        metadata.rowModelDependencyToken.push(
          columnId,
          accessorKey,
          column.accessorFn,
          column.getGroupingValue,
          hasSorter ? userSorter : undefined,
          typeof userOnFilter === 'function' ? userOnFilter : undefined,
          userSearch || undefined,
          hasFilterOptions
        );
      }
    }
  }

  const sortFn =
    typeof userSorter === 'function'
      ? (rowA: { original: TData }, rowB: { original: TData }) =>
          userSorter(rowA.original, rowB.original)
      : userSorter === true
        ? 'auto'
        : undefined;

  // 纯文本搜索直接交给 TanStack 内置函数；只有组合筛选或业务回调才保留适配函数。
  const usesBuiltInSearch =
    userSearch === true &&
    typeof userOnFilter !== 'function' &&
    !hasFilterOptions &&
    !Array.isArray(column.filteredValue);
  const filterFn = usesBuiltInSearch
    ? filterFn_includesString
    : typeof userOnFilter === 'function' || userSearch || hasFilterOptions
      ? (
          row: { original: TData; getValue: (columnId: string) => unknown },
          columnId: string,
          rawFilterValue: unknown
        ) => {
          const filterValue = (rawFilterValue ?? {}) as STableColumnFilterValue;
          const values = filterValue.values ?? [];
          const keyword = filterValue.keyword;

          if (values.length > 0) {
            if (typeof userOnFilter === 'function') {
              let matched = false;
              for (const value of values) {
                if (userOnFilter(value, row.original)) {
                  matched = true;
                  break;
                }
              }
              if (!matched) return false;
            } else if (hasFilterOptions) {
              // 未提供 onFilter 时复用 accessor 值做枚举精确匹配，保证客户端筛选可用，
              // 也避免 TanStack 收到有状态但无 filterFn 的列后在行模型计算时抛错。
              const rowValue = row.getValue(columnId);
              const matchesValue = filterValue.valueSet
                ? filterValue.valueSet.has(rowValue as string | number | boolean)
                : values.some((value) => Object.is(value, rowValue));
              if (!matchesValue) return false;
            }
          }

          if (!keyword || !userSearch) return true;
          if (typeof userSearch === 'function') return userSearch(keyword, row.original);

          // 使用 TanStack accessor 取值，兼容 accessorFn 与嵌套 accessorKey。
          const value = row.getValue(columnId);
          return (
            value != null &&
            String(value)
              .toLowerCase()
              .includes(filterValue.normalizedKeyword ?? keyword.toLowerCase())
          );
        }
      : undefined;

  // 聚合：内置名直接引用注册表；自定义函数包装为 TanStack AggregationFnDef，
  // 以「该分组全部叶子行的列值 + 原始记录」这一稳定形状暴露给业务。
  const userAggregation = column.aggregation;
  const aggregationFn =
    typeof userAggregation === 'string'
      ? userAggregation
      : typeof userAggregation === 'function'
        ? {
            aggregate: (context: {
              rows: ReadonlyArray<{ original: TData }>;
              getValue: (row: never) => unknown;
            }) => {
              const values: TValue[] = [];
              const records: TData[] = [];
              for (const row of context.rows) {
                values.push(context.getValue(row as never) as TValue);
                records.push(row.original);
              }
              return (userAggregation as (values: TValue[], records: TData[]) => unknown)(
                values,
                records
              );
            },
          }
        : undefined;

  // 原始 columns 不能随 ...column 泄漏到结果：达到深度上限或遇到循环时必须真正截断。
  const { columns: _childColumns, ...columnWithoutChildren } = column;
  return {
    ...columnWithoutChildren,
    ...(columnId ? { id: columnId } : {}),
    ...(accessorKey !== undefined && { accessorKey }),
    size: declaredSize,
    minSize,
    maxSize,
    enableResizing: column.resizable === true,
    enableSorting: hasSorter,
    enableColumnFilter: filterFn != null,
    enableGrouping: column.groupable === true,
    ...(aggregationFn !== undefined && { aggregationFn }),
    ...(sortFn && { sortFn }),
    ...(filterFn && { filterFn }),
    ...(hasChildren && {
      columns: childColumns.map((childColumn) =>
        normalizeColumn(
          childColumn as TColumn,
          effectiveFixed,
          depth + 1,
          metadata,
          hidden,
          resolvedChildren.ancestors
        )
      ),
    }),
  } as ColumnDef<TableFeatures, TData, TValue>;
};

/** 一次递归同时生成 TanStack 列定义和渲染层 metadata，避免对同一列树重复遍历。 */
export const normalizeColumnState = <
  TData extends RowData,
  TValue,
  TColumn extends STableColumnLike<TData, TValue>,
>(
  columns: readonly TColumn[],
  columnMap?: ReadonlyMap<string, TColumn>
) => {
  const metadata = createColumnMetadata<TData, TValue, TColumn>(columnMap);
  const rootAncestors = new Set<STableColumnLike<TData, TValue>>();
  const normalizedColumns = columns.map((column) =>
    normalizeColumn(column, undefined, 0, metadata, false, rootAncestors)
  );
  return { normalizedColumns, metadata };
};

export const retainEqualCellRenderTokens = (
  previous: ReadonlyMap<string, readonly unknown[]> | undefined,
  next: ReadonlyMap<string, readonly unknown[]>
): ReadonlyMap<string, readonly unknown[]> => {
  let allEqual = previous?.size === next.size;
  const retained = new Map<string, readonly unknown[]>();
  for (const [columnId, token] of next) {
    const previousToken = previous?.get(columnId);
    const retainedToken = retainEqualArray(previousToken, token);
    retained.set(columnId, retainedToken);
    if (retainedToken !== previousToken) allEqual = false;
  }
  return allEqual && previous ? previous : retained;
};

export type InternalColumnMetadata = {
  pinning: ColumnPinningState;
  explicitMinWidth: number;
  explicitWidthIds: Set<string>;
};

/** 从已完成的注入列 def 提取渲染层元数据（固定位置与显式宽度）。 */
export const collectInternalColumnMetadata = <TData extends RowData>(
  columns: readonly ColumnDef<TableFeatures, TData, unknown>[]
): InternalColumnMetadata => {
  const pinning: ColumnPinningState = { start: [], end: [] };
  const explicitWidthIds = new Set<string>();
  let explicitMinWidth = 0;
  for (const column of columns) {
    if (!column.id) continue;
    const fixed = (column as { fixed?: 'left' | 'right' }).fixed;
    if (fixed === 'left') pinning.start.push(column.id);
    if (fixed === 'right') pinning.end.push(column.id);
    const size = resolveFiniteSize(column.size);
    if (size !== undefined) {
      explicitMinWidth += size;
      explicitWidthIds.add(column.id);
    }
  }
  return { pinning, explicitMinWidth, explicitWidthIds };
};
