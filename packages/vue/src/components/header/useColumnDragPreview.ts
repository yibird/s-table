import { onBeforeUnmount, type Ref, type VNodeChild } from 'vue';
import { setNativeDragPreview } from '../../utils/dragGhost';

type UseColumnDragPreviewOptions = {
  thRef: Readonly<Ref<HTMLTableCellElement | null>>;
};

export const useColumnDragPreview = ({ thRef }: UseColumnDragPreviewOptions) => {
  let cleanup: (() => void) | undefined;
  const clearCustomDragImage = () => {
    cleanup?.();
    cleanup = undefined;
  };
  const setCustomDragImage = (event: DragEvent, ghost?: VNodeChild | HTMLElement) => {
    clearCustomDragImage();
    if (thRef.value) {
      cleanup = setNativeDragPreview(event, thRef.value, { kind: 'column', ghost });
    }
  };
  onBeforeUnmount(clearCustomDragImage);
  return { setCustomDragImage, clearCustomDragImage };
};
