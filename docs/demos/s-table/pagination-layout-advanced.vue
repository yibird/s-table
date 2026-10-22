<script setup lang="ts">
import { ref } from 'vue';
import STable, { type STableColumn, type STablePaginationProps } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'department', accessorKey: 'department', header: '部门' },
  { id: 'salary', accessorKey: 'salary', header: '月薪', footer: '月薪合计' },
];

const dataSource = generateEmployees(46);

const pagination = ref<STablePaginationProps>({
  defaultPageSize: 10,
  showSizeChanger: true,
  simple: false,
  showLessItems: true,
  itemRender: (page, type, element) => {
    if (type === 'page' && page === 2) {
      return '②';
    }
    return element;
  },
});
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <STable
      :columns="columns"
      :data-source="dataSource"
      row-key="id"
      :pagination="pagination"
      :pagination-placement="['topEnd', 'bottomStart']"
      :title="({ currentPageData }) => `员工列表（当前页 ${currentPageData.length} 人）`"
      :footer="
        ({ currentPage, pageSize, total }) =>
          `第 ${currentPage} 页 · 每页 ${pageSize} 条 · 共 ${total} 条`
      "
      summary-fixed
      style="max-height: 420px"
    />
  </div>
</template>
