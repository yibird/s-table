<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue';
import STable, { type STableColumn, type STableInstance } from '../../../packages/vue/src';

interface Department {
  id: number;
  name: string;
  owner: string;
  headcount: number;
  children?: Department[];
}

const tableRef = useTemplateRef<STableInstance<Department>>('table');
const dataSource = shallowRef<Department[]>([
  {
    id: 1,
    name: '产品中心',
    owner: 'Ada',
    headcount: 28,
    children: [
      { id: 11, name: '产品设计', owner: 'Lin', headcount: 12 },
      { id: 12, name: '用户研究', owner: 'Mia', headcount: 6 },
    ],
  },
  {
    id: 2,
    name: '研发中心',
    owner: 'Grace',
    headcount: 54,
    children: [
      { id: 21, name: '平台工程', owner: 'Ken', headcount: 18 },
      { id: 22, name: '客户端', owner: 'Wei', headcount: 16 },
    ],
  },
]);

const columns: STableColumn<Department>[] = [
  { accessorKey: 'name', header: '组织', width: 220 },
  { accessorKey: 'owner', header: '负责人', width: 140 },
  { accessorKey: 'headcount', header: '人数', width: 100, align: 'right' },
];
</script>

<template>
  <section class="demo-shell">
    <div class="demo-toolbar">
      <button type="button" @click="tableRef?.expandAll()">全部展开</button>
      <button type="button" @click="tableRef?.collapseAll()">全部收起</button>
      <button type="button" @click="tableRef?.toggleExpand(2)">切换研发中心</button>
    </div>
    <STable
      ref="table"
      row-key="id"
      bordered
      default-expand-all-rows
      expand-row-by-click
      :columns="columns"
      :data-source="dataSource"
      :tree="{ indentSize: 22 }"
      :row-class-name="(record) => (record.children?.length ? 'department-root' : undefined)"
    />
  </section>
</template>

<style scoped>
.demo-shell {
  padding: 16px;
  border: 1px dashed var(--vp-c-divider, #d9d9d9);
  border-radius: 8px;
}

.demo-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.demo-toolbar button {
  min-height: 30px;
  padding: 4px 10px;
  border: 1px solid var(--vp-c-divider, #d9d9d9);
  border-radius: 4px;
  background: var(--vp-c-bg-soft, #fff);
  color: var(--vp-c-text-1, #222);
  cursor: pointer;
}

:deep(.department-root) {
  font-weight: 600;
}
</style>
