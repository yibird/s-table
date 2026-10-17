<script setup lang="ts">
import STable, { type STableColumn } from '../../../packages/vue/src';

type UserRecord = {
  id: number;
  name: string;
  department: string;
  status: string;
};

const columns: STableColumn<UserRecord>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'department', accessorKey: 'department', header: '部门' },
  { id: 'status', accessorKey: 'status', header: '状态' },
];

const dataSource: UserRecord[] = [
  { id: 1, name: 'Tom', department: '设计', status: '在职' },
  { id: 2, name: 'Jerry', department: '研发', status: '在职' },
  { id: 3, name: 'Lucy', department: '产品', status: '休假' },
  { id: 4, name: 'John', department: '测试', status: '在职' },
  { id: 5, name: 'Lily', department: '运营', status: '离线' },
];
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; font-weight: 600">Striped Demo</p>
    <STable :columns="columns" :data-source="dataSource" striped />
  </div>
</template>
