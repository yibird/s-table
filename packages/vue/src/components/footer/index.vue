<template>
  <div :class="['s-table-footer', classes]" :style="styles">
    <slot />
  </div>
</template>

<script lang="ts" setup>
import type { CSSProperties } from 'vue';

withDefaults(
  defineProps<{
    styles?: CSSProperties;
    classes?: string;
  }>(),
  {}
);

defineSlots<{
  default?: () => unknown;
}>();
</script>
