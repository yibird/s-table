<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue';
import STable, { type STableColumn, type STableInstance } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const tableRef = useTemplateRef<STableInstance<Employee>>('table');
const actionMessage = shallowRef('可先操作表头，再使用按钮清理状态');
const dataSource = generateEmployees(12);

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 76 },
  { id: 'name', accessorKey: 'name', header: '姓名', search: true },
  {
    id: 'department',
    accessorKey: 'department',
    header: '部门',
    filters: [
      { text: '技术部', value: '技术部' },
      { text: '产品部', value: '产品部' },
      { text: '设计部', value: '设计部' },
      { text: '市场部', value: '市场部' },
    ],
    onFilter: (value, record) => record.department === value,
  },
  {
    id: 'salary',
    accessorKey: 'salary',
    header: '月薪',
    align: 'right',
    sorter: (a, b) => a.salary - b.salary,
    defaultSortOrder: 'descend',
    cell: ({ row }) => `¥${row.original.salary.toLocaleString('zh-CN')}`,
  },
];

const clearSort = () => {
  tableRef.value?.clearSort();
  actionMessage.value = '已清除排序';
};

const clearFilter = () => {
  tableRef.value?.clearFilter();
  actionMessage.value = '已清除过滤';
};

const clearSearch = () => {
  tableRef.value?.clearSearch();
  actionMessage.value = '已清除搜索';
};

const clearAll = () => {
  tableRef.value?.clearSort();
  tableRef.value?.clearFilter();
  tableRef.value?.clearSearch();
  actionMessage.value = '已恢复全部数据状态';
};
</script>

<template>
  <div class="instance-actions-demo">
    <div class="instance-actions-toolbar">
      <button type="button" @click="clearSort">清除排序</button>
      <button type="button" @click="clearFilter">清除过滤</button>
      <button type="button" @click="clearSearch">清除搜索</button>
      <button type="button" class="instance-actions-primary" @click="clearAll">全部清除</button>
      <span aria-live="polite">{{ actionMessage }}</span>
    </div>
    <STable
      ref="table"
      row-key="id"
      bordered
      :columns="columns"
      :data-source="dataSource"
      style="height: 360px"
    />
  </div>
</template>

<style scoped>
.instance-actions-demo {
  padding: 16px;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
}

.instance-actions-toolbar {
  display: flex;
  min-height: 32px;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.instance-actions-toolbar button {
  min-height: 30px;
  padding: 4px 10px;
  border: 1px solid var(--vp-c-divider, #d9d9d9);
  border-radius: 4px;
  background: var(--vp-c-bg-soft, #fff);
  color: var(--vp-c-text-1, rgba(0, 0, 0, 0.88));
  cursor: pointer;
}

.instance-actions-toolbar .instance-actions-primary {
  border-color: #1677ff;
  background: #1677ff;
  color: #fff;
}

.instance-actions-toolbar span {
  min-width: 180px;
  color: var(--vp-c-text-2, rgba(0, 0, 0, 0.65));
  font-size: 13px;
}
</style>
