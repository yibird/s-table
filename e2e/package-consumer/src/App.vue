<script setup lang="ts">
import STable, {
  createSTableColumnHelper,
  type STableColumns,
  type STableSlots,
  type STableProps,
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
  title: ({ currentPageData }) => currentPageData[0]?.name,
  footer: ({ currentPageData, currentPage, pageSize, total }) =>
    `${currentPageData.length}/${total}: ${currentPage} (${pageSize})`,
} satisfies Pick<STableSlots<User>, 'contextMenu' | 'title' | 'footer'>;

// A wrapper must forward this prop, not re-emit it: false is the cancellation result.
const props = defineProps<Pick<STableProps<User>, 'onCellRangeCopy'>>();
const forwardCopy: STableProps<User>['onCellRangeCopy'] = (payload) =>
  props.onCellRangeCopy?.(payload);
</script>

<template>
  <STable
    :columns="columns"
    :data-source="dataSource"
    row-key="id"
    :on-cell-range-copy="forwardCopy"
  >
    <template #title="scope">{{ slots.title(scope) }}</template>
    <template #footer="scope">{{ slots.footer(scope) }}</template>
    <template #contextMenu="scope">
      {{ slots.contextMenu(scope) }}
    </template>
  </STable>
</template>
