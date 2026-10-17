import { nextTick, onBeforeUnmount, type Ref } from 'vue';
import {
  createFlipAnimation,
  createFlipDropController,
  type FlipAnimationOptions,
  type FlipDropOptions,
} from '@zchengfeng/s-table-core';

export type UseFlipAnimationOptions = Omit<FlipAnimationOptions, 'getContainer'> & {
  containerRef: Readonly<Ref<HTMLElement | null>>;
};

export type UseFlipDropAnimationOptions = UseFlipAnimationOptions &
  Pick<FlipDropOptions, 'canAnimate' | 'onDrop'>;

/** Vue 适配层：把模板 ref 和卸载生命周期接入 core 的 DOM FLIP 实现。 */
export const useFlipAnimation = ({ containerRef, ...options }: UseFlipAnimationOptions) => {
  const animation = createFlipAnimation({
    ...options,
    getContainer: () => containerRef.value,
  });
  onBeforeUnmount(animation.cancel);
  return animation;
};

/**
 * Vue FLIP 拖拽动画：统一完成位置捕获、业务提交、DOM flush 与动画清理。
 * 调用方只描述动画目标和 drop 行为，避免分别组装两个总是成对出现的适配 Hook。
 */
export const useFlipDropAnimation = ({
  canAnimate,
  onDrop,
  ...animationOptions
}: UseFlipDropAnimationOptions) => {
  const animation = useFlipAnimation(animationOptions);
  const { handleDrop } = createFlipDropController({
    ...animation,
    canAnimate,
    onDrop,
    afterCommit: nextTick,
  });
  return { ...animation, handleDrop };
};
