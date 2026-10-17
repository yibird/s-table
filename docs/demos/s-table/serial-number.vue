<script setup lang="ts">
import { ref, computed } from 'vue';
import STable, {
  type STableColumn,
  type STablePaginationProps,
  type STableSeq,
} from '../../../packages/vue/src';

const columns: STableColumn<(typeof dataSource)[number]>[] = [
  { id: 'name', accessorKey: 'name', header: '名称' },
  { id: 'age', accessorKey: 'age', header: '年龄', width: 80 },
  { id: 'address', accessorKey: 'address', header: '地址' },
];

const dataSource = Array.from({ length: 25 }).map((_, index) => ({
  id: index + 1,
  name: `Tom${index + 1}`,
  age: index + 18,
  address: `Hangzhou${index + 1}`,
}));

// 示例1：默认序号列（true）
// 示例2：分页联动 —— 翻页后序号跨页连续
const current = ref(1);
const pageSize = ref(10);
const pagination = computed<STablePaginationProps>(() => ({
  current: current.value,
  pageSize: pageSize.value,
  showTotal: (total: number) => `共 ${total} 条`,
  onChange(page: number, size: number) {
    current.value = page;
    pageSize.value = size;
  },
}));

// 示例3：自定义序号列（标题 / 宽度 / 起始值 / 自定义渲染）
const customSerial: STableSeq = {
  title: 'No.',
  columnWidth: 80,
  startIndex: 1,
  renderCell: (index) => `第 ${index} 行`,
};
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px; margin-bottom: 24px">
    <p style="margin: 0 0 12px; font-weight: 600">默认序号列（seq）</p>
    <STable :columns="columns" :data-source="dataSource.slice(0, 5)" :seq="true" row-key="id" />
  </div>

  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px; margin-bottom: 24px">
    <p style="margin: 0 0 12px; font-weight: 600">分页联动（翻页后序号跨页连续）</p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      :seq="true"
      :pagination="pagination"
      row-key="id"
    />
  </div>

  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; font-weight: 600">自定义序号列（标题 / 宽度 / 渲染）</p>
    <STable
      :columns="columns"
      :data-source="dataSource.slice(0, 5)"
      :seq="customSerial"
      row-key="id"
    />
  </div>
</template>
