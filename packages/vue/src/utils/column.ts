import type { DeepValue, RowData } from '@tanstack/table-core';
import { INTERNAL_COLUMN_IDS } from '../constants';
import type { STableColumnAlign } from '../types/config';
import type {
  STableAccessorColumn,
  STableAccessorFnColumn,
  STableAccessorKey,
  STableAccessorKeyColumn,
  STableColumnBaseAlign,
  STableColumnCommon,
  STableDisplayColumn,
  STableGroupColumn,
  StringKeyOf,
} from '../types/column';

/**
 * 列 ID 解析属于框架无关的 core 列管线；此处保留兼容导出，避免内部深层导入路径变更。
 */
export { resolveColumnId } from '@zchengfeng/s-table-core';

/** 读取列对齐：优先 `align`，其次 `meta.align`。 */
export const resolveColumnAlign = (
  column?: Pick<STableColumnBaseAlign, 'align' | 'meta'>
): STableColumnAlign | undefined => column?.align ?? column?.meta?.align;

/** 非默认左对齐时返回可直接绑到 th/td 的 style，避免覆盖 CSS 默认值。 */
export const resolveColumnAlignStyle = (
  column?: Pick<STableColumnBaseAlign, 'align' | 'meta'>
): { textAlign: STableColumnAlign } | undefined => {
  const align = resolveColumnAlign(column);
  return align && align !== 'left' ? { textAlign: align } : undefined;
};

// ==================== 类型安全的列构造 helper ====================

/**
 * 创建绑定了 `TData` 的列构造 helper，提供列定义的类型推断与约束。
 *
 * helper 先绑定 `TData`，让 accessor 值类型和 `<STable>` 的行类型保持同一推导来源。
 *
 * @template TData 行数据类型。
 * @returns 一组列构造器：`accessor` / `group` / `display`。
 *
 * @example
 * ```ts
 * interface User { id: number; name: string }
 * const col = createSTableColumnHelper<User>();
 * const columns = [
 *   col.accessor('name', { header: '姓名' }),
 *   col.display({ id: 'action', header: '操作', cell: ({ row }) => row.original.id }),
 * ];
 * ```
 */
export function createSTableColumnHelper<TData extends RowData>() {
  function accessor<TKey extends StringKeyOf<TData>>(
    accessorKey: TKey,
    column?: Omit<STableAccessorKeyColumn<TData, TData[TKey]>, 'accessorKey'>
  ): STableAccessorKeyColumn<TData, TData[TKey]>;
  function accessor<TAccessor extends STableAccessorKey<TData>>(
    accessorKey: TAccessor,
    column?: Omit<STableAccessorKeyColumn<TData, DeepValue<TData, TAccessor>>, 'accessorKey'>
  ): STableAccessorKeyColumn<TData, DeepValue<TData, TAccessor>>;
  function accessor<TValue = unknown>(
    accessorFn: (record: TData, index: number) => TValue,
    column: Omit<STableAccessorFnColumn<TData, TValue>, 'accessorFn'>
  ): STableAccessorFnColumn<TData, TValue>;
  function accessor<TValue = unknown>(
    accessorValue: STableAccessorKey<TData> | ((record: TData, index: number) => TValue),
    column: STableColumnCommon<TData, TValue> & { id?: string } = {}
  ): STableAccessorColumn<TData, TValue> {
    // overload 已保证函数 accessor 必带 id；断言只收敛实现签名无法表达的分支关联。
    return (
      typeof accessorValue === 'function'
        ? { ...column, id: column.id!, accessorFn: accessorValue }
        : { ...column, accessorKey: accessorValue }
    ) as STableAccessorColumn<TData, TValue>;
  }

  const display = <TValue = unknown>(
    column: STableDisplayColumn<TData, TValue>
  ): STableDisplayColumn<TData, TValue> => column;

  const group = <TValue = unknown>(
    column: STableGroupColumn<TData, TValue>
  ): STableGroupColumn<TData, TValue> => column;

  return { accessor, display, group };
}

/**
 * 判断是否为内部列 ID
 *
 * @param id 列 ID。
 * @returns 是否为内部列 ID。
 */
export const isInternalColumn = (id: string | undefined) => {
  return id !== undefined && INTERNAL_COLUMN_IDS.has(id);
};
