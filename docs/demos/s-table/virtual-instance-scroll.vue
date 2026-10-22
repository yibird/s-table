<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue';
import STable, { type STableColumn, type STableInstance } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 90 },
  { id: 'name', accessorKey: 'name', header: '姓名', width: 140 },
  { id: 'department', accessorKey: 'department', header: '部门', width: 140 },
  { id: 'email', accessorKey: 'email', header: '邮箱', width: 220 },
  { id: 'address', accessorKey: 'address', header: '地址', width: 240 },
];

const dataSource = generateEmployees(500);
const tableRef = useTemplateRef<STableInstance<Employee>>('tableRef');
const position = shallowRef({ left: 0, top: 0 });

const syncPosition = () => {
  window.setTimeout(() => {
    if (tableRef.value) position.value = tableRef.value.getScrollPosition();
  }, 350);
};

const goRow = () => {
  tableRef.value?.scrollToRow(320);
  syncPosition();
};
const goColumn = () => {
  tableRef.value?.scrollToColumn('address');
  syncPosition();
};
const goTop = () => {
  tableRef.value?.scrollToTop();
  syncPosition();
};
const goBottom = () => {
  tableRef.value?.scrollToBottom();
  syncPosition();
};
</script>

<template>
  <div class="demo-shell">
    <div class="demo-toolbar">
      <button type="button" @click="goRow">滚动到第 320 行</button>
      <button type="button" @click="goColumn">横向滚动到地址列</button>
      <button type="button" @click="goTop">回到顶部</button>
      <button type="button" @click="goBottom">滚到底部</button>
      <span style="color: #666; font-size: 13px">
        scrollLeft={{ Math.round(position.left) }} / scrollTop={{ Math.round(position.top) }}
      </span>
    </div>
    <STable
      ref="tableRef"
      :columns="columns"
      :data-source="dataSource"
      row-key="id"
      :virtual="{ rowHeight: 40 }"
      style="height: 360px"
    />
  </div>
</template>

<style scoped>
.demo-shell {
  padding: 16px;
  border: 1px dashed #d9d9d9;
  border-radius: 12px;
}

.demo-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.demo-toolbar button {
  padding: 4px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}
</style>
