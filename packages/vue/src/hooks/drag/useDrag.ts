import { shallowRef } from 'vue';
import { createDragController, type DragControllerOptions } from '@zchengfeng/s-table-core';

export type { DragMoveResult } from '@zchengfeng/s-table-core';

export type UseDragOptions = DragControllerOptions;

/** Vue 适配层：把 core 拖拽状态机映射为 shallowRef，并处理浏览器默认拖放行为。 */
export const useDrag = (options: UseDragOptions) => {
  const controller = createDragController(options);
  const isDragging = shallowRef(false);
  const dragFromIndex = shallowRef(-1);
  const dragOverIndex = shallowRef(-1);

  const syncState = () => {
    isDragging.value = controller.state.isDragging;
    dragFromIndex.value = controller.state.dragFromIndex;
    dragOverIndex.value = controller.state.dragOverIndex;
  };

  /** 开始拖拽并同步 core 状态。 */
  const handleDragStart = (index: number) => {
    controller.start(index);
    syncState();
  };

  /** 处理拖拽经过事件，只在允许移动时阻止浏览器默认行为。 */
  const handleDragOver = (index: number, event: DragEvent) => {
    if (controller.over(index)) event.preventDefault();
    syncState();
  };

  /** 结束拖拽并清理交互状态。 */
  const handleDragEnd = () => {
    controller.end();
    syncState();
  };

  /** 提交拖拽结果，并确保异步回调结束后状态必定复位。 */
  const handleDrop = async () => {
    try {
      await controller.drop();
    } finally {
      syncState();
    }
  };

  return {
    isDragging,
    dragFromIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
  };
};
