<template>
  <div class="s-checkbox-group">
    <Checkbox
      v-for="option in options"
      :key="option.value"
      :model-value="isChecked(option.value)"
      :disabled="disabled || option.disabled"
      :size="size"
      @update:model-value="toggle(option.value)"
    >
      {{ option.label }}
    </Checkbox>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Checkbox from './Checkbox.vue';
import type { CheckboxGroupProps } from './types';
import './styles.less';

const props = withDefaults(defineProps<CheckboxGroupProps>(), {
  modelValue: () => [],
  options: () => [],
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: (string | number)[]];
  change: [value: (string | number)[]];
}>();

defineSlots<{
  default?: () => unknown;
}>();

const selectedValueSet = computed(() => new Set(props.modelValue));

/** 判断指定值是否已被复选组选中。 */
const isChecked = (value: string | number): boolean => selectedValueSet.value.has(value);

/** 切换指定值，并提交新的复选值集合。 */
const toggle = (value: string | number) => {
  const next = isChecked(value)
    ? props.modelValue.filter((v) => v !== value)
    : [...props.modelValue, value];
  emit('update:modelValue', next);
  emit('change', next);
};
</script>
