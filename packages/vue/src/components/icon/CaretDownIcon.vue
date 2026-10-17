<template>
  <svg
    :class="['s-table-icon', className]"
    viewBox="0 0 1024 1024"
    :width="size"
    :height="size"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z"
    />
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
