<template>
  <span class="s-table-header-menu">
    <button
      ref="triggerRef"
      type="button"
      class="s-table-header-menu-trigger"
      :class="{ 's-table-header-menu-trigger-open': isOpen }"
      :aria-expanded="isOpen"
      :aria-label="locale.accessibility.columnMenu"
      aria-haspopup="menu"
      @click.stop="toggleMenu"
    >
      <RenderVNode v-if="icon !== undefined" :value="icon" />
      <MoreIcon v-else :size="14" />
    </button>
    <Teleport v-if="teleportTarget" :to="teleportTarget">
      <Transition name="scale-down" @after-leave="handleAfterLeave">
        <div
          v-if="isOpen"
          ref="floatingRef"
          class="s-table-header-menu-popup"
          role="menu"
          :style="floatingStyles"
          :data-placement="placement"
          @click.stop
          @keydown="handleMenuKeydown"
        >
          <RenderVNode :value="content" />
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<script lang="ts" setup generic="TData extends RowData = RowData">
import { computed, useTemplateRef, type VNodeChild } from 'vue';
import type { RowData } from '@tanstack/vue-table';
import type { STableColumn, STableHeaderMenuContext } from '../../types';
import { injectTablePresentationContext } from '../../context/table';
import { useLocales } from '../../locales/useLocales';
import { RenderVNode } from '../../ui/render-vnode';
import { MoreIcon } from '../icon';
import { useFloatingDropdown } from './useFloatingDropdown';
import { useDropdownFocus } from './useDropdownFocus';
import { useMenuKeyboard } from './useMenuKeyboard';

const props = defineProps<{
  column: STableColumn<TData>;
  columnId: string;
  popup: VNodeChild | ((context: STableHeaderMenuContext<TData>) => VNodeChild);
  icon?: VNodeChild;
}>();

const locale = useLocales();
const triggerRef = useTemplateRef<HTMLElement>('triggerRef');
const floatingRef = useTemplateRef<HTMLElement>('floatingRef');
const { getPopupContainer } = injectTablePresentationContext();
const { isOpen, floatingStyles, placement, teleportTarget } = useFloatingDropdown(
  triggerRef,
  floatingRef,
  {
    getContainer: () => (triggerRef.value ? getPopupContainer(triggerRef.value) : null),
  }
);

const getMenuItems = (root: HTMLElement | null = floatingRef.value) =>
  Array.from(
    root?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) ?? []
  );

const { focusInitial, closeWithFocus, resetRestoreFocus, handleAfterLeave } = useDropdownFocus({
  triggerRef,
  floatingRef,
  isOpen,
  getInitialFocus: (root) => getMenuItems(root)[0] ?? null,
});

/** 关闭菜单并把焦点还给触发器。 */
const close = closeWithFocus;

/** 打开后聚焦首个菜单项，保证 Teleport 到 body 的菜单可用键盘操作。 */
const toggleMenu = () => {
  isOpen.value = !isOpen.value;
  if (!isOpen.value) return;
  resetRestoreFocus();
  focusInitial();
};

const { handleMenuKeydown } = useMenuKeyboard({
  floatingRef,
  close,
  getItems: getMenuItems,
});

const content = computed<VNodeChild>(() =>
  typeof props.popup === 'function'
    ? props.popup({ column: props.column, columnId: props.columnId, close })
    : props.popup
);
</script>
