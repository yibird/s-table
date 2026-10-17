<script setup lang="ts">
import { ref } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';

interface Record {
  id: number;
  name: string;
  age: number;
  address: string;
  email: string;
}

const columns: STableColumn<Record>[] = [
  {
    id: 'id',
    accessorKey: 'id',
    header: 'ID',
    width: 100,
  },
  {
    id: 'name',
    accessorKey: 'name',
    header: '名称',
  },
  {
    id: 'age',
    accessorKey: 'age',
    header: '年龄',
  },
  {
    id: 'address',
    accessorKey: 'address',
    header: '地址',
  },
  {
    id: 'email',
    accessorKey: 'email',
    header: '邮箱',
  },
];

const dataSource = ref(
  Array.from({ length: 20 }).map((_, index) => ({
    id: index + 1,
    name: `Tom${index + 1}`,
    age: index + 18,
    address: `Hangzhou${index + 1}`,
    email: `tom${index + 1}@example.com`,
  }))
);
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; font-weight: 600">
      行拖拽排序 + FLIP 动画（设置 <code>rowDrag.animation</code> 启用平滑过渡）
    </p>
    <STable
      v-model:data-source="dataSource"
      :row-drag="{ animation: true }"
      row-key="id"
      :columns="columns"
    />
  </div>
</template>
