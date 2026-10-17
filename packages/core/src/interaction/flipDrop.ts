export interface FlipDropOptions {
  capturePositions: () => Map<string, number>;
  animate: (positions: Map<string, number>) => void;
  onDrop: () => Promise<void> | void;
  canAnimate: () => boolean;
  /** 框架在 DOM 提交后提供的 flush；不传时直接播放。 */
  afterCommit?: () => Promise<void> | void;
}

/** 捕获旧位置、提交数据、等待外部 flush、播放动画的通用编排。 */
export const createFlipDropController = ({
  capturePositions,
  animate,
  onDrop,
  canAnimate,
  afterCommit,
}: FlipDropOptions) => {
  const handleDrop = async (): Promise<void> => {
    if (!canAnimate()) {
      await onDrop();
      return;
    }
    const positions = capturePositions();
    await onDrop();
    await afterCommit?.();
    animate(positions);
  };

  return { handleDrop };
};
