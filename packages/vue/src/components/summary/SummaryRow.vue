<template>
  <tr class="s-table-summary-row">
    <slot />
  </tr>
</template>

<script lang="ts" setup>
defineSlots<{ default?: () => unknown }>();
</script>
