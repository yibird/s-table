<script setup lang="ts">
import STable, { type STableColumn } from '../../../packages/vue/src';

type UserRecord = {
  id: number;
  name: string;
  age: number;
  city: string;
  company: string;
  department: string;
  email: string;
  phone: string;
  action: string;
};

const columns: STableColumn<UserRecord>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100, fixed: 'left' },
  { id: 'name', accessorKey: 'name', header: '姓名', width: 160, fixed: 'left' },
  { id: 'age', accessorKey: 'age', header: '年龄', width: 120 },
  { id: 'city', accessorKey: 'city', header: '城市', width: 180 },
  { id: 'company', accessorKey: 'company', header: '公司', width: 220 },
  { id: 'department', accessorKey: 'department', header: '部门', width: 180 },
  { id: 'email', accessorKey: 'email', header: '邮箱', width: 260 },
  { id: 'phone', accessorKey: 'phone', header: '电话', width: 180 },
  { id: 'action', accessorKey: 'action', header: '操作', width: 120, fixed: 'right' },
];

const dataSource: UserRecord[] = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  name: `User ${index + 1}`,
  age: 20 + (index % 8),
  city: `Hangzhou ${index + 1}`,
  company: `S-Table Company ${index + 1}`,
  department: ['Design', 'RD', 'QA', 'Ops'][index % 4]!,
  email: `user${index + 1}@stable.dev`,
  phone: `188-0000-${String(index + 1).padStart(4, '0')}`,
  action: '查看',
}));
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; font-weight: 600">Fixed Columns Demo</p>
    <p style="margin: 0 0 16px; color: rgba(0, 0, 0, 0.45); font-size: 12px">
      左侧固定 ID、姓名，右侧固定操作；横向滚动时固定列会保持可见。
    </p>
    <div style="max-width: 760px">
      <STable :columns="columns" :data-source="dataSource" bordered />
    </div>
  </div>
</template>
