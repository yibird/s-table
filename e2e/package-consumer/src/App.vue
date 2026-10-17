<script setup lang="ts">
import STable, {
  createSTableColumnHelper,
  type STableColumns,
  type STableSlots,
} from '@zchengfeng/s-table-vue';

interface User {
  id: number;
  name: string;
  score: number;
}

const column = createSTableColumnHelper<User>();
const columns = [
  column.accessor('id', { header: 'ID' }),
  column.accessor('name', { header: 'Name' }),
  column.accessor('score', { header: 'Score', cell: ({ getValue }) => getValue().toFixed(1) }),
] satisfies STableColumns<User>;

const dataSource: User[] = [{ id: 1, name: 'Ada', score: 100 }];
const slots = {
  contextMenu: ({ row }) => row.name,
} satisfies Pick<STableSlots<User>, 'contextMenu'>;
</script>

<template>
  <STable :columns="columns" :data-source="dataSource" row-key="id">
    <template #contextMenu="scope">
      {{ slots.contextMenu(scope) }}
    </template>
  </STable>
</template>
