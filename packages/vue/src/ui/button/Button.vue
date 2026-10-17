<template>
  <button
    :class="buttonClass"
    :type="htmlType"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="s-btn-loading-icon">
      <svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor">
        <path
          d="M988 548c-19.9 0-36-16.1-36-36 0-59.4-11.6-117-34.6-171.3a440.45 440.45 0 00-94.3-139.9 437.71 437.71 0 00-139.9-94.3C629 83.6 571.4 72 512 72c-19.9 0-36-16.1-36-36s16.1-36 36-36c69.1 0 136.2 13.5 199.3 40.3C772.3 66 827 103 874 150c47 47 83.9 101.8 109.7 162.7 26.7 63.1 40.2 130.2 40.2 199.3.1 19.9-16 36-35.9 36z"
        />
      </svg>
    </span>
    <span v-if="slots.icon && !loading" class="s-btn-icon">
      <slot name="icon" />
    </span>
    <span v-if="slots.default" class="s-btn-content">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useComponentSize } from '../useComponentSize';
import { showWave } from '../wave';
import type { ButtonProps } from './types';
import './styles.less';

const props = withDefaults(defineProps<ButtonProps>(), {
  type: 'default',
  danger: false,
  ghost: false,
  disabled: false,
  loading: false,
  block: false,
  htmlType: 'button',
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const slots = defineSlots<{
  default?: () => unknown;
  icon?: () => unknown;
}>();

const size = useComponentSize(() => props.size);

const buttonClass = computed(() => [
  's-btn',
  `s-btn-${props.type}`,
  `s-btn-${size.value}`,
  {
    's-btn-danger': props.danger,
    's-btn-ghost': props.ghost,
    's-btn-block': props.block,
    's-btn-loading': props.loading,
    's-btn-disabled': props.disabled || props.loading,
    's-btn-icon-only': !props.loading && !!slots.icon && !slots.default,
  },
]);

const handleClick = (event: MouseEvent) => {
  if (props.disabled || props.loading) return;
  // 与 Pagination 保持同一触发路径，避免组件 ref 在卸载边界上指向失效节点。
  if (event.currentTarget instanceof HTMLElement) showWave(event.currentTarget);
  emit('click', event);
};
</script>
