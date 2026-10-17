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
  { id: 'name', accessorKey: 'name', header: '名称' },
  { id: 'age', accessorKey: 'age', header: '年龄' },
  { id: 'address', accessorKey: 'address', header: '地址' },
];

const dataSource: UserRecord[] = [
  { id: 1, name: 'Tom', age: 18, address: 'Hangzhou' },
  { id: 2, name: 'Jerry', age: 20, address: 'Shanghai' },
  { id: 3, name: 'Lucy', age: 22, address: 'Shenzhen' },
];
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; font-weight: 600">Bordered Demo</p>
    <STable :columns="columns" :data-source="dataSource" bordered />
  </div>
</template>
