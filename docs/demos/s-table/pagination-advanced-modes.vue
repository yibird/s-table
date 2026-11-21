<script setup lang="ts">
import { shallowRef } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 90 },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'department', accessorKey: 'department', header: '部门' },
];

const dataSource = generateEmployees(12);
const shortData = generateEmployees(3);
const currentPage = shallowRef(2);
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

    <p style="margin: 24px 0 8px; font-weight: 600">2. 多位置 + 受控分页</p>
    <p style="margin: 0 0 12px; color: #666; font-size: 13px">
      顶部右侧和底部居中各渲染一个分页器，共享受控页码并显示数据总量。
    </p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      row-key="id"
      :pagination="{
        current: currentPage,
        pageSize: 4,
        showTotal: (total) => `共 ${total} 条`,
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
