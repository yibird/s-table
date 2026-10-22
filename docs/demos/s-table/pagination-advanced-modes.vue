<script setup lang="ts">
import { h, shallowRef } from 'vue';
import STable, {
  type STableColumn,
  type STablePaginationItemRender,
  type STablePaginationItemType,
} from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 90 },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'department', accessorKey: 'department', header: '部门' },
];

const dataSource = generateEmployees(12);
const shortData = generateEmployees(3);
const currentPage = shallowRef(2);

const itemRender: STablePaginationItemRender = (
  page: number,
  type: STablePaginationItemType,
  originalElement
) => {
  if (type === 'prev') return h('span', { style: 'padding:0 6px' }, '上一页');
  if (type === 'next') return h('span', { style: 'padding:0 6px' }, '下一页');
  if (type === 'page') {
    return h(
      'span',
      {
        style: `display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;border-radius:6px;border:1px solid ${
          page === currentPage.value ? '#1677ff' : '#d9d9d9'
        };color:${page === currentPage.value ? '#1677ff' : '#333'}`,
      },
      String(page)
    );
  }
  return originalElement;
};
</script>

<template>
  <div class="demo-shell">
    <p style="margin: 0 0 8px; font-weight: 600">1. simple + hideOnSinglePage</p>
    <p style="margin: 0 0 12px; color: #666; font-size: 13px">
      简洁分页只保留上一页 / 下一页；数据只有一页时自动隐藏分页器。
    </p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      row-key="id"
      :pagination="{ simple: true, defaultPageSize: 5 }"
    />
    <STable
      :columns="columns"
      :data-source="shortData"
      row-key="id"
      style="margin-top: 12px"
      :pagination="{ hideOnSinglePage: true, defaultPageSize: 5 }"
    />

    <p style="margin: 24px 0 8px; font-weight: 600">2. 多位置 + 自定义条目</p>
    <p style="margin: 0 0 12px; color: #666; font-size: 13px">
      顶部右侧和底部居中各渲染一个分页器，按钮文案通过 itemRender 覆盖。
    </p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      row-key="id"
      :pagination="{
        current: currentPage,
        pageSize: 4,
        showTotal: (total) => `共 ${total} 条`,
        itemRender,
        onChange: (page) => (currentPage = page),
      }"
      :pagination-placement="['topEnd', 'bottomCenter']"
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
