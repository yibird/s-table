<template>
  <svg
    :class="['s-table-icon', className]"
    viewBox="64 64 896 896"
    :width="size"
    :height="size"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M349 838c0 17.7 14.2 32 31.8 32h262.4c17.6 0 31.8-14.3 31.8-32V642H349v196zm531.1-684H143.9c-24.5 0-39.8 26.7-27.5 48l221.3 376h348.8l221.3-376c12.1-21.3-3.2-48-27.7-48z"
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
