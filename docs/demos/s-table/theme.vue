<script setup lang="ts">
import STable, {
  type STableClasses,
  type STableColumn,
  type STableRowSelection,
  type STableStyles,
} from '../../../packages/vue/src';

interface Invoice {
  id: number;
  customer: string;
  amount: number;
  status: '待审核' | '已通过';
}

const columns: STableColumn<Invoice>[] = [
  { id: 'id', accessorKey: 'id', header: '单号', width: 88 },
  { id: 'customer', accessorKey: 'customer', header: '客户' },
  {
    id: 'amount',
    accessorKey: 'amount',
    header: '金额',
    align: 'right',
    cell: ({ row }) => `¥${row.original.amount.toLocaleString('zh-CN')}`,
  },
  { id: 'status', accessorKey: 'status', header: '状态', width: 110 },
];

const dataSource: Invoice[] = [
  { id: 501, customer: '远川科技', amount: 28600, status: '已通过' },
  { id: 502, customer: '明序设计', amount: 17400, status: '待审核' },
  { id: 503, customer: '澄海贸易', amount: 32100, status: '已通过' },
  { id: 504, customer: '开元咨询', amount: 9800, status: '待审核' },
];

const rowSelection: STableRowSelection<Invoice> = { type: 'checkbox' };
const classes: STableClasses = {
  headerCell: 'invoice-header-cell',
  bodyCell: 'invoice-body-cell',
};
const styles: STableStyles = {
  headerCell: { fontWeight: 700 },
  bodyCell: { fontVariantNumeric: 'tabular-nums' },
};
</script>

<template>
  <div class="theme-demo">
    <STable
      class="invoice-table"
      row-key="id"
      bordered
      striped
      :columns="columns"
      :data-source="dataSource"
      :row-selection="rowSelection"
      :default-selected-row-keys="[502]"
      :classes="classes"
      :styles="styles"
    />
  </div>
</template>

<style scoped>
.theme-demo {
  padding: 16px;
  border: 1px dashed #94a3b8;
  border-radius: 8px;
}

.theme-demo :deep(.invoice-table) {
  --s-primary-color: #0f766e;
  --s-color-bg-header: #ecfdf5;
  --s-color-bg-cell: #fff;
  --s-color-bg-row-hover: #f1f5f9;
  --s-color-bg-row-selected: #ccfbf1;
  --s-color-bg-row-selected-hover: #99f6e4;
  --s-color-bg-row-striped: #f8fafc;
  --s-color-border: #cbd5e1;
  --s-color-border-control: #94a3b8;
  --s-color-text: #1f2937;
  --s-color-text-secondary: #475569;
  --s-color-text-tertiary: #64748b;
}

.theme-demo :deep(.invoice-header-cell) {
  border-bottom-color: #0f766e;
}

.theme-demo :deep(.invoice-body-cell) {
  color: #1f2937;
}
</style>
