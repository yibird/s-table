import { createVNode } from 'vue';
import type { ColumnDef, Row, RowData, TableFeatures } from '@tanstack/vue-table';
import { DRAG_COLUMN_ID } from '../constants';
import { toColumnDef } from '../utils';
import { getRowVisibleIndex } from '../adapter/tableDisplayOrder';
import { DragHandleIcon } from '../components/icon';

export type CreateDragHandleColumnOptions<TData extends RowData> = {
  /** 每次渲染时求值：排序 / 分组 / 固定行使手工重排失去稳定语义。 */
  getCanReorder: () => boolean;
  renderDragHandle?: (scope: { record: TData; index: number }) => unknown;
  onDragStart: (index: number) => void;
};

/** 内置行拖拽句柄列；调用方只传入交互回调。 */
export const createDragHandleColumn = <TData extends RowData>({
  getCanReorder,
  renderDragHandle,
  onDragStart,
}: CreateDragHandleColumnOptions<TData>): ColumnDef<TableFeatures, TData, unknown> => {
  const cell = (context: { row: Row<TableFeatures, TData> }) => {
    const record = context.row.original;
    const index = getRowVisibleIndex(context.row);
    const reorderingEnabled = getCanReorder();
    const handleContent = renderDragHandle
      ? renderDragHandle({ record, index })
      : createVNode(DragHandleIcon);

    return createVNode(
      'div',
      {
        class: ['s-table-drag-handle', { 's-table-drag-handle-disabled': !reorderingEnabled }],
        draggable: reorderingEnabled ? 'true' : 'false',
        'aria-disabled': reorderingEnabled ? undefined : 'true',
        onDragstart: (event: DragEvent) => {
          event.stopPropagation();
          if (!reorderingEnabled || index < 0) {
            event.preventDefault();
            return;
          }
          onDragStart(index);
        },
      },
      [handleContent]
    );
  };

  return toColumnDef({
    id: DRAG_COLUMN_ID,
    header: () => '',
    cell,
    // 收窄默认列宽：拖拽句柄仅需容纳一个图标。
    size: 40,
    minSize: 40,
    maxSize: 40,
    enableResizing: false,
    meta: { align: 'center' },
    fixed: 'left',
  });
};
