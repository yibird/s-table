<script setup lang="ts">
import { shallowRef } from 'vue';
import STable, { type STableColumn } from '../../../../packages/vue/src';

interface PerfRow {
  id: number;
  name: string;
  group: string;
  value: number;
}

const rowCount = 100_000;
// shallowRef 避免为 10 万条测试数据创建深层响应式代理。
const rows = shallowRef<PerfRow[]>(
  Array.from({ length: rowCount }, (_, index) => ({
    id: index + 1,
    name: `Perf Row ${String(index + 1).padStart(6, '0')}`,
    group: `Group ${index % 20}`,
    value: index % 1000,
  }))
);

const columns: STableColumn<PerfRow>[] = [
  {
    id: 'id',
    accessorKey: 'id',
    header: 'ID',
    width: 90,
    fixed: 'left',
    sorter: (a, b) => a.id - b.id,
  },
  { id: 'name', accessorKey: 'name', header: 'Name', width: 200, search: true },
  { id: 'group', accessorKey: 'group', header: 'Group', width: 130 },
  ...Array.from({ length: 36 }, (_, index): STableColumn<PerfRow> => ({
    id: `metric-${index + 1}`,
    header: `Metric ${index + 1}`,
    width: 110,
    accessorFn: (record) => record.value + index,
  })),
  { id: 'tail', accessorKey: 'value', header: 'Tail', width: 110, fixed: 'right' },
];
</script>

<template>
  <section class="fixture-section" data-testid="perf-table">
    <h2>100k rows x 40 columns</h2>
    <STable
      row-key="id"
      style="height: 480px"
      :columns="columns"
      :data-source="rows"
      :virtual="{ y: true, x: true, rowHeight: 36, overscan: 6, columnOverscan: 2 }"
      :allow-unsafe-full-render="true"
    />
  </section>
</template>
