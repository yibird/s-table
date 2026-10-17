<script setup lang="ts">
import { ref } from 'vue';
import STable, { createSTableColumnHelper, type STableColumns } from '../../../packages/vue/src';

interface User {
  id: number;
  name: string;
  age: number;
  status: 'active' | 'disabled';
}

const column = createSTableColumnHelper<User>();
const columns = [
  column.accessor('name', { header: '姓名' }),
  column.accessor('age', { header: '年龄', sorter: true }),
  column.accessor('status', {
    header: '状态',
    cell: ({ getValue }) => (getValue() === 'active' ? '启用' : '停用'),
  }),
] satisfies STableColumns<User>;

const dataSource = ref<User[]>([
  { id: 1, name: 'Ada', age: 32, status: 'active' },
  { id: 2, name: 'Linus', age: 28, status: 'disabled' },
  { id: 3, name: 'Grace', age: 36, status: 'active' },
]);
const message = ref('');

const showUser = (user: User, close?: () => void) => {
  message.value = `当前用户：${user.name}`;
  close?.();
};
</script>

<template>
  <p v-if="message" class="slot-demo-message">{{ message }}</p>
  <STable
    row-key="id"
    row-drag
    :columns="columns"
    :data-source="dataSource"
    :expandable="{}"
    :pagination="false"
  >
    <template #expandedRowRender="{ record, index }">
      <div class="slot-demo-detail">
        第 {{ index + 1 }} 行，{{ record.name }}，{{ record.age }} 岁
      </div>
    </template>

    <template #contextMenu="{ row, close }">
      <button class="s-table-context-menu-item" @click="showUser(row, close)">
        查看 {{ row.name }}
      </button>
    </template>

    <template #rowDragHandle="{ record }">
      <span :title="`移动 ${record.name}`">⋮⋮</span>
    </template>
  </STable>
</template>

<style scoped>
.slot-demo-message {
  margin: 0 0 12px;
  color: #1677ff;
}

.slot-demo-detail {
  padding: 12px 16px;
  background: #fafafa;
}
</style>
