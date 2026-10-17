<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue';
import STable, {
  type STableColumn,
  type STablePaginationProps,
  type STableSortOrder,
} from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

// ── 模拟全量数据（实际场景中由后端返回） ──
const allData = generateEmployees(200);

// ── 服务端请求状态 ──
const loading = shallowRef(false);
const dataSource = shallowRef<Employee[]>([]);
const total = shallowRef(0);

// ── 服务端筛选 / 排序 / 分页参数 ──
const serverState = reactive({
  page: 1,
  pageSize: 10,
  sortField: null as string | null,
  sortOrder: null as STableSortOrder | null,
  searchKeyword: '',
  filters: {} as Record<string, (string | number | boolean)[]>,
  searches: {} as Record<string, string>,
});

/**
 * 模拟服务端请求：在本地对 allData 做过滤 → 排序 → 分页。
 * 实际项目中替换为 fetch / axios 调用即可。
 */
const fetchData = async () => {
  loading.value = true;

  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 300));

  let filtered = allData;

  // 1. 搜索过滤
  if (serverState.searchKeyword) {
    const kw = serverState.searchKeyword.toLowerCase();
    filtered = filtered.filter(
      (r) => r.name.toLowerCase().includes(kw) || r.department.includes(serverState.searchKeyword)
    );
  }

  const departmentFilters = serverState.filters.department ?? [];
  if (departmentFilters.length > 0) {
    filtered = filtered.filter((record) => departmentFilters.includes(record.department));
  }

  const nameSearch = serverState.searches.name?.trim().toLowerCase();
  if (nameSearch) {
    filtered = filtered.filter((record) => record.name.toLowerCase().includes(nameSearch));
  }

  // 2. 排序
  if (serverState.sortField && serverState.sortOrder) {
    const field = serverState.sortField as keyof Employee;
    const dir = serverState.sortOrder === 'ascend' ? 1 : -1;
    filtered = [...filtered].sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), 'zh-CN') * dir;
    });
  }

  total.value = filtered.length;

  // 3. 分页
  const start = (serverState.page - 1) * serverState.pageSize;
  dataSource.value = filtered.slice(start, start + serverState.pageSize);

  loading.value = false;
};

// ── 初始加载 ──
fetchData();

// ── 列定义 ──
const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100, sorter: true },
  { id: 'name', accessorKey: 'name', header: '姓名', width: 120, sorter: true, search: true },
  { id: 'age', accessorKey: 'age', header: '年龄', width: 80, sorter: true },
  {
    id: 'department',
    accessorKey: 'department',
    header: '部门',
    width: 120,
    sorter: true,
    filters: [
      { text: '技术部', value: '技术部' },
      { text: '产品部', value: '产品部' },
      { text: '设计部', value: '设计部' },
      { text: '市场部', value: '市场部' },
    ],
  },
  { id: 'salary', accessorKey: 'salary', header: '月薪', width: 120, sorter: true },
  { id: 'joinDate', accessorKey: 'joinDate', header: '入职日期', width: 140, sorter: true },
];

// ── 分页配置 ──
const pagination = computed<STablePaginationProps>(() => ({
  current: serverState.page,
  pageSize: serverState.pageSize,
  total: total.value,
  showSizeChanger: true,
  showTotal: (t) => `共 ${t} 条`,
  onChange: (page: number, pageSize: number) => {
    serverState.page = page;
    serverState.pageSize = pageSize;
    fetchData();
  },
}));

// ── 事件处理 ──
const handleSortChange = ({
  columnId,
  order,
}: {
  columnId: string | null;
  order: STableSortOrder | null;
}) => {
  serverState.sortField = columnId;
  serverState.sortOrder = order;
  serverState.page = 1;
  fetchData();
};

const handleSearch = () => {
  serverState.page = 1;
  fetchData();
};

const handleFilterChange = ({
  filters,
  searches,
}: {
  filters: Record<string, (string | number | boolean)[]>;
  searches: Record<string, string>;
}) => {
  serverState.filters = filters;
  serverState.searches = searches;
  serverState.page = 1;
  fetchData();
};
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; font-weight: 600">服务端数据模式（过滤 + 排序 + 分页）</p>
    <p style="margin: 0 0 12px; font-size: 13px; color: #666">
      200 条数据，通过 <code>manual-pagination</code> / <code>manual-sorting</code> /
      <code>manual-filtering</code> 模式模拟服务端请求
    </p>

    <div style="margin-bottom: 12px; display: flex; gap: 8px; align-items: center">
      <input
        v-model="serverState.searchKeyword"
        placeholder="搜索姓名或部门"
        style="
          padding: 6px 12px;
          border: 1px solid #d9d9d9;
          border-radius: 6px;
          font-size: 14px;
          width: 240px;
        "
        @keyup.enter="handleSearch"
      />
      <button
        type="button"
        @click="handleSearch"
        style="
          padding: 6px 16px;
          color: #fff;
          background-color: #1677ff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        "
      >
        搜索
      </button>
      <span v-if="loading" style="color: #1677ff; font-size: 13px">加载中...</span>
    </div>

    <STable
      :columns="columns"
      :data-source="dataSource"
      :loading="loading"
      :pagination="pagination"
      :manual-pagination="true"
      :manual-sorting="true"
      :manual-filtering="true"
      row-key="id"
      style="height: 500px"
      @sort-change="handleSortChange"
      @filter-change="handleFilterChange"
    />
  </div>
</template>
