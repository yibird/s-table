<script setup lang="ts">
import { ref } from 'vue';
import STable, { type STableColumn, type STableSize } from '../../../packages/vue/src';

type UserRecord = {
  id: number;
  name: string;
  age: number;
  address: string;
};

const currentSize = ref<STableSize>('middle');

const sizeOptions: Array<{ label: string; value: STableSize }> = [
  { label: 'Small', value: 'small' },
  { label: 'Middle', value: 'middle' },
  { label: 'Large', value: 'large' },
];

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
  { id: 4, name: 'John', age: 24, address: 'Chengdu' },
];
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; font-weight: 600">Size Demo</p>
    <div style="display: flex; gap: 8px; margin-bottom: 16px">
      <button
        v-for="item in sizeOptions"
        :key="item.value"
        type="button"
        :style="{
          padding: '6px 12px',
          borderRadius: '6px',
          border: currentSize === item.value ? '1px solid #1677ff' : '1px solid #d9d9d9',
          backgroundColor: currentSize === item.value ? '#e6f4ff' : '#fff',
          color: currentSize === item.value ? '#1677ff' : 'rgba(0, 0, 0, 0.88)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }"
        @click="currentSize = item.value"
      >
        {{ item.label }}
      </button>
    </div>
    <STable :columns="columns" :data-source="dataSource" :size="currentSize" bordered />
  </div>
</template>
