<template>
  <svg
    :class="['s-table-icon', className]"
    viewBox="0 0 16 16"
    :width="size"
    :height="size"
    fill="currentColor"
    style="display: block"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="5" cy="4" r="1.2" />
    <circle cx="11" cy="4" r="1.2" />
    <circle cx="5" cy="8" r="1.2" />
    <circle cx="11" cy="8" r="1.2" />
    <circle cx="5" cy="12" r="1.2" />
    <circle cx="11" cy="12" r="1.2" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 图标尺寸（宽高相同）。 */
    size?: number | string;
    /** 附加类名。 */
    className?: string;
  }>(),
  {
    size: 14,
  }
);
</script>
