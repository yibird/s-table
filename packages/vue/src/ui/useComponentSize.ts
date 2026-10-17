import { computed, inject, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { SizeContextKey, type SComponentSize } from '../context/size';

/**
 * 获取组件最终生效的尺寸。
 *
 * 优先级：Context Size（Table 注入）> 组件自身 size prop > 'middle'。
 *
 * @param {MaybeRefOrGetter<SComponentSize | undefined>} componentSize 组件自身传入的 size（响应式）。
 * @returns {ComputedRef<SComponentSize>} 最终生效的尺寸。
 */
export function useComponentSize(componentSize?: MaybeRefOrGetter<SComponentSize | undefined>) {
  const contextSize = inject(SizeContextKey, undefined);
  return computed(() => {
    // Context Size 优先级最高
    if (contextSize?.value) return contextSize.value;
    // 组件自身 size（支持响应式）
    const selfSize = componentSize !== undefined ? toValue(componentSize) : undefined;
    if (selfSize) return selfSize;
    return 'middle';
  });
}
