<script setup lang="ts">
import { ref, shallowRef, useTemplateRef } from 'vue';
import STable, { type STableColumn, type STableInstance } from '../../../packages/vue/src';

interface Order {
  id: number;
  department: string;
  region: string;
  amount: number;
}

const dataSource: Order[] = [
  { id: 1, department: '技术部', region: '华东', amount: 12000 },
  { id: 2, department: '技术部', region: '华南', amount: 8000 },
  { id: 3, department: '技术部', region: '华东', amount: 15000 },
  { id: 4, department: '产品部', region: '华东', amount: 9000 },
  { id: 5, department: '产品部', region: '华北', amount: 11000 },
  { id: 6, department: '设计部', region: '华南', amount: 7000 },
];

const columns: STableColumn<Order>[] = [
  { id: 'department', accessorKey: 'department', header: '部门', groupable: true },
  { id: 'region', accessorKey: 'region', header: '区域', groupable: true },
  {
    id: 'amount',
    accessorKey: 'amount',
    header: '金额',
    align: 'right',
    aggregation: 'sum',
    aggregatedCell: ({ getValue }) => `小计 ${Number(getValue()).toLocaleString()}`,
  },
];

const groupBy = ref<string[]>(['department']);
const regionGroup = ref<string[]>(['region']);
const tableRef = useTemplateRef<STableInstance<Order>>('tableRef');
const message = shallowRef('当前按部门分组，金额列显示聚合小计');

const setGrouping = (next: string[], text: string) => {
  groupBy.value = next;
  message.value = text;
};

const expandAll = () => tableRef.value?.expandAllGroups();
const collapseAll = () => tableRef.value?.collapseAllGroups();
</script>

<template>
  <div class="demo-shell">
    <div class="demo-toolbar">
      <button type="button" @click="setGrouping(['department'], '按部门分组')">按部门</button>
      <button type="button" @click="setGrouping(['department', 'region'], '部门 + 区域')">
        部门 + 区域
      </button>
      <button type="button" @click="setGrouping([], '取消分组')">取消分组</button>
      <button type="button" @click="expandAll">全部展开</button>
      <button type="button" @click="collapseAll">全部折叠</button>
    </div>
    <p style="margin: 0 0 12px; color: #666; font-size: 13px">{{ message }}</p>
    <STable
      ref="tableRef"
      v-model:group-by="groupBy"
      :columns="columns"
      :data-source="dataSource"
      row-key="id"
      bordered
    />

    <p style="margin: 24px 0 8px; font-weight: 600">自定义 groupRow</p>
    <p style="margin: 0 0 12px; color: #666; font-size: 13px">
      `#groupRow` 会替换整行内容，因此该表不再渲染金额聚合单元格。
    </p>
    <STable
      v-model:group-by="regionGroup"
      :columns="columns"
      :data-source="dataSource"
      row-key="id"
      bordered
    >
      <template #groupRow="{ groupValue, count, depth, expanded, toggle }">
        <span
          :style="{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            paddingLeft: `${depth * 12}px`,
          }"
        >
          <button
            type="button"
            style="border: 0; background: transparent; cursor: pointer; color: #1677ff"
            @click="toggle"
          >
            {{ expanded ? '▾' : '▸' }}
          </button>
          <strong>{{ String(groupValue) }}</strong>
          <span style="color: #888; font-size: 12px">{{ count }} 条</span>
        </span>
      </template>
    </STable>
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
