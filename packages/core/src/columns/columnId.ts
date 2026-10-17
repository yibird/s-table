/**
 * 解析与 TanStack Table 一致的列 ID。
 *
 * `accessorKey` 支持 `user.name` 这类嵌套路径，TanStack 会将路径中的点替换为下划线生成列 ID；
 * 筛选、固定、隐藏和拖拽索引必须复用同一规则，避免表头 ID 与公开列配置脱节。
 */
export const resolveColumnId = (column: {
  id?: string;
  accessorKey?: string;
  dataIndex?: string;
}): string | undefined => {
  if (typeof column.id === 'string') return column.id;
  const accessor = column.accessorKey ?? column.dataIndex;
  if (typeof accessor === 'string') return accessor.replaceAll('.', '_');
  return undefined;
};
