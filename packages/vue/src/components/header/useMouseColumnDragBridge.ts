import { onBeforeUnmount, type VNodeChild } from 'vue';
import { isColumnDragExcludedTarget } from '../../utils/dom';
import { createDragPreview } from '../../utils/dragGhost';

type UseMouseColumnDragBridgeOptions = {
  isDraggableSource: (columnId: string) => boolean;
  isValidTarget: (columnId: string) => boolean;
  onDragStart: (columnId: string) => boolean;
  onDragOver: (columnId: string, event: DragEvent) => void;
  onDragEnd: () => void;
  onDrop: (target: HTMLElement) => void;
  getGhost?: (columnId: string) => VNodeChild | HTMLElement | undefined;
};

/** 原生 DnD 未启动时，由 thead 委托在移动超过 4px 后接管。 */
export const useMouseColumnDragBridge = ({
  isDraggableSource,
  isValidTarget,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  getGhost,
}: UseMouseColumnDragBridgeOptions) => {
  let removeMouseDragListeners: (() => void) | undefined;
  let clearClickGuard: (() => void) | undefined;
  let mouseDragActive = false;

  const clearMouseDrag = () => {
    removeMouseDragListeners?.();
    removeMouseDragListeners = undefined;
    if (mouseDragActive) onDragEnd();
    mouseDragActive = false;
  };

  const handleMouseDragCandidate = (event: MouseEvent) => {
    clearClickGuard?.();
    clearMouseDrag();
    if (
      event.button !== 0 ||
      !(event.target instanceof Element) ||
      isColumnDragExcludedTarget(event.target)
    )
      return;
    const source = event.target.closest<HTMLTableCellElement>('th[data-column-id]');
    const columnId = source?.dataset.columnId;
    const sourceTable = source?.closest('table');
    const doc = source?.ownerDocument;
    const win = doc?.defaultView;
    if (!source || !columnId || !sourceTable || !doc || !win || !isDraggableSource(columnId))
      return;

    const startX = event.clientX;
    const startY = event.clientY;
    let preview: ReturnType<typeof createDragPreview> | undefined;
    let frame: number | undefined;
    let pointerX = startX;
    let pointerY = startY;

    const updateTarget = (pointerEvent: MouseEvent) => {
      const target =
        pointerEvent.target instanceof Element
          ? pointerEvent.target.closest<HTMLTableCellElement>('th[data-column-id]')
          : null;
      if (!target || target.closest('table') !== sourceTable) return null;
      const targetId = target.dataset.columnId;
      if (!targetId || !isValidTarget(targetId)) return null;
      onDragOver(targetId, pointerEvent as unknown as DragEvent);
      return target;
    };
    const positionPreview = () => {
      frame = undefined;
      if (preview)
        preview.element.style.transform = `translate3d(${pointerX + 14}px, ${pointerY + 14}px, 0)`;
    };
    const handleMouseMove = (pointerEvent: MouseEvent) => {
      pointerX = pointerEvent.clientX;
      pointerY = pointerEvent.clientY;
      if (!mouseDragActive) {
        if (Math.hypot(pointerX - startX, pointerY - startY) < 4) return;
        if (!onDragStart(columnId)) {
          clearMouseDrag();
          return;
        }
        mouseDragActive = true;
        preview = createDragPreview(source, { kind: 'column', ghost: getGhost?.(columnId) });
        positionPreview();
      }
      pointerEvent.preventDefault();
      updateTarget(pointerEvent);
      if (frame === undefined) frame = win.requestAnimationFrame(positionPreview);
    };

    // mouseup 后浏览器可能立即派发 click；仅拦截这一轮，不影响下次点击或键盘排序。
    const guardTrailingClick = () => {
      clearClickGuard?.();
      const preventClick = (click: MouseEvent) => {
        if (
          click.detail > 0 &&
          click.target instanceof Node &&
          sourceTable.contains(click.target)
        ) {
          click.preventDefault();
          click.stopImmediatePropagation();
        }
        clearClickGuard?.();
      };
      const timeout = win.setTimeout(() => clearClickGuard?.(), 0);
      clearClickGuard = () => {
        win.clearTimeout(timeout);
        doc.removeEventListener('click', preventClick, true);
        clearClickGuard = undefined;
      };
      doc.addEventListener('click', preventClick, true);
    };
    const finishMouseDrag = (pointerEvent?: MouseEvent) => {
      if (!mouseDragActive) {
        clearMouseDrag();
        return;
      }
      const target = pointerEvent ? updateTarget(pointerEvent) : null;
      if (pointerEvent) guardTrailingClick();
      try {
        if (target) onDrop(target);
      } finally {
        clearMouseDrag();
      }
    };
    const handleMouseUp = (pointerEvent: MouseEvent) => finishMouseDrag(pointerEvent);
    const cancel = () => finishMouseDrag();
    const handleKeydown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape') cancel();
    };
    doc.addEventListener('mousemove', handleMouseMove);
    doc.addEventListener('mouseup', handleMouseUp, { once: true });
    doc.addEventListener('keydown', handleKeydown);
    doc.addEventListener('pointercancel', cancel, { once: true });
    win.addEventListener('blur', cancel, { once: true });
    removeMouseDragListeners = () => {
      doc.removeEventListener('mousemove', handleMouseMove);
      doc.removeEventListener('mouseup', handleMouseUp);
      doc.removeEventListener('keydown', handleKeydown);
      doc.removeEventListener('pointercancel', cancel);
      win.removeEventListener('blur', cancel);
      if (frame !== undefined) win.cancelAnimationFrame(frame);
      preview?.dispose();
    };
  };

  onBeforeUnmount(() => {
    clearMouseDrag();
    clearClickGuard?.();
  });
  return { handleMouseDragCandidate, clearMouseDrag };
};
