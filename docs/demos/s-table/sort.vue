<script setup lang="ts">
import { ref } from 'vue';
import STable, { type STableColumn, type STablePaginationProps } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const dataSource: Employee[] = generateEmployees(8);

// ══════════════════════════════════════════════════
// 示例 1：基础排序 — 数字排序 + 字符串排序
// ══════════════════════════════════════════════════
const basicColumns: STableColumn<Employee>[] = [
  {
    id: 'id',
    accessorKey: 'id',
    header: 'ID',
    width: 100,
    sorter: (a, b) => a.id - b.id,
  },
  {
    id: 'name',
    accessorKey: 'name',
    header: '姓名',
    width: 120,
    sorter: (a, b) => a.name.localeCompare(b.name, 'zh-CN'),
  },
  {
    id: 'age',
    accessorKey: 'age',
    header: '年龄',
    width: 80,
    sorter: (a, b) => a.age - b.age,
  },
  {
    id: 'salary',
    accessorKey: 'salary',
    header: '薪资',
    width: 120,
    sorter: (a, b) => a.salary - b.salary,
  },
  { id: 'department', accessorKey: 'department', header: '部门', width: 120 },
  { id: 'joinDate', accessorKey: 'joinDate', header: '入职日期', width: 140 },
];

// ══════════════════════════════════════════════════
// 示例 2：默认排序 + 自定义排序方向
// ══════════════════════════════════════════════════
const advancedColumns: STableColumn<Employee>[] = [
  {
    id: 'id',
    accessorKey: 'id',
    header: 'ID',
    width: 100,
    sorter: (a, b) => a.id - b.id,
  },
  {
    id: 'name',
    accessorKey: 'name',
    header: '姓名',
    width: 120,
    sorter: (a, b) => a.name.localeCompare(b.name, 'zh-CN'),
  },
  {
    id: 'age',
    accessorKey: 'age',
    header: '年龄（默认升序）',
    width: 140,
    sorter: (a, b) => a.age - b.age,
    defaultSortOrder: 'ascend',
  },
  {
    id: 'salary',
    accessorKey: 'salary',
    header: '薪资（仅升序）',
    width: 160,
    sorter: (a, b) => a.salary - b.salary,
    sortDirections: ['ascend'],
  },
  { id: 'department', accessorKey: 'department', header: '部门', width: 120 },
  {
    id: 'joinDate',
    accessorKey: 'joinDate',
    header: '入职日期',
    width: 140,
    sorter: (a, b) => new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime(),
  },
];

// ══════════════════════════════════════════════════
// 示例 3：排序 + 分页联动
// ══════════════════════════════════════════════════
const largeDataSource: Employee[] = generateEmployees(50);

const paginationColumns: STableColumn<Employee>[] = [
  {
    id: 'id',
    accessorKey: 'id',
    header: 'ID',
    width: 100,
    sorter: (a, b) => a.id - b.id,
  },
  {
    id: 'name',
    accessorKey: 'name',
    header: '姓名',
    width: 120,
    sorter: (a, b) => a.name.localeCompare(b.name, 'zh-CN'),
  },
  {
    id: 'age',
    accessorKey: 'age',
    header: '年龄',
    width: 80,
    sorter: (a, b) => a.age - b.age,
  },
  {
    id: 'salary',
    accessorKey: 'salary',
    header: '薪资',
    width: 120,
    sorter: (a, b) => a.salary - b.salary,
  },
  { id: 'department', accessorKey: 'department', header: '部门', width: 120 },
  {
    id: 'joinDate',
    accessorKey: 'joinDate',
    header: '入职日期',
    width: 140,
    sorter: (a, b) => new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime(),
  },
];

const sortPagination = ref<STablePaginationProps>({
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 条`,
});
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px; margin-bottom: 24px">
    <p style="margin: 0 0 12px; font-weight: 600">1. 基础排序</p>
    <p style="margin: 0 0 12px; font-size: 13px; color: #666">
      点击表头排序：ID（数字）、姓名（中文拼音）、年龄（数字）、薪资（数字）
    </p>
    <STable :columns="basicColumns" :data-source="dataSource" style="height: 380px" />
  </div>

  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px; margin-bottom: 24px">
    <p style="margin: 0 0 12px; font-weight: 600">2. 默认排序 & 自定义排序方向</p>
    <p style="margin: 0 0 12px; font-size: 13px; color: #666">
      年龄列默认升序排列；薪资列仅支持升序（点击后直接回到无序）
    </p>
    <STable :columns="advancedColumns" :data-source="dataSource" style="height: 380px" />
  </div>

  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; font-weight: 600">3. 排序 + 分页联动</p>
    <p style="margin: 0 0 12px; font-size: 13px; color: #666">
      50 条数据，排序在当前页数据范围内生效
    </p>
    <STable
      :columns="paginationColumns"
      :data-source="largeDataSource"
      :pagination="sortPagination"
      style="height: 480px"
    />
  </div>
</template>
