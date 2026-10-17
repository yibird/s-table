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
      <input type="radio" class="s-radio-input" :checked="isChecked" :disabled="disabled" />
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
  'update:modelValue': [value: RadioProps['value']];
  change: [value: RadioProps['value']];
}>();

defineSlots<{
  default?: () => unknown;
}>();

const size = useComponentSize(() => props.size);

const isChecked = computed(() => props.modelValue === props.value);

const boxRef = ref<HTMLElement | null>(null);
// 波纹作用于圆形控件本身，才能拿到 50% 圆角与准确尺寸。
const innerRef = ref<HTMLElement | null>(null);

/** 在可用且未选中时提交当前单选值，并播放 antd 风格波纹。 */
const handleClick = () => {
  if (props.disabled || isChecked.value) return;
  if (boxRef.value) {
    // Radio 容器同样没有可用边框色，显式读取主题色避免误用 currentColor（黑色）。
    const themeColor = getComputedStyle(boxRef.value).getPropertyValue('--s-primary-color').trim();
    showWave(innerRef.value ?? boxRef.value, themeColor || '#1677ff');
  }
  emit('update:modelValue', props.value);
  emit('change', props.value);
};
</script>
