<script setup lang="ts">
import { h, ref } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 90 },
  {
    id: 'name',
    accessorKey: 'name',
    header: '姓名（省略 + Tooltip）',
    width: 150,
    ellipsis: true,
    tooltip: true,
  },
  {
    id: 'email',
    accessorKey: 'email',
    header: '邮箱',
    width: 220,
    ellipsis: true,
    tooltip: ({ record }) => `联系 ${record.name}：${record.email}`,
    responsive: ['md', 'lg', 'xl', 'xxl'],
  },
  {
    id: 'department',
    accessorKey: 'department',
    header: '部门',
    width: 130,
    showMenu: true,
    menuPopup: ({ column, close }) =>
      h('div', { style: 'display:flex;flex-direction:column' }, [
        h('button', { class: 'demo-menu-item', onClick: close }, `复制 ${column.id}`),
        h('button', { class: 'demo-menu-item', onClick: close }, '固定此列'),
      ]),
  },
  {
    id: 'address',
    accessorKey: 'address',
    header: '地址（autoHeight）',
    autoHeight: true,
  },
];

const dataSource = generateEmployees(12).map((row) => ({
  ...row,
  address: `${row.city} ${row.address} 很长的地址内容会换行显示，用于演示 autoHeight。`,
}));

const breakpointHint = ref('窗口宽度变化时，邮箱列会在 md 以下隐藏（defaultBreakpoint: lg）');
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; color: #666">{{ breakpointHint }}</p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      row-key="id"
      :default-breakpoint="'lg'"
      :pagination="false"
      :virtual="{ rowHeight: (record) => (record.address.length > 40 ? 64 : 48) }"
      style="max-height: 420px"
    />
  </div>
</template>

<style scoped>
:deep(.demo-menu-item) {
  padding: 5px 12px;
  border: 0;
  background: transparent;
  border-radius: 4px;
  text-align: left;
  cursor: pointer;
}
:deep(.demo-menu-item:hover) {
  background: rgba(0, 0, 0, 0.04);
}
</style>
