import { computed, shallowRef, watch, type ComputedRef, type Ref, type ShallowRef } from 'vue';

export type UseModelStateOptions<T> = {
  /** model 值；undefined 表示当前处于非受控模式。 */
  modelValue: Readonly<Ref<T | undefined>>;
  /** 非受控模式的初始值（惰性求值，仅在 setup 时读取一次）。 */
  defaultValue: () => T;
  /** model 值写入非受控回退状态前的拷贝 / 归一化；默认原样赋值。 */
  toInternalValue?: (value: T) => T;
  /** model 源 watch 每次触发时回调（无论值是否为 undefined），用于版本号等副作用。 */
  onSync?: (value: T | undefined) => void;
};

// 库声明生成时 shallowRef<T> 的推导会引用 Vue 内部 IfAny，显式写出公开形状以保持 .d.ts 可移植。
type ModelState<T> = {
  state: ComputedRef<T>;
  internal: ShallowRef<T>;
  isControlled: ComputedRef<boolean>;
};

/**
 * 统一 Vue 组件的 model 状态与内部回退状态。
 *
 * model 值存在时以它为唯一真源；未提供时使用内部状态。最新 model 值会同步到内部状态，
 * 保证从受控模式切回非受控模式时不会恢复为过期默认值。
 */
export const useModelState = <T>({
  modelValue,
  defaultValue,
  toInternalValue,
  onSync,
}: UseModelStateOptions<T>): ModelState<T> => {
  const toInternal = toInternalValue ?? ((value: T) => value);
  const initialModelValue = modelValue.value;
  const internal = shallowRef<T>(
    initialModelValue === undefined ? defaultValue() : toInternal(initialModelValue)
  );
  const isControlled = computed(() => modelValue.value !== undefined);
  onSync?.(initialModelValue);
  watch(modelValue, (value, previousValue) => {
    onSync?.(value);
    if (value !== undefined) {
      internal.value = toInternal(value);
    } else if (previousValue !== undefined) {
      // 只在受控边界切换时读取旧值。数组即使曾被原地修改，previousValue 也包含
      // 最终内容，因此无需 deep watch 为每次 push/splice 额外复制整个集合。
      internal.value = toInternal(previousValue);
    }
  });
  const state = computed<T>(() => {
    const value = modelValue.value;
    return value === undefined ? internal.value : value;
  });
  return { state, internal, isControlled };
};
