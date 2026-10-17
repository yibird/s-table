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

const columns = ref<STableColumn<Record>[]>([
  {
    id: 'id',
    accessorKey: 'id',
    header: 'ID',
    width: 100,
    draggable: true,
  },
  {
    id: 'name',
    accessorKey: 'name',
    header: '名称',
    draggable: true,
  },
  {
    id: 'age',
    accessorKey: 'age',
    header: '年龄',
    draggable: true,
  },
  {
    id: 'address',
    accessorKey: 'address',
    header: '地址',
    draggable: true,
  },
  {
    id: 'email',
    accessorKey: 'email',
    header: '邮箱',
    draggable: true,
  },
]);

const dataSource = Array.from({ length: 20 }).map((_, index) => ({
  id: index + 1,
  name: `Tom${index + 1}`,
  age: index + 18,
  address: `Hangzhou${index + 1}`,
  email: `tom${index + 1}@example.com`,
}));

const onColumnOrderChange = (payload: {
  columns: STableColumn<Record>[];
  columnOrder: string[];
  fromIndex: number;
  toIndex: number;
}) => {
  columns.value = payload.columns;
};
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; font-weight: 600">
      列拖拽排序 + FLIP 动画（设置 <code>columnDrag.animation</code> 启用平滑过渡）
    </p>
    <STable
      :column-drag="{ animation: true }"
      :columns="columns"
      :data-source="dataSource"
      @column-order-change="onColumnOrderChange"
    />
  </div>
</template>
