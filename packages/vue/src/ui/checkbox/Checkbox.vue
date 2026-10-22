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
        ref="inputRef"
        type="checkbox"
        class="s-checkbox-input"
        :checked="modelValue"
        :disabled="disabled"
        :indeterminate="indeterminate"
      />
      <span ref="innerRef" class="s-checkbox-inner" />
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
// 波纹作用于可见的方形控件本身，才能拿到 4px 圆角与准确的 18px 尺寸。
const innerRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

/**
 * label 上的 `click.prevent` 取消了原生激活行为；浏览器会在事件派发结束时
 * 把 `checked` 回滚到点击前的值，造成原生控件状态与受控 `modelValue` 分叉。
 * 在宏任务（原生回滚之后）重新对齐，保证屏幕阅读器和表单读取到正确状态。
 */
const syncNativeState = () => {
  setTimeout(() => {
    const input = inputRef.value;
    if (!input) return;
    input.checked = props.modelValue;
    input.indeterminate = props.indeterminate;
  }, 0);
};

/** 切换复选状态并触发变更事件，同时播放 antd 风格波纹。 */
const handleClick = (event: MouseEvent) => {
  if (props.disabled) return;
  if (boxRef.value) {
    // Checkbox 容器没有可用边框色，显式读取实例继承的主题色，避免默认 border-color 解析为灰色。
    const themeColor = getComputedStyle(boxRef.value).getPropertyValue('--s-primary-color').trim();
    showWave(innerRef.value ?? boxRef.value, themeColor || '#1677ff');
  }
  const next = !props.modelValue;
  emit('update:modelValue', next);
  emit('change', next, event);
  syncNativeState();
};
</script>
