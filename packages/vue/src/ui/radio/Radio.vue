<template>
  <label
    :class="[
      's-radio-wrapper',
      `s-radio-wrapper-${size}`,
      {
        's-radio-wrapper-checked': isChecked,
        's-radio-wrapper-disabled': disabled,
      },
    ]"
    @click.prevent="handleClick"
  >
    <span ref="boxRef" class="s-radio">
      <input
        ref="inputRef"
        type="radio"
        class="s-radio-input"
        :checked="isChecked"
        :disabled="disabled"
      />
      <span ref="innerRef" class="s-radio-inner" />
    </span>
    <span v-if="$slots.default" class="s-radio-label">
      <slot />
    </span>
  </label>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useComponentSize } from '../useComponentSize';
import { showWave } from '../wave';
import type { RadioProps } from './types';
import './styles.less';

const props = withDefaults(defineProps<RadioProps>(), {
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: RadioProps['value'] | undefined];
  change: [value: RadioProps['value'] | undefined];
}>();

defineSlots<{
  default?: () => unknown;
}>();

const size = useComponentSize(() => props.size);

const isChecked = computed(() => props.modelValue === props.value);

const boxRef = ref<HTMLElement | null>(null);
// 波纹作用于圆形控件本身，才能拿到 50% 圆角与准确尺寸。
const innerRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

/**
 * label 上的 `click.prevent` 会取消原生激活；浏览器随后回滚点击前的
 * `checked` 状态，使原生 radio 与受控选中项不一致。宏任务中重新对齐。
 */
const syncNativeChecked = () => {
  setTimeout(() => {
    if (inputRef.value) inputRef.value.checked = isChecked.value;
  }, 0);
};

/**
 * 播放 antd 风格波纹后提交当前单选值。
 *
 * 波纹不依赖选中状态：点击已选中的 Radio 同样有反馈，
 * 这与 antd 一致；只有值真正变化时才派发更新事件。
 */
const handleClick = () => {
  if (props.disabled) return;
  if (boxRef.value) {
    // Radio 容器同样没有可用边框色，显式读取主题色避免误用 currentColor（黑色）。
    const themeColor = getComputedStyle(boxRef.value).getPropertyValue('--s-primary-color').trim();
    showWave(innerRef.value ?? boxRef.value, themeColor || '#1677ff');
  }
  if (isChecked.value) {
    if (props.allowUncheck) {
      emit('update:modelValue', undefined);
      emit('change', undefined);
    }
    syncNativeChecked();
    return;
  }
  emit('update:modelValue', props.value);
  emit('change', props.value);
  syncNativeChecked();
};
</script>
