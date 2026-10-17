<script setup lang="ts">
import { computed } from 'vue';
import CoreFixture from './fixtures/CoreFixture.vue';
import InteractionFixture from './fixtures/InteractionFixture.vue';
import VirtualFixture from './fixtures/VirtualFixture.vue';
import AdvancedFixture from './fixtures/AdvancedFixture.vue';
import LeakFixture from './fixtures/LeakFixture.vue';

const fixture = computed(
  () => new URLSearchParams(window.location.search).get('fixture') ?? 'core'
);
</script>

<template>
  <main class="e2e-app">
    <CoreFixture v-if="fixture === 'core'" />
    <InteractionFixture v-else-if="fixture === 'interaction'" />
    <VirtualFixture v-else-if="fixture === 'virtual'" />
    <AdvancedFixture v-else-if="fixture === 'advanced'" />
    <LeakFixture v-else-if="fixture === 'leak'" />
    <p v-else data-testid="unknown-fixture">Unknown fixture: {{ fixture }}</p>
  </main>
</template>
