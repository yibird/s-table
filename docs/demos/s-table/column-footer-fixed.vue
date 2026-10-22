<script setup lang="ts">
import { computed } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';

interface Sale {
  id: number;
  product: string;
  quantity: number;
  amount: number;
}

const dataSource: Sale[] = [
  { id: 1, product: '笔记本电脑', quantity: 2, amount: 15998 },
  { id: 2, product: '机械键盘', quantity: 5, amount: 2495 },
  { id: 3, product: '无线耳机', quantity: 8, amount: 3992 },
  { id: 4, product: '显示器', quantity: 3, amount: 5397 },
  { id: 5, product: '扩展坞', quantity: 6, amount: 1794 },
  { id: 6, product: '人体工学椅', quantity: 1, amount: 2699 },
  { id: 7, product: '升降桌', quantity: 1, amount: 3299 },
  { id: 8, product: '摄像头', quantity: 4, amount: 1196 },
];

const totalQuantity = computed(() => dataSource.reduce((sum, row) => sum + row.quantity, 0));
const totalAmount = computed(() => dataSource.reduce((sum, row) => sum + row.amount, 0));

const columns: STableColumn<Sale>[] = [
  { id: 'product', accessorKey: 'product', header: '商品', footer: '合计' },
  {
    id: 'quantity',
    accessorKey: 'quantity',
    header: '数量',
    align: 'right',
    footer: () => totalQuantity.value,
  },
  {
    id: 'amount',
    accessorKey: 'amount',
    header: '金额',
    align: 'right',
    footer: () => `¥${totalAmount.value.toLocaleString()}`,
  },
];
</script>

<template>
  <div class="demo-shell">
    <p style="margin: 0 0 12px; color: #666; font-size: 13px">
      列定义上的 `footer` 渲染为 &lt;tfoot&gt; 汇总行；开启 `summaryFixed` 后固定在滚动容器底部。
    </p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      row-key="id"
      summary-fixed
      style="height: 300px"
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
</style>
