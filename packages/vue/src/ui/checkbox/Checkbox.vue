<template>
  <label
    :class="[
      's-checkbox-wrapper',
      `s-checkbox-wrapper-${size}`,
      {
        's-checkbox-wrapper-checked': modelValue,
        's-checkbox-wrapper-disabled': disabled,
        's-checkbox-wrapper-indeterminate': indeterminate && !modelValue,
      },
    ]"
    @click.prevent="handleClick"
  >
    <span ref="boxRef" class="s-checkbox">
      <input
        type="checkbox"
        class="s-checkbox-input"
        :checked="modelValue"
        :disabled="disabled"
        :indeterminate="indeterminate"
      />
      <span class="s-checkbox-inner" />
    </span>
    <span v-if="$slots.default" class="s-checkbox-label">
      <slot />
    </span>
  </label>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useComponentSize } from '../useComponentSize';
import { showWave } from '../wave';
import type { CheckboxProps } from './types';
import './styles.less';

const props = withDefaults(defineProps<CheckboxProps>(), {
  modelValue: false,
  disabled: false,
  indeterminate: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  change: [value: boolean, event: MouseEvent];
}>();

defineSlots<{
  default?: () => unknown;
}>();

const size = useComponentSize(() => props.size);

const boxRef = ref<HTMLElement | null>(null);

/** 切换复选状态并触发变更事件，同时播放 antd 风格波纹。 */
const handleClick = (event: MouseEvent) => {
  if (props.disabled) return;
  if (boxRef.value) {
    // Checkbox 容器没有可用边框色，显式读取实例继承的主题色，避免默认 border-color 解析为灰色。
    const themeColor = getComputedStyle(boxRef.value).getPropertyValue('--s-primary-color').trim();
    showWave(boxRef.value, themeColor || '#1677ff');
  }
  const next = !props.modelValue;
  emit('update:modelValue', next);
  emit('change', next, event);
};
</script>
