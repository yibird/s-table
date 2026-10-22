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
      <Transition name="scale-down" @after-leave="handleAfterLeave">
        <div
          v-if="isOpen"
          :id="dropdownId"
          ref="floatingRef"
          class="s-table-search-dropdown"
          :style="floatingStyles"
          :data-placement="placement"
          role="dialog"
          :aria-label="`${locale.accessibility.searchColumn}: ${columnId}`"
          @click.stop
          @keydown.esc.stop.prevent="closeDropdown(true)"
        >
          <div class="s-table-search-dropdown-content">
            <input
              v-model="localValue"
              class="s-table-search-input"
              type="text"
              :placeholder="resolvedPlaceholder"
              @keydown.enter="handleConfirm"
            />
          </div>
          <div class="s-table-search-dropdown-footer">
            <Button
              size="small"
              class="s-table-search-dropdown-btn s-table-search-dropdown-btn-reset"
              @click="handleReset"
            >
              {{ locale.search.reset }}
            </Button>
            <Button
              size="small"
              type="primary"
              class="s-table-search-dropdown-btn s-table-search-dropdown-btn-confirm"
              @click="handleConfirm"
            >
              {{ locale.search.confirm }}
            </Button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { computed, shallowRef, useId, useTemplateRef, watch } from 'vue';
import { useLocales } from '../../locales/useLocales';
import { injectTablePresentationContext } from '../../context/table';
import { Button } from '../../ui/button';
import { SearchIcon } from '../icon';
import { useFloatingDropdown } from './useFloatingDropdown';
import { useDropdownFocus } from './useDropdownFocus';

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
const dropdownId = `s-table-search-${useId()}`;
const { getPopupContainer } = injectTablePresentationContext();
const { isOpen, floatingStyles, placement, teleportTarget } = useFloatingDropdown(
  triggerRef,
  floatingRef,
  {
    getContainer: () => (triggerRef.value ? getPopupContainer(triggerRef.value) : null),
  }
);

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

const { focusInitial, closeWithFocus, closeWithoutFocus, resetRestoreFocus, handleAfterLeave } =
  useDropdownFocus({
    triggerRef: triggerButtonRef,
    floatingRef,
    isOpen,
    getInitialFocus: (root) => root.querySelector<HTMLElement>('input'),
  });

const closeDropdown = (restoreFocus = false) => {
  if (restoreFocus) closeWithFocus();
  else closeWithoutFocus();
};

/** 提交当前搜索词并关闭面板，焦点回到触发器。 */
const handleConfirm = () => {
  props.onConfirm?.(localValue.value);
  closeDropdown(true);
};

/** 清空搜索词并通知外部重置，焦点回到触发器。 */
const handleReset = () => {
  localValue.value = '';
  props.onReset?.();
  closeDropdown(true);
};

/** 切换搜索浮层，并在打开后聚焦输入框。 */
const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    resetRestoreFocus();
    localValue.value = props.searchValue;
    focusInitial();
  }
};
</script>
