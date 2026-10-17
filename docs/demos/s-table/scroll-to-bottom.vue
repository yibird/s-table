<script setup lang="ts">
import { ref } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';

// ── 数据类型 ──
interface UserData {
  id: number;
  name: string;
  age: number;
  city: string;
  email: string;
}

const cities = ['北京', '上海', '杭州', '深圳', '广州', '成都', '武汉', '南京'];
const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];

const generateData = (start: number, count: number): UserData[] =>
  Array.from({ length: count }, (_, i) => ({
    id: start + i + 1,
    name: `${names[(start + i) % names.length]}${start + i + 1}`,
    age: 20 + ((start + i) % 40),
    city: cities[(start + i) % cities.length],
    email: `user${start + i + 1}@example.com`,
  }));

// ══════════════════════════════════════════════════
// 示例 1：滚动触底加载更多
// ══════════════════════════════════════════════════
const columns: STableColumn<UserData>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  { id: 'name', accessorKey: 'name', header: '姓名', width: 120 },
  { id: 'age', accessorKey: 'age', header: '年龄', width: 80 },
  { id: 'city', accessorKey: 'city', header: '城市', width: 100 },
  { id: 'email', accessorKey: 'email', header: '邮箱' },
];

const data = ref<UserData[]>(generateData(0, 50));
const loading = ref(false);
const hasMore = ref(true);
const loadCount = ref(1);

const loadMore = async () => {
  if (loading.value || !hasMore.value) return;
  loading.value = true;
  // 模拟网络请求延迟
  await new Promise((resolve) => setTimeout(resolve, 800));
  const newData = generateData(data.value.length, 30);
  data.value = [...data.value, ...newData];
  loadCount.value++;
  loading.value = false;
  // 模拟最多加载 5 次
  if (loadCount.value >= 5) {
    hasMore.value = false;
  }
};

// ══════════════════════════════════════════════════
// 示例 2：虚拟滚动 + 触底加载
// ══════════════════════════════════════════════════
const data2 = ref<UserData[]>(generateData(0, 100));
const loading2 = ref(false);
const hasMore2 = ref(true);
const loadCount2 = ref(1);

const loadMore2 = async () => {
  if (loading2.value || !hasMore2.value) return;
  loading2.value = true;
  await new Promise((resolve) => setTimeout(resolve, 600));
  const newData = generateData(data2.value.length, 50);
  data2.value = [...data2.value, ...newData];
  loadCount2.value++;
  loading2.value = false;
  if (loadCount2.value >= 10) {
    hasMore2.value = false;
  }
};
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; font-weight: 600">
      1. 滚动触底加载更多
      <span style="margin-left: 12px; font-weight: 400; font-size: 13px; color: #888">
        已加载 {{ data.length }} 条，共加载 {{ loadCount }} 次
      </span>
    </p>
    <STable
      :columns="columns"
      :data-source="data"
      :loading="loading"
      row-key="id"
      style="height: 360px"
      @scroll-to-bottom="loadMore"
    >
      <template #scrollToBottom>
        <span v-if="loading">加载中...</span>
        <span v-else-if="!hasMore" style="color: rgba(0, 0, 0, 0.25)">没有更多数据了</span>
      </template>
    </STable>

    <p style="margin: 24px 0 12px; font-weight: 600">
      2. 虚拟滚动 + 触底加载
      <span style="margin-left: 12px; font-weight: 400; font-size: 13px; color: #888">
        已加载 {{ data2.length }} 条，支持万级数据
      </span>
    </p>
    <STable
      :columns="columns"
      :data-source="data2"
      :loading="loading2"
      :virtual="{ y: true, x: false, scrollToBottomOffset: 100 }"
      row-key="id"
      style="height: 400px"
      @scroll-to-bottom="loadMore2"
    >
      <template #scrollToBottom>
        <div style="display: flex; align-items: center; gap: 8px">
          <span v-if="loading2" style="color: #1677ff">⟳ 加载中...</span>
          <span v-else-if="!hasMore2" style="color: rgba(0, 0, 0, 0.25)">— 已加载全部数据 —</span>
        </div>
      </template>
    </STable>
  </div>
</template>
