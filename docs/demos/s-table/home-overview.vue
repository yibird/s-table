<script setup lang="ts">
import { h, ref, shallowRef } from 'vue';
import { useData } from 'vitepress';
import STable, {
  type STableColumn,
  type STableInstance,
  type STableRowKey,
} from '../../../packages/vue/src';
import { DEPARTMENTS, generateEmployees, type Employee } from '../shared';

const { isDark } = useData();
const tableRef = ref<STableInstance<Employee>>();
const dataSource = shallowRef(generateEmployees(53));
const selectedKeys = ref<STableRowKey[]>([]);
const loading = ref(false);
const size = ref<'small' | 'middle' | 'large'>('middle');
const message = ref('双击姓名 / 月薪单元格编辑；表头支持排序、筛选和搜索。');

const toggleTheme = () => {
  isDark.value = !isDark.value;
};

const rowSelection = { type: 'checkbox' as const };
const rowDrag = { animation: true };
const columnDrag = { animation: true };

const departmentTag = (department: string) =>
  h(
    'span',
    {
      style:
        'display:inline-flex;align-items:center;gap:6px;padding:1px 8px;border-radius:999px;background:color-mix(in srgb, var(--s-primary-color) 12%, transparent);color:var(--s-primary-color);font-size:12px;',
    },
    [
      h('span', {
        style: 'width:6px;height:6px;border-radius:50%;background:currentColor;flex:none;',
      }),
      department,
    ]
  );

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 72 },
  {
    id: 'name',
    accessorKey: 'name',
    header: '姓名',
    width: 150,
    fixed: 'left',
    sorter: true,
    search: true,
    editable: true,
    resizable: true,
    draggable: true,
    valueParser: (value) => String(value).trim(),
  },
  {
    id: 'department',
    accessorKey: 'department',
    header: '部门',
    width: 130,
    sorter: true,
    draggable: true,
    filters: DEPARTMENTS.map((department) => ({ text: department, value: department })),
    onFilter: (value, record) => record.department === value,
    cell: ({ row }) => departmentTag(row.original.department),
  },
  { id: 'age', accessorKey: 'age', header: '年龄', width: 90, align: 'center', sorter: true },
  {
    id: 'salary',
    accessorKey: 'salary',
    header: '月薪',
    width: 130,
    align: 'right',
    sorter: true,
    editable: true,
    editor: 'number',
    cell: ({ getValue }) => `¥${Number(getValue()).toLocaleString()}`,
    valueParser: (value) => Number(value),
  },
  { id: 'city', accessorKey: 'city', header: '城市', width: 110, draggable: true },
  { id: 'joinDate', accessorKey: 'joinDate', header: '入职日期', width: 130 },
];

const toggleLoading = () => {
  loading.value = !loading.value;
  message.value = loading.value ? '正在加载数据…' : '数据加载完成';
};

const exportCurrentPage = () => {
  tableRef.value?.exportCsv({
    dataSource: 'currentPage',
    filename: 'employees-current-page.csv',
    download: true,
  });
  message.value = '已导出当前页 CSV';
};

const resetQuery = () => {
  tableRef.value?.resetSort();
  tableRef.value?.resetFilter();
  tableRef.value?.resetSearch();
  message.value = '已重置排序、筛选与搜索';
};

const exportAll = () => {
  const rows = tableRef.value?.getAllData() ?? [];
  message.value = `全部数据共 ${rows.length} 行，可通过 getAllData() 交给 xlsx 等工具库`;
};
</script>

<template>
  <div class="home-table-demo">
    <div class="home-table-demo__toolbar">
      <button type="button" @click="toggleLoading">{{ loading ? '结束加载' : '模拟加载' }}</button>
      <button type="button" @click="resetQuery">重置查询</button>
      <button type="button" @click="exportCurrentPage">导出当前页</button>
      <button type="button" @click="exportAll">读取全部数据</button>
      <button type="button" @click="toggleTheme">
        {{ isDark ? '切换浅色' : '切换暗色' }}
      </button>
      <label class="home-table-demo__size">
        尺寸
        <select v-model="size">
          <option value="small">紧凑</option>
          <option value="middle">标准</option>
          <option value="large">宽松</option>
        </select>
      </label>
      <span class="home-table-demo__status">已选 {{ selectedKeys.length }} 行</span>
    </div>

    <p class="home-table-demo__hint">{{ message }}</p>

    <STable
      ref="tableRef"
      v-model:data-source="dataSource"
      v-model:selected-row-keys="selectedKeys"
      :columns="columns"
      :row-selection="rowSelection"
      :row-drag="rowDrag"
      :column-drag="columnDrag"
      :pagination="{ defaultPageSize: 8 }"
      :seq="{ title: 'No.', columnWidth: 72 }"
      :loading="loading"
      :size="size"
      row-key="id"
      bordered
      striped
      style="max-height: 520px"
    />
  </div>
</template>

<style scoped>
.home-table-demo {
  margin-top: 8px;
  padding: 16px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 12px;
  background-color: var(--vp-c-bg);
}

.home-table-demo__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.home-table-demo__toolbar button {
  padding: 5px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 13px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s;
}

.home-table-demo__toolbar button:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.home-table-demo__size {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.home-table-demo__size select {
  padding: 4px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 13px;
}

.home-table-demo__status {
  margin-left: auto;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.home-table-demo__hint {
  margin: 0 0 12px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}
</style>
