<template>
  <div class="s-radio-group">
    <Radio
      v-for="option in options"
      :key="getValueKey(option.value)"
      :model-value="modelValue"
      :value="option.value"
      :disabled="disabled || option.disabled"
      :size="size"
      @update:model-value="handleChange"
    >
      {{ option.label }}
    </Radio>
    <slot />
  </div>
</template>

<script setup lang="ts">
import Radio from './Radio.vue';
import type { RadioGroupProps, RadioValue } from './types';
import './styles.less';

const props = withDefaults(defineProps<RadioGroupProps>(), {
  options: () => [],
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: RadioValue];
  change: [value: RadioValue];
}>();

defineSlots<{
  default?: () => unknown;
}>();

/** Vue key 编码值类型，避免数字 1 与字符串 "1" 复用同一个单选节点。 */
const getValueKey = (value: RadioValue): string => `${typeof value}:${String(value)}`;

/** 将有效的子单选值同步到组模型并发出变更事件。 */
const handleChange = (value: RadioValue | undefined) => {
  // Radio 选中时必然携带自身 value（RadioValue），undefined 仅来自子组件宽松的 modelValue 类型，
  // 单选场景不会发生；防御性跳过以对齐类型。
  if (value === undefined) return;
  emit('update:modelValue', value);
  emit('change', value);
};
</script>
