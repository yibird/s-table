import { computed, createVNode, shallowRef, type Ref } from 'vue';
import { useDrag } from './useDrag';
import type { ColumnDef, Row, RowData, TableFeatures } from '@tanstack/vue-table';
import { DRAG_COLUMN_ID } from '../constants';
import { toColumnDef } from '../utils';
import { decodeRowKey } from '../utils';
import { getTreeChildren } from '@zchengfeng/s-table-core';
import { getRowVisibleIndex } from '../adapter/tableDisplayOrder';
import { DragHandleIcon } from '../components/icon';
import type {
  STableDropPosition,
  STableRowDragConfig,
  STableRowOrderChangeEvent,
  STableTree,
} from '../types';

/**
 * `useRowDrag` 的入参约束。
 */
type UseSTableRowDragOptions<TData extends RowData> = {
  /** 是否启用行拖拽。 */
  enabled: Readonly<Ref<boolean>>;
  /** 行拖拽行为配置。 */
  config: Readonly<Ref<STableRowDragConfig<TData> | undefined>>;
  tree?: Readonly<Ref<STableTree<TData> | undefined>>;
  /** 惰性获取完整原始数据源，仅在 drop 时创建重排副本。 */
  getDataSource: () => TData[];
  /** 惰性获取最终可见行模型，用于把 TanStack 原始 row.index 映射为交互索引。 */
  getRows: () => Row<TableFeatures, TData>[];
  /** 当前是否允许调整手工顺序；排序激活时应返回 false。 */
  canReorder?: () => boolean;
  /** 行顺序变化的回调。 */
  onRowOrderChange?: (payload: STableRowOrderChangeEvent<TData>) => void;
  /** 自定义拖拽句柄渲染函数（来自 slot）。 */
  renderDragHandle?: (scope: { record: TData; index: number }) => unknown;
};

/**
 * 行拖拽排序 Hook。
 *
 * 管理行拖拽状态，注入拖拽句柄列定义，Drop 时计算新行顺序并通过回调通知外部。
 *
 * @template TData 表格行数据类型。
 */
export const useRowDrag = <TData extends RowData>({
  enabled,
  config,
  tree,
  getDataSource,
  getRows,
  canReorder,
  onRowOrderChange,
  renderDragHandle,
}: UseSTableRowDragOptions<TData>) => {
  const currentDropPosition = shallowRef<STableDropPosition>('after');
  const getChildren = (record: TData): TData[] | undefined => getTreeChildren(record, tree?.value);
  const withChildren = (record: TData, children: TData[]): TData => {
    const config = tree?.value;
    if (config?.setChildren) return config.setChildren(record, children);
    return {
      ...(record as Record<string, unknown>),
      [config?.childrenColumnName ?? 'children']: children,
    } as TData;
  };
  const removeRecords = (source: readonly TData[], targets: ReadonlySet<TData>) => {
    const removed: TData[] = [];
    const walk = (items: readonly TData[]): TData[] => {
      const next: TData[] = [];
      for (const record of items) {
        if (targets.has(record)) {
          removed.push(record);
          continue;
        }
        const children = getChildren(record);
        if (children?.length) {
          const nested = walk(children);
          next.push(
            nested.length === children.length && nested.every((item, i) => item === children[i])
              ? record
              : withChildren(record, nested)
          );
        } else {
          next.push(record);
        }
      }
      return next;
    };
    return { data: walk(source), removed };
  };
  const insertRecords = (
    source: readonly TData[],
    target: TData,
    records: readonly TData[],
    position: STableDropPosition
  ): { data: TData[]; found: boolean } => {
    const next: TData[] = [];
    let found = false;
    for (const record of source) {
      if (record === target) {
        found = true;
        if (position === 'before') next.push(...records);
        if (position === 'inside') {
          next.push(withChildren(record, [...(getChildren(record) ?? []), ...records]));
        } else {
          next.push(record);
        }
        if (position === 'after') next.push(...records);
        continue;
      }
      const children = getChildren(record);
      if (children?.length) {
        const nested = insertRecords(children, target, records, position);
        if (nested.found) {
          found = true;
          next.push(withChildren(record, nested.data));
          continue;
        }
      }
      next.push(record);
    }
    return { data: next, found };
  };
  const {
    isDragging,
    dragFromIndex,
    dragOverIndex,
    handleDragStart: handleRowDragStartBase,
    handleDragOver: handleRowDragOverBase,
    handleDragEnd: handleRowDragEndBase,
    handleDrop: handleRowDrop,
  } = useDrag({
    getItemCount: () => getRows().length,
    canMove: canReorder,
    onMove: async ({ fromIndex, toIndex }) => {
      const visibleRows = getRows();
      const dataSourceSnapshot = getDataSource();
      const fromRow = visibleRows[fromIndex];
      const toRow = visibleRows[toIndex];
      if (!fromRow || !toRow) return;
      const draggedRows: Row<TableFeatures, TData>[] = [];
      const fromIndices: number[] = [];
      if (config.value?.multiple && fromRow.getIsSelected()) {
        for (let index = 0; index < visibleRows.length; index++) {
          const row = visibleRows[index]!;
          if (!row.getIsSelected()) continue;
          draggedRows.push(row);
          fromIndices.push(index);
        }
      } else {
        draggedRows.push(fromRow);
        fromIndices.push(fromIndex);
      }
      if (draggedRows.includes(toRow)) return;
      const targetSet = new Set(draggedRows.map((row) => row.original));
      const removed = removeRecords(dataSourceSnapshot, targetSet);
      if (removed.removed.length === 0) return;
      const requestedPosition = currentDropPosition.value;
      const position =
        requestedPosition === 'inside' && (!tree?.value || !config.value?.allowTreeReparent)
          ? 'after'
          : requestedPosition;
      const inserted = insertRecords(removed.data, toRow.original, removed.removed, position);
      if (!inserted.found) return;
      const parentId = position === 'inside' ? toRow.id : toRow.parentId;
      const payload: STableRowOrderChangeEvent<TData> = {
        dataSource: inserted.data,
        fromIndex,
        toIndex,
        fromIndices,
        rowKeys: draggedRows.map((row) => decodeRowKey(row.id)),
        targetRowKey: decodeRowKey(toRow.id),
        targetParentKey: parentId ? decodeRowKey(parentId) : null,
        position,
      };
      const beforeDrop = config.value?.beforeDrop;
      if (beforeDrop && (await beforeDrop(payload)) === false) return;
      const latestRows = getRows();
      if (
        getDataSource() !== dataSourceSnapshot ||
        latestRows[fromIndex]?.id !== fromRow.id ||
        latestRows[toIndex]?.id !== toRow.id
      ) {
        return;
      }
      onRowOrderChange?.(payload);
    },
  });

  let cachedDragOverElement: Element | null = null;
  let cachedDragOverRect: DOMRect | null = null;
  let cachedDragOverFrame = -1;

  const resetDragOverRect = () => {
    cachedDragOverElement = null;
    cachedDragOverRect = null;
    cachedDragOverFrame = -1;
  };

  const handleRowDragStart = (rowIndex: number) => {
    resetDragOverRect();
    handleRowDragStartBase(rowIndex);
  };

  const handleRowDragOver = (rowIndex: number, event: DragEvent) => {
    if (!isDragging.value) return;
    const rowElement = (event.target as Element | null)?.closest?.('.s-table-row');
    if (rowElement) {
      const frame = Math.floor(event.timeStamp / (1000 / 60));
      if (rowElement !== cachedDragOverElement || frame !== cachedDragOverFrame) {
        cachedDragOverElement = rowElement;
        cachedDragOverFrame = frame;
        cachedDragOverRect = rowElement.getBoundingClientRect();
      }
      const rect = cachedDragOverRect;
      if (!rect) return;
      const ratio = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;
      currentDropPosition.value =
        config.value?.allowTreeReparent && tree?.value && ratio >= 0.33 && ratio <= 0.67
          ? 'inside'
          : ratio < 0.5
            ? 'before'
            : 'after';
    }
    handleRowDragOverBase(rowIndex, event);
  };
  const handleRowDragEnd = () => {
    resetDragOverRect();
    currentDropPosition.value = 'after';
    handleRowDragEndBase();
  };

  // 拖拽句柄列定义
  const dragColumn = computed<ColumnDef<TableFeatures, TData, unknown> | undefined>(() => {
    if (!enabled.value) return undefined;
    const reorderingEnabled = canReorder?.() !== false;

    return toColumnDef({
      id: DRAG_COLUMN_ID,
      header: () => '',
      cell: (context: { row: Row<TableFeatures, TData> }) => {
        const record = context.row.original;
        const index = getRowVisibleIndex(context.row);

        const handleContent = renderDragHandle
          ? renderDragHandle({ record, index })
          : createVNode(DragHandleIcon);

        return createVNode(
          'div',
          {
            class: ['s-table-drag-handle', { 's-table-drag-handle-disabled': !reorderingEnabled }],
            draggable: reorderingEnabled ? 'true' : 'false',
            'aria-disabled': reorderingEnabled ? undefined : 'true',
            onDragstart: (e: DragEvent) => {
              e.stopPropagation();
              if (!reorderingEnabled || index < 0) {
                e.preventDefault();
                return;
              }
              handleRowDragStart(index);
            },
          },
          [handleContent]
        );
      },
      // 收窄默认列宽：拖拽句柄仅需容纳一个图标（40）。
      size: 40,
      minSize: 40,
      maxSize: 40,
      enableResizing: false,
      enableCellSelection: false,
      meta: { align: 'center' },
      fixed: 'left',
    });
  });

  return {
    isDragging,
    dragFromIndex,
    dragOverIndex,
    dropPosition: currentDropPosition,
    dragColumn,
    handleRowDragStart,
    handleRowDragOver,
    handleRowDragEnd,
    handleRowDrop,
  };
};
