<script setup lang="ts">
import { ref } from 'vue';
import STable, { type STableColumn, type STablePaginationProps } from '../../../packages/vue/src';

interface Order {
  id: number;
  product: string;
  amount: number;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  category: 'electronics' | 'clothing' | 'food' | 'books';
  region: 'north' | 'south' | 'east' | 'west';
  date: string;
}

const dataSource: Order[] = [
  {
    id: 1,
    product: '笔记本电脑',
    amount: 6999,
    status: 'delivered',
    category: 'electronics',
    region: 'east',
    date: '2024-01-15',
  },
  {
    id: 2,
    product: '无线耳机',
    amount: 899,
    status: 'shipped',
    category: 'electronics',
    region: 'north',
    date: '2024-02-20',
  },
  {
    id: 3,
    product: 'T恤衫',
    amount: 199,
    status: 'pending',
    category: 'clothing',
    region: 'south',
    date: '2024-03-10',
  },
  {
    id: 4,
    product: '咖啡豆',
    amount: 128,
    status: 'delivered',
    category: 'food',
    region: 'west',
    date: '2024-01-28',
  },
  {
    id: 5,
    product: 'TypeScript实战',
    amount: 89,
    status: 'shipped',
    category: 'books',
    region: 'north',
    date: '2024-04-05',
  },
  {
    id: 6,
    product: '机械键盘',
    amount: 599,
    status: 'cancelled',
    category: 'electronics',
    region: 'east',
    date: '2024-02-14',
  },
  {
    id: 7,
    product: '运动外套',
    amount: 459,
    status: 'delivered',
    category: 'clothing',
    region: 'south',
    date: '2024-03-22',
  },
  {
    id: 8,
    product: '坚果礼盒',
    amount: 168,
    status: 'pending',
    category: 'food',
    region: 'north',
    date: '2024-05-01',
  },
  {
    id: 9,
    product: 'Vue3源码解析',
    amount: 129,
    status: 'shipped',
    category: 'books',
    region: 'west',
    date: '2024-04-18',
  },
  {
    id: 10,
    product: '显示器',
    amount: 2499,
    status: 'delivered',
    category: 'electronics',
    region: 'south',
    date: '2024-01-08',
  },
  {
    id: 11,
    product: '牛仔裤',
    amount: 299,
    status: 'pending',
    category: 'clothing',
    region: 'east',
    date: '2024-06-12',
  },
  {
    id: 12,
    product: '有机茶叶',
    amount: 258,
    status: 'delivered',
    category: 'food',
    region: 'west',
    date: '2024-03-05',
  },
];

// ══════════════════════════════════════════════════
// 示例 1：基础过滤（checkbox 多选模式）
// ══════════════════════════════════════════════════
const basicFilterColumns: STableColumn<Order>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  { id: 'product', accessorKey: 'product', header: '商品', width: 140 },
  {
    id: 'status',
    accessorKey: 'status',
    header: '状态',
    width: 120,
    filters: [
      { text: '待发货', value: 'pending' },
      { text: '已发货', value: 'shipped' },
      { text: '已完成', value: 'delivered' },
      { text: '已取消', value: 'cancelled' },
    ],
    onFilter: (value, record) => record.status === value,
  },
  {
    id: 'category',
    accessorKey: 'category',
    header: '分类',
    width: 120,
    filters: [
      { text: '电子产品', value: 'electronics' },
      { text: '服饰', value: 'clothing' },
      { text: '食品', value: 'food' },
      { text: '图书', value: 'books' },
    ],
    onFilter: (value, record) => record.category === value,
  },
  { id: 'amount', accessorKey: 'amount', header: '金额', width: 100 },
  { id: 'date', accessorKey: 'date', header: '日期', width: 120 },
];

// ══════════════════════════════════════════════════
// 示例 2：单选过滤 + 默认过滤值
// ══════════════════════════════════════════════════
const menuFilterColumns: STableColumn<Order>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  { id: 'product', accessorKey: 'product', header: '商品', width: 140 },
  {
    id: 'status',
    accessorKey: 'status',
    header: '状态（单选）',
    width: 160,
    filters: [
      { text: '待发货', value: 'pending' },
      { text: '已发货', value: 'shipped' },
      { text: '已完成', value: 'delivered' },
      { text: '已取消', value: 'cancelled' },
    ],
    onFilter: (value, record) => record.status === value,
    filterMultiple: false,
  },
  {
    id: 'region',
    accessorKey: 'region',
    header: '区域（默认过滤）',
    width: 160,
    filters: [
      { text: '华北', value: 'north' },
      { text: '华南', value: 'south' },
      { text: '华东', value: 'east' },
      { text: '华西', value: 'west' },
    ],
    onFilter: (value, record) => record.region === value,
    defaultFilteredValues: ['east', 'north'],
  },
  { id: 'amount', accessorKey: 'amount', header: '金额', width: 100 },
  { id: 'date', accessorKey: 'date', header: '日期', width: 120 },
];

// ══════════════════════════════════════════════════
// 示例 3：过滤 + 排序 + 分页联合
// ══════════════════════════════════════════════════
const largeDataSource: Order[] = Array.from({ length: 40 }).map((_, i) => ({
  id: i + 1,
  product: ['笔记本电脑', '耳机', 'T恤', '咖啡', '书籍', '键盘', '外套', '茶叶'][i % 8],
  amount: 50 + ((i * 337) % 8000),
  status: (['pending', 'shipped', 'delivered', 'cancelled'] as const)[i % 4],
  category: (['electronics', 'clothing', 'food', 'books'] as const)[i % 4],
  region: (['north', 'south', 'east', 'west'] as const)[i % 4],
  date: `2024-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
}));

const combinedColumns: STableColumn<Order>[] = [
  {
    id: 'id',
    accessorKey: 'id',
    header: 'ID',
    width: 100,
    sorter: (a, b) => a.id - b.id,
  },
  {
    id: 'product',
    accessorKey: 'product',
    header: '商品',
    width: 120,
    sorter: (a, b) => a.product.localeCompare(b.product, 'zh-CN'),
  },
  {
    id: 'amount',
    accessorKey: 'amount',
    header: '金额',
    width: 100,
    sorter: (a, b) => a.amount - b.amount,
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: '状态',
    width: 120,
    filters: [
      { text: '待发货', value: 'pending' },
      { text: '已发货', value: 'shipped' },
      { text: '已完成', value: 'delivered' },
      { text: '已取消', value: 'cancelled' },
    ],
    onFilter: (value, record) => record.status === value,
  },
  {
    id: 'category',
    accessorKey: 'category',
    header: '分类',
    width: 120,
    filters: [
      { text: '电子产品', value: 'electronics' },
      { text: '服饰', value: 'clothing' },
      { text: '食品', value: 'food' },
      { text: '图书', value: 'books' },
    ],
    onFilter: (value, record) => record.category === value,
    filterMultiple: false,
  },
  {
    id: 'date',
    accessorKey: 'date',
    header: '日期',
    width: 120,
    sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  },
];

const combinedPagination = ref<STablePaginationProps>({
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 条`,
});
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px; margin-bottom: 24px">
    <p style="margin: 0 0 12px; font-weight: 600">1. 基础过滤（Checkbox 多选模式）</p>
    <p style="margin: 0 0 12px; font-size: 13px; color: #666">
      状态列和分类列支持多选过滤，勾选后点击「确定」生效，点击「重置」清除
    </p>
    <STable :columns="basicFilterColumns" :data-source="dataSource" style="height: 420px" />
  </div>

  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px; margin-bottom: 24px">
    <p style="margin: 0 0 12px; font-weight: 600">2. Menu 单选模式 & 默认过滤值</p>
    <p style="margin: 0 0 12px; font-size: 13px; color: #666">
      状态列使用单选模式；区域列默认过滤「华东」和「华北」
    </p>
    <STable :columns="menuFilterColumns" :data-source="dataSource" style="height: 420px" />
  </div>

  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; font-weight: 600">3. 过滤 + 排序 + 分页联合</p>
    <p style="margin: 0 0 12px; font-size: 13px; color: #666">
      40 条数据：先过滤 → 再排序 → 最后分页，状态列多选、分类列单选
    </p>
    <STable
      :columns="combinedColumns"
      :data-source="largeDataSource"
      :pagination="combinedPagination"
      style="height: 480px"
    />
  </div>
</template>
