<template>
  <Teleport v-if="teleportTarget" :to="teleportTarget">
    <Transition name="s-table-tooltip">
      <div
        v-if="open && content !== undefined"
        ref="floatingRef"
        class="s-table-tooltip"
        :style="floatingStyles"
        role="tooltip"
      >
        <RenderVNode :value="content" />
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useTemplateRef, type VNodeChild } from 'vue';
import { RenderVNode } from '../render-vnode';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue';
import { useThemeVariables } from '../../theme/useThemeVariables';

const props = withDefaults(
  defineProps<{
    open?: boolean;
    /** 触发元素；Tooltip 相对它定位。 */
    reference?: HTMLElement | null;
    content?: VNodeChild;
    placement?: 'top' | 'bottom' | 'left' | 'right';
    /** 浮层容器解析器。 */
    getContainer?: (trigger: HTMLElement) => HTMLElement | null;
  }>(),
  {
    open: false,
    reference: null,
    content: undefined,
    placement: 'top',
    getContainer: undefined,
  }
);

const floatingRef = useTemplateRef<HTMLElement>('floatingRef');
const referenceRef = computed(() => props.reference);
const openRef = computed(() => props.open && props.content !== undefined);
const teleportTarget = computed<HTMLElement | null>(() => {
  const reference = props.reference;
  if (!reference) return null;
  const container = props.getContainer?.(reference);
  return container?.isConnected ? container : reference.ownerDocument.body;
});

const { floatingStyles: positionStyles } = useFloating(referenceRef, floatingRef, {
  open: openRef,
  placement: computed(() => props.placement),
  strategy: 'fixed',
  whileElementsMounted: autoUpdate,
  middleware: [offset(6), flip(), shift({ padding: 8 })],
});
const { themeVariables } = useThemeVariables(referenceRef, openRef);

const floatingStyles = computed(() => ({
  ...positionStyles.value,
  ...themeVariables.value,
}));
</script>

<style lang="less">
.s-table-tooltip {
  z-index: var(--s-z-index-dropdown, 30);
  max-width: 320px;
  padding: 4px 8px;
  border-radius: var(--s-radius-md, 6px);
  background-color: color-mix(in srgb, var(--s-color-text, #000) 88%, transparent);
  color: var(--s-color-bg-cell, #fff);
  font-size: 12px;
  line-height: 20px;
  pointer-events: none;
  box-sizing: border-box;

  &-enter-active,
  &-leave-active {
    transition:
      opacity var(--s-duration-fast, 0.1s) var(--s-ease-out),
      transform var(--s-duration-fast, 0.1s) var(--s-ease-out);
  }

  &-enter-from,
  &-leave-to {
    opacity: 0;
    transform: scale(0.96);
  }
}
</style>
