<template>
  <div ref="triggerRef" class="s-table-search-trigger-wrapper">
    <button
      ref="triggerButtonRef"
      type="button"
      class="s-table-search-trigger"
      :class="{ 's-table-search-trigger-active': isActive }"
      :aria-label="`${locale.accessibility.searchColumn}: ${columnId}`"
      :aria-expanded="isOpen"
      :aria-controls="dropdownId"
      aria-haspopup="dialog"
      @click.stop="toggleDropdown"
    >
      <SearchIcon :size="16" />
    </button>

    <Teleport v-if="teleportTarget" :to="teleportTarget">
      <div
        v-if="isOpen"
        :id="dropdownId"
        ref="floatingRef"
        class="s-table-search-dropdown"
        :style="floatingStyles"
        role="dialog"
        :aria-label="`${locale.accessibility.searchColumn}: ${columnId}`"
        @click.stop
        @keydown.esc.stop.prevent="closeDropdown(true)"
      >
        <div class="s-table-search-dropdown-content">
          <input
            ref="inputRef"
            v-model="localValue"
            class="s-table-search-input"
            type="text"
            :placeholder="resolvedPlaceholder"
            @keydown.enter="handleConfirm"
          />
        </div>
        <div class="s-table-search-dropdown-footer">
          <button
            type="button"
            class="s-table-search-dropdown-btn s-table-search-dropdown-btn-reset"
            @click="handleReset"
          >
            {{ locale.search.reset }}
          </button>
          <button
            type="button"
            class="s-table-search-dropdown-btn s-table-search-dropdown-btn-confirm"
            @click="handleConfirm"
          >
            {{ locale.search.confirm }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, shallowRef, useId, useTemplateRef, watch } from 'vue';
import { useLocales } from '../../locales/useLocales';
import { SearchIcon } from '../icon';
import { useFloatingDropdown } from './useFloatingDropdown';

const locale = useLocales();

const props = withDefaults(
  defineProps<{
    /** 列 ID。 */
    columnId: string;
    /** 当前已确认的搜索关键词。 */
    searchValue?: string;
    /** 输入框占位文本。 */
    placeholder?: string;
    /** 确认搜索回调。 */
    onConfirm?: (value: string) => void;
    /** 重置搜索回调。 */
    onReset?: () => void;
  }>(),
  {
    searchValue: '',
    placeholder: '',
  }
);

const triggerRef = useTemplateRef<HTMLElement>('triggerRef');
const triggerButtonRef = useTemplateRef<HTMLButtonElement>('triggerButtonRef');
const floatingRef = useTemplateRef<HTMLElement>('floatingRef');
const teleportTarget = computed(() => triggerRef.value?.ownerDocument.body ?? null);
const inputRef = useTemplateRef<HTMLInputElement>('inputRef');
const dropdownId = `s-table-search-${useId()}`;
const { isOpen, floatingStyles } = useFloatingDropdown(triggerRef, floatingRef);

// 本地临时输入状态
const localValue = shallowRef(props.searchValue);

// 计算实际占位文本（优先 props，其次 locale）
const resolvedPlaceholder = computed(() => props.placeholder || locale.value.search.placeholder);

// 同步外部 searchValue 到本地
watch(
  () => props.searchValue,
  (v) => {
    localValue.value = v;
  }
);

// 是否有活跃搜索（已确认的关键词非空）
const isActive = computed(() => !!props.searchValue);

const closeDropdown = (restoreFocus = false) => {
  isOpen.value = false;
  if (restoreFocus) nextTick(() => triggerButtonRef.value?.focus());
};

/** 提交当前搜索词并关闭面板。 */
const handleConfirm = () => {
  props.onConfirm?.(localValue.value);
  isOpen.value = false;
};

/** 清空搜索词并通知外部重置。 */
const handleReset = () => {
  localValue.value = '';
  props.onReset?.();
  isOpen.value = false;
};

/** 切换搜索浮层，并在打开后聚焦输入框。 */
const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    localValue.value = props.searchValue;
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
};
</script>
