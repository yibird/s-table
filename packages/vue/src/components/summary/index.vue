<template>
  <tfoot :class="['s-table-summary', ctx.classes?.summary]" :style="ctx.styles?.summary">
    <slot />
  </tfoot>
</template>

<script lang="ts" setup>
import { provide, proxyRefs, toRef, toRefs } from 'vue';
import { SummaryContextKey } from '../../context/summary';
import { injectTablePresentationContext } from '../../context/table';

const props = withDefaults(
  defineProps<{
    visibleLeafColumns?: Array<{ id: string }>;
  }>(),
  {
    visibleLeafColumns: () => [],
  }
);

defineSlots<{ default?: () => unknown }>();

const presentationContext = injectTablePresentationContext();
const ctx = proxyRefs(presentationContext);
const { visibleLeafColumns } = toRefs(props);

provide(SummaryContextKey, {
  fixedColumnStyles: presentationContext.fixedColumnStyles,
  visibleLeafColumns,
  summaryCellStyles: toRef(() => ctx.styles?.summaryCell),
  summaryCellClasses: toRef(() => ctx.classes?.summaryCell),
});
</script>
