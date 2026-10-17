<template>
  <div
    :class="[
      's-input-wrapper',
      `s-input-wrapper-${size}`,
      {
        's-input-wrapper-disabled': disabled,
        's-input-wrapper-focused': isFocused,
        's-input-wrapper-has-prefix': !!slots.prefix,
        's-input-wrapper-has-suffix': !!slots.suffix || showClear,
        's-input-wrapper-addon': !!slots.addonBefore || !!slots.addonAfter,
      },
    ]"
    @click="focusInput"
  >
    <span v-if="slots.addonBefore" class="s-input-addon s-input-addon-before">
      <slot name="addonBefore" />
    </span>
    <span class="s-input-affix">
      <span v-if="slots.prefix" class="s-input-prefix">
        <slot name="prefix" />
      </span>
      <textarea
        v-if="type === 'textarea'"
        ref="inputRef"
        class="s-input"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxlength"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <input
        v-else
        ref="inputRef"
        class="s-input"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxlength"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <span v-if="showClear" class="s-input-clear" @click.stop="handleClear">
        <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor">
          <path
            d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm165.4 618.2l-66-.3L512 563.4l-99.3 118.4-66.1.3c-4.4 0-8-3.5-8-8 0-1.9.7-3.7 1.9-5.2l130.1-155L340.5 359a8.32 8.32 0 01-1.9-5.2c0-4.4 3.6-8 8-8l66.1.3L512 464.6l99.3-118.4 66-.3c4.4 0 8 3.5 8 8 0 1.9-.7 3.7-1.9 5.2L553.5 514l130 155c1.2 1.5 1.9 3.3 1.9 5.2 0 4.4-3.6 8-8 8z"
          />
        </svg>
      </span>
      <span v-if="slots.suffix" class="s-input-suffix">
        <slot name="suffix" />
      </span>
    </span>
    <span v-if="slots.addonAfter" class="s-input-addon s-input-addon-after">
      <slot name="addonAfter" />
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useComponentSize } from '../useComponentSize';
import type { InputProps } from './types';
import './styles.less';

const props = withDefaults(defineProps<InputProps>(), {
  modelValue: '',
  type: 'text',
  disabled: false,
  allowClear: false,
  readonly: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  change: [value: string];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
  clear: [];
}>();

const slots = defineSlots<{
  prefix?: () => unknown;
  suffix?: () => unknown;
  addonBefore?: () => unknown;
  addonAfter?: () => unknown;
}>();

const inputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);
const isFocused = ref(false);

const size = useComponentSize(() => props.size);

const showClear = computed(
  () => props.allowClear && !props.disabled && !props.readonly && props.modelValue.length > 0
);

/** 读取原生输入值并同步模型与 change 事件。 */
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
  emit('change', target.value);
};

/** 标记聚焦状态并上报 focus 事件。 */
const handleFocus = (event: FocusEvent) => {
  isFocused.value = true;
  emit('focus', event);
};

/** 清除聚焦状态并上报 blur 事件。 */
const handleBlur = (event: FocusEvent) => {
  isFocused.value = false;
  emit('blur', event);
};

/** 清空输入值、发出相关事件并重新聚焦。 */
const handleClear = () => {
  emit('update:modelValue', '');
  emit('change', '');
  emit('clear');
  focusInput();
};

/** 将焦点移动到内部 input 或 textarea。 */
const focusInput = () => {
  inputRef.value?.focus();
};
</script>
