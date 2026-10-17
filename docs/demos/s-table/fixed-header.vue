<script setup lang="ts">
import STable, { type STableColumn } from '../../../packages/vue/src';

type UserRecord = {
  id: number;
  name: string;
  age: number;
  address: string;
};

const columns: STableColumn<UserRecord>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'age', accessorKey: 'age', header: '年龄' },
  { id: 'address', accessorKey: 'address', header: '地址' },
];

const dataSource: UserRecord[] = Array.from({ length: 30 }, (_, index) => ({
  id: index + 1,
  name: `User ${index + 1}`,
  age: 18 + (index % 10),
  address: `Hangzhou No.${index + 1}`,
}));
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; font-weight: 600">Fixed Header Demo</p>
    <STable :columns="columns" :data-source="dataSource" style="height: 320px" fixed-header />
  </div>
</template>
