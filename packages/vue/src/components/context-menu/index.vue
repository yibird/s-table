<template>
  <Teleport v-if="teleportTarget" :to="teleportTarget">
    <div
      v-if="isOpen && row"
      ref="floatingRef"
      class="s-table-context-menu"
      :style="[floatingStyles, themeStyle]"
      role="menu"
      tabindex="-1"
      :aria-label="ariaLabel"
      @keydown="handleKeydown"
    >
      <Transition name="scale-down" appear>
        <div class="s-table-context-menu-inner">
          <slot :row="row" :row-index="rowIndex" :close="close" />
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script lang="ts" setup generic="TData extends RowData = RowData">
import { computed, nextTick, useTemplateRef, watch } from 'vue';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue';
import type { RowData } from '@tanstack/vue-table';
import type { STableThemeVariables } from '../../theme/useThemeVariables';
import { getOwnerDocument } from '../../utils/dom';
import type { STableContextMenuSlotContext } from '../../types';

const props = withDefaults(
  defineProps<{
    isOpen?: boolean;
    posX?: number;
    posY?: number;
    row?: TData | null;
    rowIndex?: number;
    close?: () => void;
    ariaLabel?: string;
    themeStyle?: STableThemeVariables;
    /** 触发节点（表格根节点），用于解析浮层容器。 */
    triggerNode?: HTMLElement | null;
    /** 浮层容器解析器；无效节点回退 body。 */
    getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement | null;
  }>(),
  {
    isOpen: false,
    posX: 0,
    posY: 0,
    row: null,
    rowIndex: -1,
    close: () => {},
    ariaLabel: 'Row actions',
    themeStyle: () => ({}),
    triggerNode: null,
    getPopupContainer: undefined,
  }
);

/** 默认插槽与表格公开的 `contextMenu` 共享同一套作用域类型。 */
defineSlots<{
  default?: (scope: STableContextMenuSlotContext<TData>) => unknown;
}>();

const teleportTarget = computed<HTMLElement | null>(() => {
  const trigger = props.triggerNode;
  if (!trigger) return null;
  const resolved = props.getPopupContainer?.(trigger);
  return resolved?.isConnected ? resolved : trigger.ownerDocument.body;
});

const floatingRef = useTemplateRef<HTMLElement>('floatingRef');

// 构造 virtual element，供 floating-ui 计算定位
const virtualElement = computed(() => ({
  getBoundingClientRect() {
    return {
      x: props.posX,
      y: props.posY,
      top: props.posY,
      left: props.posX,
      bottom: props.posY,
      right: props.posX,
      width: 0,
      height: 0,
    };
  },
}));

const { floatingStyles } = useFloating(virtualElement, floatingRef, {
  get open() {
    return props.isOpen;
  },
  placement: 'right-start',
  strategy: 'fixed',
  // 使用 top/left 定位，把 transform 留给 scale-down 入场过渡。
  transform: false,
  whileElementsMounted: autoUpdate,
  middleware: [offset(4), flip(), shift({ padding: 8 })],
});

const getMenuItems = () =>
  Array.from(
    floatingRef.value?.querySelectorAll<HTMLElement>(
      '[role^="menuitem"]:not([aria-disabled="true"]), button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
    ) ?? []
  ).filter((element) => element !== floatingRef.value);

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    props.close();
    return;
  }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  const items = getMenuItems();
  if (items.length === 0) return;
  event.preventDefault();
  const currentIndex = items.indexOf(
    getOwnerDocument(floatingRef.value)?.activeElement as HTMLElement
  );
  const nextIndex =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? items.length - 1
        : event.key === 'ArrowDown'
          ? (currentIndex + 1) % items.length
          : (currentIndex - 1 + items.length) % items.length;
  items[nextIndex]?.focus();
};

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return;
    nextTick(() => {
      // The menu may be closed again before Teleport finishes mounting. Avoid
      // restoring focus into a stale or hidden overlay in that case.
      if (!props.isOpen) return;
      (getMenuItems()[0] ?? floatingRef.value)?.focus();
    });
  }
);
</script>
