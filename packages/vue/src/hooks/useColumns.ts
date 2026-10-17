import { computed, type Ref } from 'vue';
import type { ColumnDef, ColumnPinningState, RowData, TableFeatures } from '@tanstack/vue-table';
import {
  collectInternalColumnMetadata,
  normalizeColumnState,
  retainEqualArray,
  retainEqualCellRenderTokens,
} from '@zchengfeng/s-table-core';
import type { STableColumn } from '../types';

type STableColumnsOptions<TData extends RowData, TValue> = {
  columns: Readonly<Ref<STableColumn<TData, TValue>[]>>;
  /**
   * 排序/筛选状态已构建的用户列索引。传入后归一化阶段直接复用，
   * 避免同一次列更新为编辑、分组和渲染分别创建内容相同的 Map。
   */
  columnMap?: Readonly<Ref<ReadonlyMap<string, STableColumn<TData, TValue>>>>;
  /**
   * 内部注入列（选择 / 展开 / 序号 / 拖拽句柄），已是 TanStack ColumnDef 形状。
   * 与用户列分离归一化：注入列随交互状态（如分页页码）高频重建时，
   * 用户列树不再被连带重新归一化，避免整表 ColumnDef 身份失效。
   */
  internalColumns?: Readonly<Ref<ColumnDef<TableFeatures, TData, unknown>[]>>;
};

/**
 * 列归一化的 Vue 绑定层。
 *
 * 实际的「公开列 → TanStack ColumnDef + 渲染元数据」管线由 core 提供，
 * 本 hook 只负责让列依赖进入 Vue 响应式并复用引用稳定的 token。
 */
export const useColumns = <TData extends RowData, TValue = unknown>({
  columns,
  columnMap,
  internalColumns,
}: STableColumnsOptions<TData, TValue>) => {
  // computed 本身会在列依赖不变时保留结果；发生响应式列属性变更时必须重新归一化，
  // 不能仅按对象引用缓存，否则原地修改 header / sorter / width 等配置会永久命中旧值。
  const columnState = computed(() =>
    normalizeColumnState<TData, TValue, STableColumn<TData, TValue>>(
      columns.value,
      columnMap?.value
    )
  );
  // 注入列随交互状态高频重建；单独归一化，用户列树保持缓存引用不被连带失效。
  const internalColumnState = computed(() =>
    collectInternalColumnMetadata(internalColumns?.value ?? [])
  );
  const normalizedColumns = computed<ColumnDef<TableFeatures, TData, unknown>[]>(() => [
    ...(internalColumns?.value ?? []),
    ...(columnState.value.normalizedColumns as ColumnDef<TableFeatures, TData, unknown>[]),
  ]);
  const metadata = computed(() => columnState.value.metadata);

  // TanStack v9 会在列配置变化时保留部分 Row 对象；Body 的行级 v-memo 因此需要一个
  // 独立渲染 token。token 覆盖公开列配置，避免单元格 renderer 读取 column.columnDef
  // 时复用旧 context；retainEqualCellRenderTokens 仍会保留未变化列的 token 引用。
  const cellRenderToken = computed<ReadonlyMap<string, readonly unknown[]>>((previous) =>
    retainEqualCellRenderTokens(previous, metadata.value.cellRenderToken)
  );

  // 只让 accessor / 排序 / 过滤语义失效核心 Row 缓存；注入 display column 不参与。
  const rowModelDependencyToken = computed<readonly unknown[]>((previous) =>
    retainEqualArray(previous, metadata.value.rowModelDependencyToken)
  );

  const columnPinning = computed<ColumnPinningState>(() => {
    const user = metadata.value.columnPinning;
    const internal = internalColumnState.value.pinning;
    if (internal.start.length === 0 && internal.end.length === 0) return user;
    return {
      start: [...internal.start, ...user.start],
      end: [...internal.end, ...user.end],
    };
  });
  const columnVisibility = computed(() => metadata.value.columnVisibility);
  const hasCellSpanning = computed(() => metadata.value.hasCellSpanning);

  const getColumnById = (columnId: string) => metadata.value.columnMap.get(columnId);
  const explicitMinWidth = computed(
    () => metadata.value.explicitMinWidth + internalColumnState.value.explicitMinWidth
  );
  const explicitWidthIds = computed<ReadonlySet<string>>(() => {
    const user = metadata.value.explicitWidthIds;
    const internal = internalColumnState.value.explicitWidthIds;
    if (internal.size === 0) return user;
    const merged = new Set(user);
    for (const id of internal) merged.add(id);
    return merged;
  });

  return {
    normalizedColumns,
    cellRenderToken,
    rowModelDependencyToken,
    columnPinning,
    columnVisibility,
    hasCellSpanning,
    getColumnById,
    explicitMinWidth,
    explicitWidthIds,
  };
};
