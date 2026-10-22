<template>
  <tfoot
    :class="['s-table-summary', ctx.classes?.summary, stickyClass]"
    :style="ctx.styles?.summary"
  >
    <slot />
  </tfoot>
</template>

<script lang="ts" setup>
import { computed, provide, proxyRefs, toRef, toRefs } from 'vue';
import { SummaryContextKey } from '../../context/summary';
import { injectTablePresentationContext } from '../../context/table';

const props = withDefaults(
  defineProps<{
    visibleLeafColumns?: Array<{ id: string }>;
    /** 是否固定在滚动容器底部。 */
    sticky?: boolean;
  }>(),
  {
    visibleLeafColumns: () => [],
    sticky: false,
  }
);

defineSlots<{ default?: () => unknown }>();

const stickyClass = computed(() => (props.sticky ? 's-table-summary-fixed' : undefined));

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
