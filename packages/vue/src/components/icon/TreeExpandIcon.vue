<template>
  <svg
    :class="['s-table-icon', 's-table-tree-expand-icon', className]"
    viewBox="0 0 12 12"
    :width="size"
    :height="size"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-if="!expanded" class="s-table-tree-expand-icon-vertical" d="M6 1.5v9" />
    <path class="s-table-tree-expand-icon-horizontal" d="M1.5 6h9" />
  </svg>
</template>

<script lang="ts" setup>
withDefaults(
  defineProps<{
    /** 展开时只保留横线，收起时显示加号。 */
    expanded?: boolean;
    /** 图标尺寸（宽高相同），默认 12。 */
    size?: number | string;
    /** 附加类名。 */
    className?: string;
  }>(),
  {
    expanded: false,
    size: 12,
  }
);
</script>
