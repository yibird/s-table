<template>
  <svg
    :class="['s-table-icon', className]"
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    fill="none"
    stroke="currentColor"
    stroke-width="2.25"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="10.6" cy="10.6" r="6.6" />
    <path d="m15.5 15.5 5 5" />
  </svg>
</template>

<script lang="ts" setup>
withDefaults(
  defineProps<{
    /** 图标尺寸（宽高相同），默认 '1em'。 */
    size?: number | string;
    /** 附加类名。 */
    className?: string;
  }>(),
  {
    size: '1em',
  }
);
</script>
