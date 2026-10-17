import type { STableRowData, STableRowKey, STableTree } from '../types/row';
import { setImmutablePath } from '../utils/objectPath';
import { getTreeChildren, setTreeChildren } from '../utils/tree';

/**
 * 框架无关的编辑状态结构。适配层的公开编辑状态在结构上满足该接口。
 */
export interface STableEditingStateLike {
  mode: 'cell' | 'row';
  rowKey: STableRowKey;
  columnId?: string;
  values: Record<string, unknown>;
}

/** 编辑状态的可写列契约（子集）。 */
export interface STableEditableColumnLike<TData extends STableRowData = STableRowData> {
  editable?: boolean | ((record: TData, rowIndex: number) => boolean);
  accessorKey?: string;
  /** 只要存在写回入口即可编辑；具体签名由适配层保证。 */
  valueSetter?: unknown;
}

/** 提交写回所需的列契约。 */
export interface STableEditWriteColumnLike<TData extends STableRowData = STableRowData> {
  accessorKey?: string;
  valueSetter?: (record: TData, value: unknown) => TData;
}

/** 克隆编辑状态，避免调用方修改内部草稿。 */
export const cloneEditingState = <TState extends STableEditingStateLike>(
  value: TState | null
): TState | null => (value ? { ...value, values: { ...value.values } } : null);

/**
 * 比较当前状态与提交快照是否仍是同一次编辑事务。
 *
 * 异步校验返回后必须用它判定：编辑值或目标变化后，旧事务不能覆盖新草稿。
 */
export const sameEditingState = (
  current: STableEditingStateLike | null,
  snapshot: STableEditingStateLike
): boolean => {
  if (
    !current ||
    current.mode !== snapshot.mode ||
    current.rowKey !== snapshot.rowKey ||
    current.columnId !== snapshot.columnId
  ) {
    return false;
  }
  const keys = Object.keys(snapshot.values);
  return (
    keys.length === Object.keys(current.values).length &&
    keys.every((key) => Object.is(current.values[key], snapshot.values[key]))
  );
};

/** 列是否允许编辑：显式开关 + 存在取值/写回入口。 */
export const isColumnEditable = <TData extends STableRowData>(
  column: STableEditableColumnLike<TData> | undefined,
  record: TData,
  rowIndex: number
): boolean => {
  if (!column) return false;
  const editable = column.editable;
  if (typeof editable === 'function' ? !editable(record, rowIndex) : editable !== true)
    return false;
  return Boolean(column.accessorKey || column.valueSetter);
};

/**
 * 在（可选的）树形数据源中定位并替换记录，返回不可变拷贝。
 *
 * 平铺数据只做一层拷贝；树形数据沿命中分支重建祖先记录，未命中分支保持引用。
 */
export const replaceRecordInTree = <TData extends STableRowData>(
  source: readonly TData[],
  target: TData,
  replacement: TData,
  tree: STableTree<TData> | undefined
): { found: false } | { found: true; data: TData[] } => {
  for (let index = 0; index < source.length; index++) {
    const record = source[index]!;
    if (record === target) {
      const next = source.slice();
      next[index] = replacement;
      return { found: true, data: next };
    }
    if (!tree) continue;
    const children = getTreeChildren(record, tree);
    if (!children || children.length === 0) continue;
    const nested = replaceRecordInTree(children, target, replacement, tree);
    if (!nested.found) continue;
    const next = source.slice();
    next[index] = setTreeChildren(record, tree, nested.data);
    return { found: true, data: next };
  }
  return { found: false };
};

/**
 * 把编辑草稿按列写回记录。
 *
 * 优先使用列级 `valueSetter`（不可变写回）；否则按 `accessorKey` 做安全点路径写入。
 * 返回新记录引用，未命中的列被忽略。
 */
export const applyEditingValues = <TData extends STableRowData>(
  record: TData,
  values: Readonly<Record<string, unknown>>,
  getColumn: (columnId: string) => STableEditWriteColumnLike<TData> | undefined
): TData => {
  let nextRecord = record;
  for (const [columnId, value] of Object.entries(values)) {
    const column = getColumn(columnId);
    if (!column) continue;
    if (typeof column.valueSetter === 'function') {
      nextRecord = column.valueSetter(nextRecord, value);
    } else if (column.accessorKey) {
      nextRecord = setImmutablePath(
        nextRecord as object,
        String(column.accessorKey),
        value
      ) as TData;
    }
  }
  return nextRecord;
};
