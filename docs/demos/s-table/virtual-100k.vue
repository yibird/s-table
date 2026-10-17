<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  { id: 'name', accessorKey: 'name', header: '姓名', width: 140 },
  { id: 'department', accessorKey: 'department', header: '部门', width: 140 },
  { id: 'city', accessorKey: 'city', header: '城市', width: 120 },
  { id: 'email', accessorKey: 'email', header: '邮箱' },
];

const rowCountOptions = [10_000, 50_000, 100_000] as const;
const rowCount = ref<number>(10_000);
// 大数据只在切换规模时替换数组引用，避免递归创建深层响应式代理。
const dataSource = shallowRef(generateEmployees(rowCount.value));
const virtual = { y: true, x: false, rowHeight: 47, overscan: 24 };

const changeRowCount = (count: number) => {
  if (count === rowCount.value) return;
  rowCount.value = count;
  dataSource.value = generateEmployees(count);
};
</script>

<template>
  <div class="pressure-toolbar" role="group" aria-label="虚拟表格数据量">
    <button
      v-for="count in rowCountOptions"
      :key="count"
      type="button"
      class="pressure-option"
      :class="{ active: rowCount === count }"
      :aria-pressed="rowCount === count"
      @click="changeRowCount(count)"
    >
      {{ count.toLocaleString('zh-CN') }} 行
    </button>
  </div>
  <STable
    :columns="columns"
    :data-source="dataSource"
    :virtual="virtual"
    row-key="id"
    style="height: 420px"
  />
</template>

<style scoped>
.pressure-toolbar {
  display: inline-flex;
  margin-bottom: 12px;
  overflow: hidden;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
}

.pressure-option {
  min-height: 32px;
  padding: 4px 12px;
  color: rgba(0, 0, 0, 0.65);
  font: inherit;
  border: 0;
  border-right: 1px solid #d9d9d9;
  background: #fff;
  cursor: pointer;
}

.pressure-option:last-child {
  border-right: 0;
}

.pressure-option.active {
  color: #fff;
  background: #1677ff;
}
</style>
