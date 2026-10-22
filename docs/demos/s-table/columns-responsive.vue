<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 90 },
  { id: 'name', accessorKey: 'name', header: '姓名', width: 120 },
  { id: 'age', accessorKey: 'age', header: '年龄（md+）', width: 110, responsive: ['md'] },
  { id: 'department', accessorKey: 'department', header: '部门（sm+）', responsive: ['sm'] },
  { id: 'email', accessorKey: 'email', header: '邮箱（lg+）', responsive: ['lg'] },
  { id: 'address', accessorKey: 'address', header: '地址（xl+）', responsive: ['xl'] },
];

const dataSource = generateEmployees(6);
const width = shallowRef(0);
const syncWidth = () => (width.value = window.innerWidth);

onMounted(() => {
  syncWidth();
  window.addEventListener('resize', syncWidth);
});
onBeforeUnmount(() => window.removeEventListener('resize', syncWidth));
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; color: #666; font-size: 13px">
      当前视口宽度：{{ width }}px。缩放窗口可看到列按 `responsive` 配置显隐。
    </p>
    <STable :columns="columns" :data-source="dataSource" row-key="id" bordered />
  </div>
</template>
