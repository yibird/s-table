import { onBeforeUnmount } from 'vue';

type UseMouseColumnDragBridgeOptions = {
  /** 源表头是否允许拖拽（draggable 列且为用户列）。 */
  isDraggableSource: (columnId: string) => boolean;
  /** 目标表头是否为合法落点（同表且为用户列）。 */
  isValidTarget: (columnId: string) => boolean;
  onDragStart: (columnId: string) => void;
  onDragOver: (columnId: string, event: DragEvent) => void;
  onDragEnd: () => void;
  /** 在目标 th 上派发合成 drop 事件，复用 HeaderCell 的 drop 流程。 */
  onDrop: (target: HTMLElement) => void;
};

/**
 * Chromium 表头单元格原生拖拽未启动时，由 thead 单一 mousedown 委托
 * 桥接现有列拖拽流程：移动超过 4px 后进入拖拽态，mouseup 时合成 drop。
 */
export const useMouseColumnDragBridge = ({
  isDraggableSource,
  isValidTarget,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: UseMouseColumnDragBridgeOptions) => {
  let removeMouseDragListeners: (() => void) | null = null;
  let mouseDragActive = false;

  const clearMouseDrag = () => {
    removeMouseDragListeners?.();
    removeMouseDragListeners = null;
    mouseDragActive = false;
  };

  const handleMouseDragCandidate = (event: MouseEvent) => {
    if (event.button !== 0 || !(event.target instanceof Element)) return;
    const source = event.target.closest<HTMLTableCellElement>('th[data-column-id]');
    const columnId = source?.dataset.columnId;
    const sourceTable = source?.closest('table');
    const ownerDocument = source?.ownerDocument;
    if (!source || !columnId || !sourceTable || !ownerDocument || !isDraggableSource(columnId)) {
      return;
    }

    clearMouseDrag();
    const startX = event.clientX;
    const startY = event.clientY;

    const updateTarget = (pointerEvent: MouseEvent) => {
      const target =
        pointerEvent.target instanceof Element
          ? pointerEvent.target.closest<HTMLTableCellElement>('th[data-column-id]')
          : null;
      if (!target || target.closest('table') !== sourceTable) return null;
      const targetColumnId = target.dataset.columnId;
      if (!targetColumnId || !isValidTarget(targetColumnId)) return null;
      onDragOver(targetColumnId, pointerEvent as unknown as DragEvent);
      return target;
    };

    const handleMouseMove = (pointerEvent: MouseEvent) => {
      if (!mouseDragActive) {
        const distance = Math.hypot(pointerEvent.clientX - startX, pointerEvent.clientY - startY);
        if (distance < 4) return;
        mouseDragActive = true;
        onDragStart(columnId);
      }
      pointerEvent.preventDefault();
      updateTarget(pointerEvent);
    };

    const finishMouseDrag = (pointerEvent?: MouseEvent) => {
      const wasActive = mouseDragActive;
      const target = pointerEvent ? updateTarget(pointerEvent) : null;
      clearMouseDrag();
      if (!wasActive) return;
      if (target) onDrop(target);
      onDragEnd();
    };

    const handleMouseUp = (pointerEvent: MouseEvent) => finishMouseDrag(pointerEvent);
    const handleWindowBlur = () => finishMouseDrag();
    ownerDocument.addEventListener('mousemove', handleMouseMove);
    ownerDocument.addEventListener('mouseup', handleMouseUp, { once: true });
    ownerDocument.defaultView?.addEventListener('blur', handleWindowBlur, { once: true });
    removeMouseDragListeners = () => {
      ownerDocument.removeEventListener('mousemove', handleMouseMove);
      ownerDocument.removeEventListener('mouseup', handleMouseUp);
      ownerDocument.defaultView?.removeEventListener('blur', handleWindowBlur);
    };
  };

  onBeforeUnmount(clearMouseDrag);

  return { handleMouseDragCandidate, clearMouseDrag };
};
