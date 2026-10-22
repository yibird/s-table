<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import STable, {
  type STableColumn,
  type STableInstance,
  type STablePinnedRowKeys,
} from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const dataSource = generateEmployees(14);
const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 90 },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'department', accessorKey: 'department', header: '部门' },
  { id: 'salary', accessorKey: 'salary', header: '月薪', align: 'right' },
];

const pinnedRowKeys = ref<Required<STablePinnedRowKeys>>({ top: [2], bottom: [12] });
const tableRef = useTemplateRef<STableInstance<Employee>>('tableRef');

const pinnedSummary = computed(
  () =>
    `top: ${pinnedRowKeys.value.top.join(', ') || '无'}；bottom: ${pinnedRowKeys.value.bottom.join(', ') || '无'}`
);

// 受控模式下 pinRow 会通过 v-model 更新 pinnedRowKeys，不能再立即用旧快照覆盖。
const pinTop = () => {
  tableRef.value?.pinRow(5, 'top');
};
const pinBottom = () => {
  tableRef.value?.pinRow(8, 'bottom');
};
const unpinAll = () => {
  pinnedRowKeys.value = { top: [], bottom: [] };
};
</script>

<template>
  <div class="demo-shell">
    <div class="demo-toolbar">
      <button type="button" @click="pinTop">固定第 5 行到顶部</button>
      <button type="button" @click="pinBottom">固定第 8 行到底部</button>
      <button type="button" @click="unpinAll">取消全部固定</button>
      <span style="color: #666; font-size: 13px">{{ pinnedSummary }}</span>
    </div>
    <STable
      ref="tableRef"
      v-model:pinned-row-keys="pinnedRowKeys"
      :columns="columns"
      :data-source="dataSource"
      row-key="id"
      style="height: 360px"
      bordered
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
  gap: 8px;
  align-items: center;
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
