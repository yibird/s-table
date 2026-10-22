<script setup lang="ts">
import { shallowRef } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const message = shallowRef('双击行或单元格可触发 customRow / customCell 注入的事件');
const dataSource = generateEmployees(8);

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 90 },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'salary', accessorKey: 'salary', header: '月薪', align: 'right' },
  { id: 'department', accessorKey: 'department', header: '部门' },
];

const customHeaderCell = (column: STableColumn<Employee>) => ({
  title: `列 ${column.id}`,
  style: column.id === 'name' ? { color: '#1677ff' } : undefined,
  onDblclick: () => {
    message.value = `customHeaderCell 双击列：${column.id}`;
  },
});

const rowClassName = (record: Employee) => (record.salary >= 10000 ? 'demo-row-highlight' : '');

const rowStyle = (record: Employee) => ({
  color: record.salary >= 10000 ? '#0958d9' : undefined,
});

const customRow = (record: Employee) => ({
  'data-row-name': record.name,
  onDblclick: () => {
    message.value = `customRow 双击：${record.name}`;
  },
});

const customCell = (record: Employee, _index: number, column: STableColumn<Employee>) => ({
  style: column.id === 'salary' ? { fontWeight: record.salary >= 10000 ? 600 : 400 } : undefined,
  'data-level': column.id === 'salary' ? (record.salary >= 10000 ? 'high' : 'normal') : undefined,
  onDblclick: () => {
    message.value = `customCell 双击：${record.name} / ${column.id}`;
  },
});
</script>

<template>
  <div class="demo-shell">
    <p style="margin: 0 0 12px; color: #666; font-size: 13px">{{ message }}</p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      row-key="id"
      :row-class-name="rowClassName"
      :row-style="rowStyle"
      :custom-row="customRow"
      :custom-cell="customCell"
      :custom-header-cell="customHeaderCell"
    />
  </div>
</template>

<style scoped>
.demo-shell {
  padding: 16px;
  border: 1px dashed #d9d9d9;
  border-radius: 12px;
}

.demo-shell :deep(.demo-row-highlight) > td {
  background-color: #f0f7ff;
}
</style>
