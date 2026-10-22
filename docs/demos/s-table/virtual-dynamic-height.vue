<script setup lang="ts">
import { shallowRef } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';

interface Note {
  id: number;
  title: string;
  note: string;
}

const words = '静态内容会根据实际高度自动测量；长文本在 autoHeight 列中换行并撑高所在行。';
const dataSource: Note[] = Array.from({ length: 200 }, (_, index) => ({
  id: index + 1,
  title: `记录 ${index + 1}`,
  note: index % 4 === 0 ? words.repeat(3) : words.repeat(index % 3),
}));

const columns: STableColumn<Note>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 90 },
  { id: 'title', accessorKey: 'title', header: '标题', width: 140 },
  {
    id: 'note',
    accessorKey: 'note',
    header: '备注（autoHeight + 动态测量）',
    autoHeight: true,
    width: 360,
  },
];

const preserveRow = shallowRef(true);
</script>

<template>
  <div class="demo-shell">
    <label style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px">
      <input v-model="preserveRow" type="checkbox" />
      <span style="font-size: 13px; color: #666">
        preserveRow：按 row.id 保留已测量行高，切换数据后减少跳动
      </span>
    </label>
    <STable
      :columns="columns"
      :data-source="dataSource"
      row-key="id"
      :virtual="{ estimateSize: 44 }"
      :preserve-row="preserveRow"
      style="height: 380px"
    />
  </div>
</template>

<style scoped>
.demo-shell {
  padding: 16px;
  border: 1px dashed #d9d9d9;
  border-radius: 12px;
}
</style>
