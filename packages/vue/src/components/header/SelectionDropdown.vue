<template>
  <div ref="containerRef" class="s-table-selection-dropdown">
    <button
      ref="triggerButtonRef"
      type="button"
      class="s-table-selection-dropdown-trigger"
      :class="{ 's-table-selection-dropdown-trigger-open': isOpen }"
      :aria-label="locale.accessibility.selectionDropdown"
      :aria-expanded="isOpen"
      aria-haspopup="menu"
      @click.stop="toggleMenu"
    >
      <ArrowDownIcon :size="10" />
    </button>
    <Teleport v-if="teleportTarget" :to="teleportTarget">
      <Transition name="scale-down" @after-leave="handleAfterLeave">
        <div
          v-if="isOpen"
          ref="floatingRef"
          class="s-table-selection-dropdown-menu"
          role="menu"
          :style="floatingStyles"
          :data-placement="placement"
          @keydown="handleMenuKeydown"
        >
          <template v-if="showDefaultActions">
            <button
              type="button"
              class="s-table-selection-dropdown-item"
              role="menuitem"
              @click="handleAction('selectAll')"
            >
              {{ locale.selection.selectAll }}
            </button>
            <button
              type="button"
              class="s-table-selection-dropdown-item"
              role="menuitem"
              @click="handleAction('clearAll')"
            >
              {{ locale.selection.clearAll }}
            </button>
            <div class="s-table-selection-dropdown-divider" />
            <button
              type="button"
              class="s-table-selection-dropdown-item"
              role="menuitem"
              @click="handleAction('selectOdd')"
            >
              {{ locale.selection.selectOddRows }}
            </button>
            <button
              type="button"
              class="s-table-selection-dropdown-item"
              role="menuitem"
              @click="handleAction('selectEven')"
            >
              {{ locale.selection.selectEvenRows }}
            </button>
            <button
              type="button"
              class="s-table-selection-dropdown-item"
              role="menuitem"
              @click="handleAction('selectCurrentPage')"
            >
              {{ locale.selection.selectCurrentPage }}
            </button>
          </template>
          <template v-if="customOptions.length > 0">
            <div v-if="showDefaultActions" class="s-table-selection-dropdown-divider" />
            <button
              v-for="option in customOptions"
              :key="option.key"
              type="button"
              class="s-table-selection-dropdown-item"
              role="menuitem"
              @click="handleCustomAction(option.key)"
            >
              <RenderVNode :value="option.text" />
            </button>
          </template>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { computed, useTemplateRef, type VNodeChild } from 'vue';
import { useLocales } from '../../locales/useLocales';
import { injectTablePresentationContext } from '../../context/table';
import { RenderVNode } from '../../ui/render-vnode';
import { ArrowDownIcon } from '../icon';
import { useFloatingDropdown } from './useFloatingDropdown';
import { useDropdownFocus } from './useDropdownFocus';
import { useMenuKeyboard } from './useMenuKeyboard';

const locale = useLocales();

const props = withDefaults(
  defineProps<{
    onSelectAll: () => void;
    onClearAll: () => void;
    onSelectOdd: () => void;
    onSelectEven: () => void;
    onSelectCurrentPage: () => void;
    customOptions?: Array<{ key: string; text: VNodeChild }>;
    /** 是否显示内置全选/清空/奇偶行/当前页动作。 */
    showDefaultActions?: boolean;
    onCustomSelect?: (key: string) => void;
  }>(),
  {
    showDefaultActions: true,
  }
);

const customOptions = computed(() => props.customOptions ?? []);

const containerRef = useTemplateRef<HTMLElement>('containerRef');
const triggerButtonRef = useTemplateRef<HTMLButtonElement>('triggerButtonRef');
const floatingRef = useTemplateRef<HTMLElement>('floatingRef');
const { getPopupContainer } = injectTablePresentationContext();
const { isOpen, floatingStyles, placement, teleportTarget } = useFloatingDropdown(
  containerRef,
  floatingRef,
  {
    getContainer: () => (containerRef.value ? getPopupContainer(containerRef.value) : null),
  }
);

type SelectionAction = 'selectAll' | 'clearAll' | 'selectOdd' | 'selectEven' | 'selectCurrentPage';

const getMenuItems = () =>
  Array.from(
    floatingRef.value?.querySelectorAll<HTMLElement>('.s-table-selection-dropdown-item') ?? []
  );

const { focusInitial, closeWithFocus, resetRestoreFocus, handleAfterLeave } = useDropdownFocus({
  triggerRef: triggerButtonRef,
  floatingRef,
  isOpen,
  getInitialFocus: (root) => root.querySelector<HTMLElement>('.s-table-selection-dropdown-item'),
});

/** 关闭菜单并把焦点还给触发器，避免焦点随 Teleport 节点卸载丢到 body。 */
const closeMenu = closeWithFocus;

/** 打开菜单后把焦点移入第一项，保证键盘用户可以直接操作。 */
const toggleMenu = () => {
  isOpen.value = !isOpen.value;
  if (!isOpen.value) return;
  resetRestoreFocus();
  focusInitial();
};

const { handleMenuKeydown } = useMenuKeyboard({
  floatingRef,
  close: closeMenu,
  getItems: () => getMenuItems(),
});

/** 执行选中项对应的批量选择操作并关闭菜单。 */
const handleAction = (action: SelectionAction) => {
  closeMenu();
  switch (action) {
    case 'selectAll':
      props.onSelectAll();
      break;
    case 'clearAll':
      props.onClearAll();
      break;
    case 'selectOdd':
      props.onSelectOdd();
      break;
    case 'selectEven':
      props.onSelectEven();
      break;
    case 'selectCurrentPage':
      props.onSelectCurrentPage();
      break;
  }
};

/** 执行用户配置的批量选择操作并关闭菜单。 */
const handleCustomAction = (key: string) => {
  closeMenu();
  props.onCustomSelect?.(key);
};
</script>
