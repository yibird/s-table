<template>
  <td
    :class="['s-table-cell', fixedColumnStyle?.className, ctx?.summaryCellClasses?.value]"
    :colspan="colSpan"
    :style="[fixedColumnStyle?.bodyStyle, alignStyle, ctx?.summaryCellStyles?.value]"
  >
    <slot />
  </td>
</template>

<script lang="ts" setup>
import { computed, inject } from 'vue';
import { SummaryContextKey } from '../../context/summary';
import type { STableColumnAlign } from '../../types';

const props = withDefaults(
  defineProps<{
    /** 跨列数 */
    colSpan?: number;
    /** 对齐方式 */
    align?: STableColumnAlign;
    /**
     * 对应的列 ID，用于查找固定列样式。
     * 当不传时，按顺序匹配可见叶子列（由 index 决定）。
     */
    columnId?: string;
    /** 当前单元格在 summary row 中的列索引（从 0 开始）。不传 columnId 时使用。 */
    index?: number;
  }>(),
  {
    colSpan: 1,
    align: 'left',
  }
);

defineSlots<{ default?: () => unknown }>();

const ctx = inject(SummaryContextKey, undefined);

const fixedColumnStyle = computed(() => {
  if (!ctx) return undefined;
  const columnId = props.columnId ?? ctx.visibleLeafColumns.value[props.index ?? -1]?.id;
  return columnId ? ctx.fixedColumnStyles.value.get(columnId) : undefined;
});

const alignStyle = computed(() =>
  props.align !== 'left' ? { textAlign: props.align } : undefined
);
</script>
