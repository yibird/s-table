import { shallowRef, watch, type Ref } from 'vue';
import type { ColumnOrderState, RowData, Updater } from '@tanstack/vue-table';
import { resolveColumnId } from '../utils/column';
import { walkColumnTree } from '../utils/columnTree';
import type { STableColumn, STableColumnDragConfig } from '../types';
import { sameValues } from '../utils';
import {
  moveArrayItem,
  moveColumnOrder,
  moveColumnOrderByIndex,
  normalizeColumnOrder,
  swapColumnOrder,
} from '@zchengfeng/s-table-core';
import { useDrag } from './useDrag';

/** 列拖拽事件同时返回兼容的列配置和 TanStack 叶子列顺序。 */
interface STableColumnOrderChangeEvent<TData extends RowData, TValue> {
  columns: STableColumn<TData, TValue>[];
  columnOrder: string[];
  fromIndex: number;
  toIndex: number;
}

type UseSTableColumnDragOptions<TData extends RowData, TValue> = {
  columns: Readonly<Ref<STableColumn<TData, TValue>[]>>;
  /** 复用用户列分析阶段生成的叶子列顺序，避免再次遍历列树。 */
  leafColumnIds?: Readonly<Ref<readonly string[]>>;
  columnDrag?: Readonly<Ref<STableColumnDragConfig<TData> | undefined>>;
  onColumnOrderChange?: (payload: STableColumnOrderChangeEvent<TData, TValue>) => void;
};

/** 按定义树顺序收集叶子列 ID；分组列自身不进入 TanStack columnOrder。 */
export const collectLeafColumnIds = <TData extends RowData, TValue>(
  columns: readonly STableColumn<TData, TValue>[]
): string[] => {
  const ids: string[] = [];
  walkColumnTree(columns, (column, _depth, children) => {
    if (children.length === 0) {
      const id = resolveColumnId(column);
      if (id) ids.push(id);
    }
  });
  return ids;
};

const sameColumnOrder = (left: readonly string[], right: readonly string[]) =>
  sameValues(left, right);

/**
 * 维护用户叶子列顺序；真正的列排列由 TanStack columnOrderingFeature 消费该状态完成。
 * HTML5 DnD 仅负责解析源/目标位置，因为 TanStack 本身不提供视图层拖拽实现。
 */
export const useColumnDrag = <TData extends RowData, TValue = unknown>({
  columns,
  leafColumnIds,
  columnDrag,
  onColumnOrderChange,
}: UseSTableColumnDragOptions<TData, TValue>) => {
  const sourceLeafIds = () => [...(leafColumnIds?.value ?? collectLeafColumnIds(columns.value))];
  const columnOrder = shallowRef<ColumnOrderState>(sourceLeafIds());

  const applyColumnOrder = (nextOrder: readonly string[]) => {
    const next = normalizeColumnOrder(nextOrder, sourceLeafIds());
    if (sameColumnOrder(next, columnOrder.value)) return;
    columnOrder.value = next;
  };

  // 列集合变化时保留 TanStack 已维护的顺序，只剔除已删除 ID、按声明顺序补入新增 ID。
  // 父组件重渲染并重建同 ID 的 columns 数组时不会意外撤销用户刚完成的拖拽结果。
  watch(sourceLeafIds, () => applyColumnOrder(columnOrder.value));

  const onTanStackColumnOrderChange = (updater: Updater<ColumnOrderState>) => {
    const next = typeof updater === 'function' ? updater(columnOrder.value) : updater;
    applyColumnOrder(next);
  };

  /** 返回当前用户叶子列顺序的快照，避免调用方持有内部数组引用。 */
  const getColumnOrder = (): string[] => [...columnOrder.value];

  /** 设置列顺序；TanStack columnOrderingFeature 会消费该状态完成实际渲染。 */
  const setColumnOrder = (nextOrder: string[]) => {
    applyColumnOrder(nextOrder);
  };

  /** 恢复为当前列定义声明的用户叶子列顺序。 */
  const resetColumnOrder = () => {
    applyColumnOrder(sourceLeafIds());
  };

  /** 交换两列；无效 ID 或同一列不触发响应式更新。 */
  const swapColumns = (columnIdA: string, columnIdB: string) => {
    applyColumnOrder(swapColumnOrder(columnOrder.value, columnIdA, columnIdB));
  };

  /** 将一列移动到目标列之前，保留其他列的相对顺序。 */
  const moveColumn = (columnId: string, targetColumnId: string) => {
    applyColumnOrder(moveColumnOrder(columnOrder.value, columnId, targetColumnId));
  };

  /** 按当前用户叶子列索引移动列；越界或非整数索引不产生副作用。 */
  const moveColumnByIndex = (fromIndex: number, toIndex: number) => {
    applyColumnOrder(moveColumnOrderByIndex(columnOrder.value, fromIndex, toIndex));
  };

  const {
    isDragging,
    dragFromIndex,
    dragOverIndex,
    handleDragStart: handleColumnDragStart,
    handleDragOver: handleColumnDragOver,
    handleDragEnd: handleColumnDragEnd,
    handleDrop: handleColumnDrop,
  } = useDrag({
    getItemCount: () => columnOrder.value.length,
    onMove: async ({ fromIndex, toIndex }) => {
      const sourceOrder = [...columnOrder.value];
      const nextOrder = moveArrayItem(sourceOrder, fromIndex, toIndex);
      // 保持原有顶层平铺列回调兼容；嵌套列由新增 columnOrder 精确描述顺序。
      const isFlat = columns.value.every((column) => !column.columns?.length);
      const payload = {
        columns: isFlat ? moveArrayItem(columns.value, fromIndex, toIndex) : [...columns.value],
        columnOrder: [...nextOrder],
        fromIndex,
        toIndex,
      };
      const beforeDrop = columnDrag?.value?.beforeDrop;
      if (beforeDrop && (await beforeDrop(payload)) === false) return;
      if (!sameColumnOrder(columnOrder.value, sourceOrder)) return;
      columnOrder.value = nextOrder;
      onColumnOrderChange?.(payload);
    },
  });

  return {
    isDragging,
    dragFromIndex,
    dragOverIndex,
    columnOrder,
    onTanStackColumnOrderChange,
    handleColumnDragStart,
    handleColumnDragOver,
    handleColumnDragEnd,
    handleColumnDrop,
    getColumnOrder,
    setColumnOrder,
    resetColumnOrder,
    swapColumns,
    moveColumn,
    moveColumnByIndex,
  };
};
