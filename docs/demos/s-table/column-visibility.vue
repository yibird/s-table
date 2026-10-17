<script setup lang="ts">
import { computed, ref } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

type OptionalColumnId = 'department' | 'salary' | 'email';

const columnOptions: Array<{ id: OptionalColumnId; label: string }> = [
  { id: 'department', label: '部门' },
  { id: 'salary', label: '月薪' },
  { id: 'email', label: '邮箱' },
];

const visibleColumnIds = ref<OptionalColumnId[]>(['department', 'salary']);
const dataSource = generateEmployees(6);

const baseColumns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 80 },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'department', accessorKey: 'department', header: '部门' },
  {
    id: 'salary',
    accessorKey: 'salary',
    header: '月薪',
    align: 'right',
    cell: ({ row }) => `¥${row.original.salary.toLocaleString('zh-CN')}`,
  },
  { id: 'email', accessorKey: 'email', header: '邮箱' },
];

const columns = computed<STableColumn<Employee>[]>(() =>
  baseColumns.map((column) => {
    const id = column.id as OptionalColumnId | 'id' | 'name';
    if (id === 'id' || id === 'name') return column;
    return { ...column, hidden: !visibleColumnIds.value.includes(id) };
  })
);
</script>

<template>
  <div class="visibility-demo">
    <div class="visibility-demo-toolbar" aria-label="选择显示列">
      <span class="visibility-demo-label">显示列</span>
      <label v-for="option in columnOptions" :key="option.id" class="visibility-demo-option">
        <input v-model="visibleColumnIds" type="checkbox" :value="option.id" />
        <span>{{ option.label }}</span>
      </label>
    </div>
    <STable row-key="id" bordered :columns="columns" :data-source="dataSource" />
  </div>
</template>

<style scoped>
.visibility-demo {
  padding: 16px;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
}

.visibility-demo-toolbar {
  display: flex;
  min-height: 32px;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.visibility-demo-label {
  color: var(--vp-c-text-2, rgba(0, 0, 0, 0.65));
  font-size: 13px;
  font-weight: 600;
}

.visibility-demo-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--vp-c-text-1, rgba(0, 0, 0, 0.88));
  cursor: pointer;
  font-size: 13px;
}
</style>
