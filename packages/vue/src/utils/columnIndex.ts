import { resolveColumnId } from './column';
import { walkColumnTree } from './columnTree';
import type { RowData } from '@tanstack/vue-table';
import type { STableColumn } from '../types/column';

/**
 * 用户列树的共享索引。
 *
 * 列配置同时被排序、筛选、编辑、分组和拖拽读取；这些领域不应该互相依赖，
 * 也不应该各自递归遍历同一棵列树。索引保持纯函数，缓存生命周期交给调用方的 computed。
 */
export type STableColumnIndex<TData extends RowData, TValue = unknown> = {
  map: Map<string, STableColumn<TData, TValue>>;
  leafIds: string[];
};

/** 按声明顺序一次遍历建立列定义 Map 与叶子列 ID。 */
export const buildColumnIndex = <TData extends RowData, TValue>(
  columns: readonly STableColumn<TData, TValue>[]
): STableColumnIndex<TData, TValue> => {
  const map = new Map<string, STableColumn<TData, TValue>>();
  const leafIds: string[] = [];

  walkColumnTree(columns, (column, _depth, children) => {
    const id = resolveColumnId(column);
    if (!id) return;
    map.set(id, column);
    if (children.length === 0) leafIds.push(id);
  });

  return { map, leafIds };
};
