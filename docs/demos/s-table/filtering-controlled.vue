<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import STable, { type STableColumn, type STableSortItem } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const dataSource = generateEmployees(12);
const sorting = ref<STableSortItem[]>([{ columnId: 'salary', order: 'descend' }]);
const departmentFilter = ref<(string | number | boolean)[]>([]);
const message = ref('排序与部门过滤都由父组件受控');

const columns = shallowRef<STableColumn<Employee>[]>([
  { id: 'id', accessorKey: 'id', header: 'ID', width: 90 },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  {
    id: 'department',
    accessorKey: 'department',
    header: '部门',
    filters: [
      { text: '技术部', value: '技术部' },
      { text: '产品部', value: '产品部' },
      { text: '设计部', value: '设计部' },
    ],
    filterMultiple: true,
    onFilter: (value, record) => record.department === value,
    filteredValue: [],
  },
  { id: 'salary', accessorKey: 'salary', header: '月薪', sorter: true, align: 'right' },
]);

const setDepartmentFilter = (values: string[]) => {
  departmentFilter.value = values;
  columns.value = columns.value.map((column) =>
    column.id === 'department' ? { ...column, filteredValue: values } : column
  );
  message.value = `受控 filteredValue：${values.join(', ') || '无'}`;
};

const setSorting = (next: STableSortItem[]) => {
  sorting.value = next;
  message.value = `受控 sorting：${JSON.stringify(next)}`;
};
</script>

<template>
  <div class="demo-shell">
    <div class="demo-toolbar">
      <button type="button" @click="setDepartmentFilter(['技术部'])">只看技术部</button>
      <button type="button" @click="setDepartmentFilter(['产品部', '设计部'])">
        产品部 + 设计部
      </button>
      <button type="button" @click="setDepartmentFilter([])">清除部门过滤</button>
      <button type="button" @click="setSorting([{ columnId: 'salary', order: 'ascend' }])">
        月薪升序
      </button>
      <button type="button" @click="setSorting([])">清除排序</button>
    </div>
    <p style="margin: 0 0 12px; color: #666; font-size: 13px">{{ message }}</p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      v-model:sorting="sorting"
      :multi-sort="true"
      row-key="id"
      @sort-change="
        (payload) => (message = `sortChange：${payload.columnId ?? '无'} ${payload.order ?? ''}`)
      "
      @filter-change="(payload) => (message = `filterChange：${JSON.stringify(payload.filters)}`)"
    />
  </div>
</template>

<style scoped>
.demo-shell {
  padding: 16px;
  border: 1px dashed #d9d9d9;
  border-radius: 12px;
}

.demo-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.demo-toolbar button {
  padding: 4px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}
</style>
