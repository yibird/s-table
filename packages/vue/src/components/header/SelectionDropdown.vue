<template>
  <div ref="containerRef" class="s-table-selection-dropdown">
    <button
      type="button"
      class="s-table-selection-dropdown-trigger"
      :class="{ 's-table-selection-dropdown-trigger-open': isOpen }"
      :aria-label="locale.accessibility.selectionDropdown"
      :aria-expanded="isOpen"
      aria-haspopup="menu"
      @click.stop="isOpen = !isOpen"
    >
      <ArrowDownIcon :size="10" />
    </button>
    <Teleport v-if="teleportTarget" :to="teleportTarget">
      <div
        v-if="isOpen"
        ref="floatingRef"
        class="s-table-selection-dropdown-menu"
        role="menu"
        :style="floatingStyles"
        :data-placement="placement"
      >
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
        <template v-if="customOptions.length > 0">
          <div class="s-table-selection-dropdown-divider" />
          <button
            v-for="option in customOptions"
            :key="option.key"
            type="button"
            class="s-table-selection-dropdown-item"
            role="menuitem"
            @click="handleCustomAction(option.key)"
          >
            <VNodeRenderer :value="option.text" />
          </button>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineComponent, useTemplateRef, type PropType, type VNodeChild } from 'vue';
import { useLocales } from '../../locales/useLocales';
import { ArrowDownIcon } from '../icon';
import { useFloatingDropdown } from './useFloatingDropdown';

const locale = useLocales();

const VNodeRenderer = defineComponent({
  props: {
    value: { type: null as unknown as PropType<VNodeChild>, required: true },
  },
  setup: (props) => () => props.value,
});

const props = defineProps<{
  onSelectAll: () => void;
  onClearAll: () => void;
  onSelectOdd: () => void;
  onSelectEven: () => void;
  onSelectCurrentPage: () => void;
  customOptions?: Array<{ key: string; text: VNodeChild }>;
  onCustomSelect?: (key: string) => void;
}>();

const customOptions = computed(() => props.customOptions ?? []);

const containerRef = useTemplateRef<HTMLElement>('containerRef');
const floatingRef = useTemplateRef<HTMLElement>('floatingRef');
const teleportTarget = computed(() => containerRef.value?.ownerDocument.body ?? null);
const { isOpen, floatingStyles, placement } = useFloatingDropdown(containerRef, floatingRef);

type SelectionAction = 'selectAll' | 'clearAll' | 'selectOdd' | 'selectEven' | 'selectCurrentPage';

/** 执行选中项对应的批量选择操作并关闭菜单。 */
const handleAction = (action: SelectionAction) => {
  isOpen.value = false;
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
  isOpen.value = false;
  props.onCustomSelect?.(key);
};
</script>
