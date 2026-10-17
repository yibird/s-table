<script setup lang="ts">
import { ref } from 'vue';
import STable from '../../../../packages/vue/src';
import type { STableColumn } from '../../../../packages/vue/src';

interface Row {
  id: number;
  name: string;
}

const columns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 80 },
  { id: 'name', accessorKey: 'name', header: 'Name' },
];

const createRows = (count: number): Row[] =>
  Array.from({ length: count }, (_, index) => ({ id: index + 1, name: `User ${index + 1}` }));

// 初始为挂载态；spec 通过点击按钮反复挂载/卸载以测量堆增长。
const mounted = ref(true);
const cycle = ref(0);
const toggle = () => {
  cycle.value += 1;
  mounted.value = !mounted.value;
};
</script>

<template>
  <main class="leak-fixture">
    <button type="button" data-testid="toggle-table" @click="toggle">Toggle table</button>
    <p data-testid="cycle-count">cycle:{{ cycle }}</p>
    <div v-if="mounted" data-testid="leak-table">
      <STable
        row-key="id"
        :columns="columns"
        :data-source="createRows(200)"
        :row-selection="{ type: 'checkbox' }"
        :virtual="true"
      />
    </div>
  </main>
</template>
