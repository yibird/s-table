<script lang="ts" setup>
import { useSlots } from 'vue';
import { hasRenderableSlot } from '../../utils';
import { useLocales } from '../../locales/useLocales';

const locale = useLocales();
const slots = useSlots();
</script>

<template>
  <div class="s-table-loading">
    <div class="s-table-loading-indicator" role="status" :aria-label="locale.accessibility.loading">
      <slot v-if="hasRenderableSlot(slots.default)" />
      <div v-else class="s-table-loading-spin" aria-hidden="true">
        <span v-for="i in 4" :key="i" class="s-table-loading-dot"></span>
      </div>
    </div>
  </div>
</template>
