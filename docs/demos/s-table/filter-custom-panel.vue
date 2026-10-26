<script setup lang="ts">
import { shallowRef } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
}

const dataSource = shallowRef<Product[]>([
  { id: 1, name: '笔记本电脑', category: '电子', price: 6999 },
  { id: 2, name: '无线耳机', category: '电子', price: 899 },
  { id: 3, name: 'T恤衫', category: '服饰', price: 199 },
  { id: 4, name: '咖啡豆', category: '食品', price: 128 },
  { id: 5, name: '机械键盘', category: '电子', price: 599 },
  { id: 6, name: '运动外套', category: '服饰', price: 459 },
]);

const columns: STableColumn<Product>[] = [
  { accessorKey: 'id', header: 'ID', width: 64 },
  {
    accessorKey: 'name',
    header: '商品',
    width: 180,
    // 关键字自定义过滤:面板负责收集草稿,onFilter 决定行是否保留。
    filterMode: 'custom',
    onFilter: (value, record) =>
      String(record.name).toLowerCase().includes(String(value).toLowerCase()),
  },
  { accessorKey: 'category', header: '分类', width: 120 },
  { accessorKey: 'price', header: '价格', width: 120, align: 'right' },
];
</script>

<template>
  <section class="demo-shell">
    <p class="demo-tip">点击「商品」列表头的过滤图标,输入关键字后确定;重置会清空该列过滤。</p>
    <STable :columns="columns" :data-source="dataSource" row-key="id" bordered>
      <template #filterPanel="{ selectedKeys, setSelectedKeys, confirm, reset }">
        <div class="demo-filter">
          <input
            :value="String(selectedKeys[0] ?? '')"
            type="text"
            placeholder="输入商品关键字"
            @input="setSelectedKeys([($event.target as HTMLInputElement).value])"
            @keydown.enter="confirm"
          />
          <div class="demo-filter-actions">
            <button type="button" @click="reset">重置</button>
            <button type="button" class="primary" @click="confirm">确定</button>
          </div>
        </div>
      </template>
    </STable>
  </section>
</template>

<style scoped>
.demo-shell {
  padding: 16px;
  border: 1px dashed var(--vp-c-divider, #d9d9d9);
  border-radius: 8px;
}

.demo-tip {
  margin: 0 0 12px;
  color: var(--vp-c-text-2, #666);
  font-size: 13px;
}

.demo-filter {
  display: grid;
  gap: 8px;
  min-width: 200px;
}

.demo-filter input {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid var(--vp-c-divider, #d9d9d9);
  border-radius: 4px;
  background: var(--vp-c-bg, #fff);
  color: var(--vp-c-text-1, #222);
  font: inherit;
  box-sizing: border-box;
}

.demo-filter-actions {
  display: flex;
  gap: 8px;
}

.demo-filter-actions button {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--vp-c-divider, #d9d9d9);
  border-radius: 4px;
  background: var(--vp-c-bg-soft, #f5f5f5);
  cursor: pointer;
}

.demo-filter-actions .primary {
  border-color: #1677ff;
  background: #1677ff;
  color: #fff;
}
</style>
