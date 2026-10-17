<script setup lang="ts">
import { h, shallowRef } from 'vue';
import STable, { createSTableColumnHelper, type STableColumns } from '../../../packages/vue/src';

interface Member {
  id: number;
  profile: {
    name: string;
    email: string;
  };
  team: {
    name: string;
  };
  completed: number;
  total: number;
}

const column = createSTableColumnHelper<Member>();
const activeMember = shallowRef('尚未选择成员');

const columns = [
  column.accessor('id', { header: '编号', width: 88 }),
  column.accessor('profile.name', { id: 'memberName', header: '成员' }),
  column.accessor('team.name', { id: 'teamName', header: '团队' }),
  column.accessor((record) => record.completed / record.total, {
    id: 'completionRate',
    header: '完成率',
    align: 'right',
    cell: ({ getValue }) => `${Math.round(getValue() * 100)}%`,
    sorter: (a, b) => a.completed / a.total - b.completed / b.total,
  }),
  column.display({
    id: 'action',
    header: '操作',
    width: 88,
    align: 'center',
    cell: ({ row }) =>
      h(
        'button',
        {
          type: 'button',
          style: {
            padding: '2px 6px',
            border: 'none',
            background: 'transparent',
            color: '#1677ff',
            cursor: 'pointer',
          },
          onClick: () => {
            activeMember.value = `${row.original.profile.name} / ${row.original.profile.email}`;
          },
        },
        '查看'
      ),
  }),
] satisfies STableColumns<Member>;

const dataSource: Member[] = [
  {
    id: 1001,
    profile: { name: '林嘉', email: 'lin.jia@example.com' },
    team: { name: '平台组' },
    completed: 18,
    total: 20,
  },
  {
    id: 1002,
    profile: { name: '周宁', email: 'zhou.ning@example.com' },
    team: { name: '数据组' },
    completed: 13,
    total: 20,
  },
  {
    id: 1003,
    profile: { name: '陈安', email: 'chen.an@example.com' },
    team: { name: '体验组' },
    completed: 16,
    total: 20,
  },
  {
    id: 1004,
    profile: { name: '许言', email: 'xu.yan@example.com' },
    team: { name: '平台组' },
    completed: 11,
    total: 20,
  },
];
</script>

<template>
  <div class="accessor-demo">
    <div class="accessor-demo-status" aria-live="polite">{{ activeMember }}</div>
    <STable row-key="id" bordered :columns="columns" :data-source="dataSource" />
  </div>
</template>

<style scoped>
.accessor-demo {
  padding: 16px;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
}

.accessor-demo-status {
  min-height: 24px;
  margin-bottom: 12px;
  color: var(--vp-c-text-2, rgba(0, 0, 0, 0.65));
  font-size: 13px;
}
</style>
