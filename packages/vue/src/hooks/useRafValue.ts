import { onScopeDispose, shallowRef, watch, type ShallowRef, type WatchSource } from 'vue';
import { scheduleAnimationFrame, type ScheduledAnimationFrame } from '../utils';

type UseRafValueOptions = {
  enabled?: WatchSource<boolean>;
};

/**
 * 使用 `requestAnimationFrame` 合并高频响应式更新；关闭合帧时直接提交最新值。
 */
export const useRafValue = <TValue>(
  source: WatchSource<TValue>,
  options: UseRafValueOptions = {}
): ShallowRef<TValue | undefined> => {
  const state = shallowRef<TValue>();
  const enabled = options.enabled ?? (() => true);
  let latestValue: TValue | undefined;
  let scheduledFrame: ScheduledAnimationFrame | null = null;

  const flush = () => {
    state.value = latestValue;
    scheduledFrame = null;
  };

  watch(
    [source, enabled],
    ([value, isEnabled]) => {
      latestValue = value;

      if (!isEnabled) {
        scheduledFrame?.cancel();
        scheduledFrame = null;
        state.value = value;
        return;
      }

      scheduledFrame ??= scheduleAnimationFrame(flush);
    },
    { immediate: true }
  );

  onScopeDispose(() => {
    scheduledFrame?.cancel();
    scheduledFrame = null;
  });

  return state;
};
