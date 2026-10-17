<template>
  <div
    ref="selectRef"
    :class="[
      's-select',
      `s-select-${size}`,
      {
        's-select-disabled': disabled,
        's-select-open': isOpen,
        's-select-multiple': isMultiple,
      },
    ]"
  >
    <div
      ref="triggerRef"
      :id="triggerId"
      class="s-select-selector"
      role="combobox"
      aria-haspopup="listbox"
      :aria-label="ariaLabel || placeholder"
      :aria-controls="listboxId"
      :aria-expanded="isOpen"
      :aria-activedescendant="activeOptionId"
      :tabindex="disabled ? -1 : 0"
      @click="toggleDropdown"
      @keydown="handleTriggerKeydown"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <span v-if="showClear" class="s-select-clear" aria-hidden="true" @click.stop="handleClear">
        <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor">
          <path
            d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm165.4 618.2l-66-.3L512 563.4l-99.3 118.4-66.1.3c-4.4 0-8-3.5-8-8 0-1.9.7-3.7 1.9-5.2l130.1-155L340.5 359a8.32 8.32 0 01-1.9-5.2c0-4.4 3.6-8 8-8l66.1.3L512 464.6l99.3-118.4 66-.3c4.4 0 8 3.5 8 8 0 1.9-.7 3.7-1.9 5.2L553.5 514l130 155c1.2 1.5 1.9 3.3 1.9 5.2 0 4.4-3.6 8-8 8z"
          />
        </svg>
      </span>
      <span class="s-select-arrow">
        <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor">
          <path
            d="M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z"
          />
        </svg>
      </span>

      <template v-if="isMultiple">
        <div class="s-select-selection-overflow">
          <span
            v-for="val in selectedValues"
            :key="getValueKey(val)"
            class="s-select-selection-tag"
          >
            {{ getLabelByValue(val) }}
            <span class="s-select-tag-close" aria-hidden="true" @click.stop="removeValue(val)">
              <svg viewBox="64 64 896 896" width="10" height="10" fill="currentColor">
                <path
                  d="M563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L512 449.8 295.9 191.7c-3-3.6-7.5-5.7-12.3-5.7H203.8c-6.8 0-10.5 7.9-6.1 13.1L460.2 512 197.7 824.9A7.95 7.95 0 00203.8 838h79.8c4.7 0 9.2-2.1 12.3-5.7L512 574.1l216.1 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z"
                />
              </svg>
            </span>
          </span>
          <span v-if="selectedValues.length === 0" class="s-select-placeholder">
            {{ placeholder }}
          </span>
        </div>
      </template>

      <template v-else>
        <span v-if="singleSelectedLabel" class="s-select-selection-item">
          {{ singleSelectedLabel }}
        </span>
        <span v-else class="s-select-placeholder">
          {{ placeholder }}
        </span>
      </template>
    </div>

    <Teleport v-if="teleportTarget" :to="teleportTarget">
      <div
        v-if="isOpen"
        :id="listboxId"
        ref="dropdownRef"
        class="s-select-dropdown"
        :style="floatingStyles"
        role="listbox"
        :aria-multiselectable="isMultiple || undefined"
      >
        <div
          v-for="(option, index) in options"
          :id="getOptionId(index)"
          :key="getValueKey(option.value)"
          class="s-select-item-option"
          :class="{
            's-select-item-option-selected': isOptionSelected(option.value),
            's-select-item-option-disabled': option.disabled,
            's-select-item-option-active': activeIndex === index,
          }"
          role="option"
          :aria-selected="isOptionSelected(option.value)"
          :aria-disabled="option.disabled || undefined"
          @click="selectOption(option)"
          @mousemove="activeIndex = option.disabled ? activeIndex : index"
        >
          <span class="s-select-item-option-content">{{ option.label }}</span>
          <span v-if="isOptionSelected(option.value)" class="s-select-item-option-check">
            <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor">
              <path
                d="M912 190h-69.9c-9.8 0-19.1 4.5-25.1 12.2L404.7 724.5 207 474a32 32 0 00-25.1-12.2H112c-6.7 0-10.4 7.7-6.3 12.9l273.9 347c12.8 16.2 37.4 16.2 50.3 0l488.4-618.9c4.1-5.1.4-12.8-6.3-12.8z"
              />
            </svg>
          </span>
        </div>
        <div v-if="!options || options.length === 0" class="s-select-empty">{{ emptyText }}</div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, useId, watch } from 'vue';
import {
  useFloating,
  offset,
  flip,
  shift,
  size as floatingSize,
  autoUpdate,
} from '@floating-ui/vue';
import { useComponentSize } from '../useComponentSize';
import { showWave } from '../wave';
import { useThemeVariables } from '../../theme/useThemeVariables';
import { getOwnerDocument } from '../../utils/dom';
import type { SelectOption, SelectProps, SelectValue } from './types';
import './styles.less';

const props = withDefaults(defineProps<SelectProps>(), {
  modelValue: undefined,
  options: () => [],
  disabled: false,
  allowClear: false,
  mode: 'single',
  placeholder: 'Please select',
  emptyText: 'No data',
});

const emit = defineEmits<{
  'update:modelValue': [value: SelectValue];
  change: [value: SelectValue];
}>();

const selectRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const isHovered = ref(false);
const activeIndex = ref(-1);
const id = useId();
const triggerId = `s-select-trigger-${id}`;
const listboxId = `s-select-listbox-${id}`;
const teleportTarget = computed(() => triggerRef.value?.ownerDocument.body ?? null);

const size = useComponentSize(() => props.size);

// ── floating-ui 定位 ──
const { floatingStyles: positionStyles } = useFloating(triggerRef, dropdownRef, {
  open: isOpen,
  placement: 'bottom-start',
  strategy: 'fixed',
  whileElementsMounted: autoUpdate,
  middleware: [
    offset(4),
    flip(),
    shift({ padding: 8 }),
    floatingSize({
      apply({ rects, availableHeight, elements }) {
        Object.assign(elements.floating.style, {
          minWidth: `${rects.reference.width}px`,
          maxWidth: `${Math.max(rects.reference.width, 200)}px`,
          maxHeight: `${Math.min(availableHeight, 256)}px`,
        });
      },
    }),
  ],
});
const { themeVariables } = useThemeVariables(triggerRef, isOpen);
const floatingStyles = computed(() => ({
  ...positionStyles.value,
  ...themeVariables.value,
}));

// ── 选择状态 ──
const isMultiple = computed(() => props.mode === 'multiple');

const selectedValues = computed<(string | number)[]>(() => {
  if (isMultiple.value) {
    return Array.isArray(props.modelValue) ? props.modelValue : [];
  }
  return props.modelValue !== undefined && props.modelValue !== null
    ? [props.modelValue as string | number]
    : [];
});

// 选项和选中值都预编译为 Map / Set，避免多选标签与长选项列表渲染时反复线性扫描。
const optionLabelMap = computed(
  () => new Map(props.options.map((option) => [option.value, option.label]))
);
const selectedValueSet = computed(() => new Set(selectedValues.value));
const activeOptionId = computed(() =>
  isOpen.value && activeIndex.value >= 0 ? getOptionId(activeIndex.value) : undefined
);

const singleSelectedLabel = computed(() => {
  if (isMultiple.value) return '';
  const val = props.modelValue;
  if (val === undefined || val === null || Array.isArray(val)) return '';
  return getLabelByValue(val);
});

const showClear = computed(
  () => props.allowClear && !props.disabled && isHovered.value && selectedValues.value.length > 0
);

/** 按选项值解析显示文本，缺失选项时回退为值本身。 */
const getLabelByValue = (val: string | number): string => {
  return optionLabelMap.value.get(val) ?? String(val);
};

/** 判断指定选项值是否处于选中集合中。 */
const isOptionSelected = (val: string | number): boolean => selectedValueSet.value.has(val);

/** Vue key 同时编码值类型，避免数字 1 与字符串 "1" 复用同一选项节点。 */
const getValueKey = (val: string | number): string => `${typeof val}:${String(val)}`;
const getOptionId = (index: number): string => `${listboxId}-option-${index}`;

const findEnabledIndex = (start: number, direction: 1 | -1): number => {
  const length = props.options.length;
  for (let offset = 0; offset < length; offset++) {
    const index = (start + offset * direction + length) % length;
    if (!props.options[index]?.disabled) return index;
  }
  return -1;
};

const setInitialActiveOption = (position: 'first' | 'last' = 'first') => {
  const selectedIndex = props.options.findIndex(
    (option) => !option.disabled && selectedValueSet.value.has(option.value)
  );
  activeIndex.value =
    selectedIndex >= 0
      ? selectedIndex
      : findEnabledIndex(
          position === 'first' ? 0 : props.options.length - 1,
          position === 'first' ? 1 : -1
        );
};

const moveActiveOption = (direction: 1 | -1) => {
  if (!isOpen.value) {
    openDropdown(direction === 1 ? 'first' : 'last');
    return;
  }
  const start =
    activeIndex.value < 0
      ? direction === 1
        ? 0
        : props.options.length - 1
      : activeIndex.value + direction;
  activeIndex.value = findEnabledIndex(start, direction);
};

// ── 操作 ──
/** 按单选或多选模式提交选项变更。 */
const selectOption = (option: SelectOption) => {
  if (option.disabled) return;

  if (isMultiple.value) {
    const current = selectedValues.value;
    const next = selectedValueSet.value.has(option.value)
      ? current.filter((v) => v !== option.value)
      : [...current, option.value];
    emit('update:modelValue', next);
    emit('change', next);
  } else {
    emit('update:modelValue', option.value);
    emit('change', option.value);
    closeDropdown(true);
  }
};

/** 从多选集合中移除指定值。 */
const removeValue = (val: string | number) => {
  if (props.disabled) return;
  const next = selectedValues.value.filter((v) => v !== val);
  emit('update:modelValue', next);
  emit('change', next);
};

/** 清空当前单选或多选值。 */
const handleClear = () => {
  const empty: SelectValue = isMultiple.value ? [] : '';
  emit('update:modelValue', empty);
  emit('change', empty);
};

/** 根据当前状态打开或关闭下拉面板；打开时播放 antd 风格波纹。 */
const toggleDropdown = (event?: Event) => {
  if (props.disabled) return;
  if (isOpen.value) {
    closeDropdown();
  } else {
    openDropdown();
    if (event && triggerRef.value) showWave(triggerRef.value);
  }
};

/** 打开下拉面板。 */
const openDropdown = (position: 'first' | 'last' = 'first') => {
  isOpen.value = true;
  setInitialActiveOption(position);
};

/** 关闭下拉面板。 */
const closeDropdown = (restoreFocus = false) => {
  isOpen.value = false;
  activeIndex.value = -1;
  if (restoreFocus) nextTick(() => triggerRef.value?.focus());
};

const handleTriggerKeydown = (event: KeyboardEvent) => {
  if (props.disabled) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    moveActiveOption(event.key === 'ArrowDown' ? 1 : -1);
    return;
  }
  if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault();
    if (!isOpen.value) openDropdown(event.key === 'Home' ? 'first' : 'last');
    else
      activeIndex.value = findEnabledIndex(
        event.key === 'Home' ? 0 : props.options.length - 1,
        event.key === 'Home' ? 1 : -1
      );
    return;
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (!isOpen.value) openDropdown();
    else {
      const option = props.options[activeIndex.value];
      if (option) selectOption(option);
    }
    return;
  }
  if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault();
    closeDropdown(true);
    return;
  }
  if (event.key === 'Tab') {
    closeDropdown();
    return;
  }
  if (event.key === 'Delete' && props.allowClear && selectedValues.value.length > 0) {
    event.preventDefault();
    handleClear();
    return;
  }
  if (event.key === 'Backspace' && isMultiple.value && selectedValues.value.length > 0) {
    event.preventDefault();
    removeValue(selectedValues.value[selectedValues.value.length - 1]!);
  }
};

// ── 点击外部关闭 ──
// 仅在下拉打开时注册 document click 监听：避免每个 Select 实例（大表格里可能几十个列筛选）
// 从挂载起就常驻全局监听器。
/** 点击选择器外部时关闭下拉面板。 */
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node | null;
  if (target && (selectRef.value?.contains(target) || dropdownRef.value?.contains(target))) return;
  closeDropdown();
};

let listenerDocument: Document | undefined;

const removeOutsideListener = () => {
  listenerDocument?.removeEventListener('click', handleClickOutside, true);
  listenerDocument = undefined;
};

watch([isOpen, triggerRef], ([open, trigger]) => {
  const ownerDocument = open ? getOwnerDocument(trigger) : undefined;
  if (ownerDocument === listenerDocument) return;
  removeOutsideListener();
  if (!ownerDocument) return;
  listenerDocument = ownerDocument;
  listenerDocument.addEventListener('click', handleClickOutside, true);
});

onUnmounted(removeOutsideListener);
</script>
