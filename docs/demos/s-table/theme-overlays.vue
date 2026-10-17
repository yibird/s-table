<script setup lang="ts">
import { shallowRef } from 'vue';
import STable, {
  type STableColumn,
  type STablePaginationProps,
  type STableRowSelection,
} from '../../../packages/vue/src';

interface Order {
  id: number;
  customer: string;
  amount: number;
  status: '待处理' | '已完成';
}

const columns: STableColumn<Order>[] = [
  { id: 'id', accessorKey: 'id', header: '单号', width: 82 },
  { id: 'customer', accessorKey: 'customer', header: '客户', width: 120, search: true },
  {
    id: 'amount',
    accessorKey: 'amount',
    header: '金额',
    width: 112,
    align: 'right',
    cell: ({ row }) => `¥${row.original.amount.toLocaleString('zh-CN')}`,
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: '状态',
    width: 112,
    filters: [
      { text: '待处理', value: '待处理' },
      { text: '已完成', value: '已完成' },
    ],
    filterMode: 'menu',
    filterMultiple: false,
    onFilter: (value, record) => record.status === value,
  },
];

const dataSource: Order[] = [
  { id: 801, customer: '远川科技', amount: 28600, status: '已完成' },
  { id: 802, customer: '明序设计', amount: 17400, status: '待处理' },
  { id: 803, customer: '澄海贸易', amount: 32100, status: '已完成' },
  { id: 804, customer: '开元咨询', amount: 9800, status: '待处理' },
  { id: 805, customer: '青禾制造', amount: 24600, status: '待处理' },
  { id: 806, customer: '云岚网络', amount: 41500, status: '已完成' },
];

const rowSelection: STableRowSelection<Order> = { type: 'checkbox' };
const pagination: STablePaginationProps = {
  defaultPageSize: 3,
  pageSizeOptions: [3, 6],
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 条`,
};

const actionMessage = shallowRef('未执行行操作');

const handleContextAction = (action: string, row: Order | null, close: () => void) => {
  actionMessage.value = row ? `${action}：${row.customer}` : action;
  close();
};
</script>

<template>
  <section class="theme-overlays-demo">
    <div class="theme-overlays-header">
      <strong>订单处理</strong>
      <span aria-live="polite">{{ actionMessage }}</span>
    </div>
    <STable
      row-key="id"
      bordered
      striped
      :columns="columns"
      :data-source="dataSource"
      :row-selection="rowSelection"
      :pagination="pagination"
      pagination-placement="bottomEnd"
    >
      <template #contextMenu="{ row, close }">
        <button
          class="s-table-context-menu-item"
          @click="handleContextAction('查看订单', row, close)"
        >
          查看订单
        </button>
        <button
          class="s-table-context-menu-item"
          @click="handleContextAction('标记完成', row, close)"
        >
          标记完成
        </button>
      </template>
    </STable>
  </section>
</template>

<style scoped>
.theme-overlays-demo {
  --s-primary-color: #b42318;
  --s-color-bg-header: #fff1f2;
  --s-color-bg-cell: #ffffff;
  --s-color-bg-row-hover: #fff5f5;
  --s-color-bg-row-selected: #ffe4e6;
  --s-color-bg-row-selected-hover: #fecdd3;
  --s-color-bg-row-striped: #fffafa;
  --s-color-border: #fecdd3;
  --s-color-border-control: #fda4af;
  --s-color-text: #3f0d12;
  --s-color-text-secondary: #7f1d1d;
  --s-color-text-tertiary: #9f3a38;
  --s-color-bg-hover: rgba(180, 35, 24, 0.07);
  --s-color-bg-active: rgba(180, 35, 24, 0.12);
  --s-radius-sm: 3px;
  --s-radius-md: 5px;
  --s-radius-lg: 6px;
  --s-shadow-dropdown: 0 12px 28px rgba(127, 29, 29, 0.16);
  --s-shadow-menu: 0 12px 30px rgba(127, 29, 29, 0.18);

  padding: 16px;
  border: 1px solid #fecdd3;
  border-radius: 8px;
  background: #ffffff;
  color: var(--s-color-text);
}

.theme-overlays-header {
  display: flex;
  min-height: 24px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  font-size: 14px;
}

.theme-overlays-header span {
  color: var(--s-color-text-tertiary);
  font-size: 13px;
}
</style>
