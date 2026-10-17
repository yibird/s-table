<template>
  <div class="s-table-loading">
    <div class="s-table-loading-indicator" role="status" :aria-label="locale.accessibility.loading">
      <slot v-if="hasSlot" />
      <div v-else class="s-table-loading-spin" aria-hidden="true">
        <span class="s-table-loading-grid">
          <span v-for="i in 4" :key="i" class="s-table-loading-grid-cell"></span>
        </span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, useSlots } from 'vue';
import { hasRenderableSlot } from '../../utils';
import { useLocales } from '../../locales/useLocales';

const locale = useLocales();
const slots = useSlots();
const hasSlot = computed(() => hasRenderableSlot(slots.default));
</script>
