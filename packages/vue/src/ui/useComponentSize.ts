import { computed, inject, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { SizeContextKey, type SComponentSize } from '../context/size';

/**
 * 获取组件最终生效的尺寸。
 *
 * STable 通过 `SizeContextKey` 注入表格尺寸，Button / Input / Checkbox / Radio /
 * Select / Pagination 等内置组件共用该解析逻辑。
 *
 * 优先级：组件自身 size prop > Context Size（Table 注入）> 'middle'。
 * 显式传入 size 可在面板等局部场景覆盖表格尺寸。
 *
 * @param {MaybeRefOrGetter<SComponentSize | undefined>} componentSize 组件自身传入的 size（响应式）。
 * @returns {ComputedRef<SComponentSize>} 最终生效的尺寸。
 */
export function useComponentSize(componentSize?: MaybeRefOrGetter<SComponentSize | undefined>) {
  const contextSize = inject(SizeContextKey, undefined);
  return computed(() => {
    // 组件显式声明的尺寸优先，未被覆盖时再继承表格尺寸。
    const selfSize = componentSize !== undefined ? toValue(componentSize) : undefined;
    if (selfSize) return selfSize;
    if (contextSize?.value) return contextSize.value;
    return 'middle';
  });
}
