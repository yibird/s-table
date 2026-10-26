<template>
  <svg
    :class="['s-table-icon', 's-table-double-arrow-icon', className]"
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="direction === 'left'">
      <path d="M11 4 4 12l7 8" />
      <path d="M20 4l-7 8 7 8" />
    </template>
    <template v-else>
      <path d="M13 4l7 8-7 8" />
      <path d="M4 4l7 8-7 8" />
    </template>
  </svg>
</template>

<script lang="ts" setup>
withDefaults(
  defineProps<{
    /** 箭头方向。 */
    direction?: 'left' | 'right';
    /** 图标尺寸（宽高相同），默认 18。 */
    size?: number | string;
    /** 附加类名。 */
    className?: string;
  }>(),
  {
    direction: 'left',
    size: 18,
  }
);
</script>
