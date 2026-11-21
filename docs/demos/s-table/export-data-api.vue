<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import STable, { type STableColumn, type STableInstance } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 80 },
  { id: 'name', accessorKey: 'name', header: '姓名', sorter: true },
  { id: 'department', accessorKey: 'department', header: '部门' },
  {
    id: 'salary',
    accessorKey: 'salary',
    header: '月薪',
    align: 'right',
    sorter: true,
  },
];

const dataSource = shallowRef(generateEmployees(36));
const tableRef = ref<STableInstance<Employee>>();
const message = shallowRef('切换排序 / 页码后，再读取实例数据快照。');

const downloadJson = (data: unknown, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const inspectData = () => {
  const all = tableRef.value?.getAllData() ?? [];
  const currentPage = tableRef.value?.getCurrentPageData() ?? [];
  message.value = `全部 ${all.length} 行；当前页 ${currentPage.length} 行：${currentPage
    .map((row) => row.name)
    .join('、')}`;
};

const exportRows = (source: 'all' | 'currentPage') => {
  const rows =
    source === 'all'
      ? (tableRef.value?.getAllData() ?? [])
      : (tableRef.value?.getCurrentPageData() ?? []);
  downloadJson(rows, `employees-${source === 'all' ? 'all' : 'current-page'}.json`);
  message.value = `已导出${source === 'all' ? '全部' : '当前页'} ${rows.length} 行 JSON`;
};
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px">
      <button type="button" @click="inspectData">读取实例数据快照</button>
      <button type="button" @click="exportRows('currentPage')">导出当前页 JSON</button>
      <button type="button" @click="exportRows('all')">导出全部 JSON</button>
    </div>
    <p style="margin: 0 0 12px; color: #666; font-size: 13px">{{ message }}</p>
    <STable
      ref="tableRef"
      :columns="columns"
      :data-source="dataSource"
      row-key="id"
      :pagination="{ defaultPageSize: 8 }"
    />
  </div>
</template>
