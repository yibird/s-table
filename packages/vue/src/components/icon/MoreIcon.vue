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
      d="M300 462c-27.6 0-50 22.4-50 50s22.4 50 50 50 50-22.4 50-50-22.4-50-50-50zm212 0c-27.6 0-50 22.4-50 50s22.4 50 50 50 50-22.4 50-50-22.4-50-50-50zm212 0c-27.6 0-50 22.4-50 50s22.4 50 50 50 50-22.4 50-50-22.4-50-50-50z"
    />
  </svg>
</template>

<script lang="ts" setup>
withDefaults(
  defineProps<{
    size?: number | string;
    className?: string;
  }>(),
  {
    size: '1em',
  }
);
</script>
