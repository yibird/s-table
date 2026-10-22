/** 拖拽移动结果，只描述位置变化，不隐式复制业务数据。 */
export interface DragMoveResult {
  fromIndex: number;
  toIndex: number;
}

export interface DragState {
  isDragging: boolean;
  dragFromIndex: number;
  dragOverIndex: number;
}

export interface DragControllerOptions {
  /** Drop 时读取最新元素数量，避免拖拽期间数据变化导致索引越界。 */
  getItemCount: () => number;
  /** 当前是否允许移动。 */
  canMove?: () => boolean;
  /** 合法移动回调；业务层按自身数据模型决定如何重排。 */
  onMove?: (result: DragMoveResult) => void | Promise<void>;
}

export interface DragController {
  readonly state: DragState;
  reset(): void;
  start(index: number): void;
  /** 返回 true 表示目标有效，适配层可据此调用 preventDefault。 */
  over(index: number): boolean;
  end(): void;
  drop(): Promise<void>;
}

/** 返回移动单个元素后的新数组。 */
export const moveArrayItem = <TItem>(
  source: readonly TItem[],
  fromIndex: number,
  toIndex: number
): TItem[] => {
  const items = [...source];
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const moved = items[fromIndex]!;
  items.splice(fromIndex, 1);
  items.splice(toIndex, 0, moved);
  return items;
};

const isMoveEnabled = (options: DragControllerOptions): boolean => options.canMove?.() !== false;

/** 框架无关的拖拽状态机；UI 框架只需把 state 映射到自己的响应式状态。 */
export const createDragController = (options: DragControllerOptions): DragController => {
  const state: DragState = {
    isDragging: false,
    dragFromIndex: -1,
    dragOverIndex: -1,
  };

  const reset = () => {
    state.isDragging = false;
    state.dragFromIndex = -1;
    state.dragOverIndex = -1;
  };

  const start = (index: number) => {
    if (!isMoveEnabled(options) || index < 0 || index >= options.getItemCount()) {
      reset();
      return;
    }
    state.isDragging = true;
    state.dragFromIndex = index;
    state.dragOverIndex = index;
  };

  const over = (index: number): boolean => {
    if (!state.isDragging || !isMoveEnabled(options)) return false;
    if (index < 0 || index >= options.getItemCount()) {
      // 显式传入负索引表示「当前没有合法落点」，立即清除悬停态，
      // 避免拖拽块经过自身或离开可投放区域后残留目标高亮。
      state.dragOverIndex = -1;
      return false;
    }
    state.dragOverIndex = index;
    return true;
  };

  const drop = async (): Promise<void> => {
    const { dragFromIndex: fromIndex, dragOverIndex: toIndex } = state;
    const itemCount = options.getItemCount();
    if (
      !isMoveEnabled(options) ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= itemCount ||
      toIndex >= itemCount ||
      fromIndex === toIndex
    ) {
      reset();
      return;
    }

    try {
      await options.onMove?.({ fromIndex, toIndex });
    } finally {
      reset();
    }
  };

  return { state, reset, start, over, end: reset, drop };
};
