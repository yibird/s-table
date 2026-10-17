<script setup lang="ts">
import { h } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';

type UserRecord = {
  id: number;
  name: string;
  role: string;
  score: number;
};

const columns: STableColumn<UserRecord>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: () => h('span', { style: 'color: #1677ff' }, '用户信息'),
    cell: ({ row }) => h('strong', row.original.name),
  },
  {
    id: 'role',
    accessorKey: 'role',
    header: '角色',
    cell: ({ row }) =>
      h(
        'span',
        {
          style:
            'display:inline-block;padding:2px 8px;border-radius:999px;background:#f0f5ff;color:#1677ff;',
        },
        row.original.role
      ),
  },
  {
    id: 'score',
    accessorKey: 'score',
    header: '评分',
    cell: ({ row }) => `${row.original.score} 分`,
  },
];

const dataSource: UserRecord[] = [
  { id: 1, name: 'Tom', role: '管理员', score: 96 },
  { id: 2, name: 'Jerry', role: '编辑', score: 88 },
  { id: 3, name: 'Lucy', role: '访客', score: 91 },
];
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; font-weight: 600">Custom Render Demo</p>
    <STable :columns="columns" :data-source="dataSource" bordered />
  </div>
</template>
