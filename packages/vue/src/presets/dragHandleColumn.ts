import { createVNode } from 'vue';
import type { ColumnDef, Row, RowData, TableFeatures } from '@tanstack/vue-table';
import { DRAG_COLUMN_ID } from '../constants';
import { toColumnDef } from '../utils';
import { getRowVisibleIndex } from '../adapter/tableDisplayOrder';
import { DragHandleIcon } from '../components/icon';

export type CreateDragHandleColumnOptions<TData extends RowData> = {
  /** 每次渲染时求值：排序 / 分组 / 固定行使手工重排失去稳定语义。 */
  getCanReorder: () => boolean;
  /** 拖拽开始前求值：返回 false 阻止该行拖拽。 */
  getCanDrag?: (scope: { record: TData; index: number }) => boolean;
  renderDragHandle?: (scope: { record: TData; index: number }) => unknown;
  onDragStart: (index: number, event?: DragEvent) => void;
};

/** 内置行拖拽句柄列；调用方只传入交互回调。 */
export const createDragHandleColumn = <TData extends RowData>({
  getCanReorder,
  getCanDrag,
  renderDragHandle,
  onDragStart,
}: CreateDragHandleColumnOptions<TData>): ColumnDef<TableFeatures, TData, unknown> => {
  const cell = (context: { row: Row<TableFeatures, TData> }) => {
    const record = context.row.original;
    const index = getRowVisibleIndex(context.row);
    // 渲染阶段同步求值权限，让禁用行在视觉上直接呈现不可拖拽状态。
    const draggable = getCanReorder() && index >= 0 && (getCanDrag?.({ record, index }) ?? true);
    const handleContent = renderDragHandle
      ? renderDragHandle({ record, index })
      : createVNode(DragHandleIcon);

    return createVNode(
      'div',
      {
        class: ['s-table-drag-handle', { 's-table-drag-handle-disabled': !draggable }],
        draggable: draggable ? 'true' : 'false',
        'aria-disabled': draggable ? undefined : 'true',
        onDragstart: (event: DragEvent) => {
          event.stopPropagation();
          if (!draggable) {
            event.preventDefault();
            return;
          }
          onDragStart(index, event);
        },
      },
      [handleContent]
    );
  };

  return toColumnDef({
    id: DRAG_COLUMN_ID,
    header: () => '',
    cell,
    size: 48,
    minSize: 48,
    maxSize: 48,
    enableResizing: false,
    meta: { align: 'center' },
    fixed: 'left',
  });
};
