<script setup lang="ts">
import { ref } from 'vue';
import STable, { type STableColumn, type STableColumnResizeMode } from '../../../packages/vue/src';

type UserRecord = {
  id: number;
  name: string;
  age: number;
  address: string;
  remark: string;
};

const currentResizeMode = ref<STableColumnResizeMode>('onEnd');

const resizeModeOptions: Array<{ label: string; value: STableColumnResizeMode }> = [
  { label: 'onEnd', value: 'onEnd' },
  { label: 'onChange', value: 'onChange' },
];

const columns: STableColumn<UserRecord>[] = [
  {
    id: 'id',
    accessorKey: 'id',
    header: 'ID',
    width: 100,
    minWidth: 80,
    maxWidth: 140,
    resizable: true,
  },
  {
    id: 'name',
    accessorKey: 'name',
    header: '名称',
    width: 180,
    minWidth: 120,
    maxWidth: 260,
    resizable: true,
  },
  {
    id: 'age',
    accessorKey: 'age',
    header: '年龄',
    width: 120,
    minWidth: 90,
    maxWidth: 160,
    resizable: true,
  },
  {
    id: 'address',
    accessorKey: 'address',
    header: '地址',
    width: 260,
    minWidth: 180,
    maxWidth: 360,
    resizable: true,
  },
  {
    id: 'remark',
    accessorKey: 'remark',
    header: '备注',
    width: 220,
    minWidth: 160,
    maxWidth: 320,
    resizable: true,
  },
];

const dataSource: UserRecord[] = Array.from({ length: 8 }).map((_, index) => ({
  id: index + 1,
  name: `User ${index + 1}`,
  age: 18 + index,
  address: `Hangzhou West Lake Road No.${index + 1}`,
  remark: `拖拽列分隔线，宽度会限制在 minWidth / maxWidth 之间`,
}));
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; font-weight: 600">Resizable Demo</p>
    <div style="display: flex; gap: 8px; margin-bottom: 12px">
      <button
        v-for="item in resizeModeOptions"
        :key="item.value"
        type="button"
        :style="{
          padding: '6px 12px',
          borderRadius: '6px',
          border: currentResizeMode === item.value ? '1px solid #1677ff' : '1px solid #d9d9d9',
          backgroundColor: currentResizeMode === item.value ? '#e6f4ff' : '#fff',
          color: currentResizeMode === item.value ? '#1677ff' : 'rgba(0, 0, 0, 0.88)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }"
        @click="currentResizeMode = item.value"
      >
        {{ item.label }}
      </button>
    </div>
    <p style="margin: 0 0 16px; color: rgba(0, 0, 0, 0.45); font-size: 12px">
      onEnd 在拖拽结束后更新列宽，onChange 在拖拽过程中实时更新列宽。
    </p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      :column-resize-mode="currentResizeMode"
      bordered
    />
  </div>
</template>
