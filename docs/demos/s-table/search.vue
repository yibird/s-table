<script setup lang="ts">
import STable, { type STableColumn } from '../../../packages/vue/src';

interface Employee {
  id: number;
  name: string;
  age: number;
  salary: number;
  department: string;
  email: string;
}

const dataSource: Employee[] = [
  {
    id: 1,
    name: '张三',
    age: 28,
    salary: 15000,
    department: '技术部',
    email: 'zhangsan@example.com',
  },
  { id: 2, name: '李四', age: 35, salary: 22000, department: '产品部', email: 'lisi@example.com' },
  {
    id: 3,
    name: '王五',
    age: 24,
    salary: 12000,
    department: '技术部',
    email: 'wangwu@example.com',
  },
  {
    id: 4,
    name: '赵六',
    age: 30,
    salary: 18000,
    department: '设计部',
    email: 'zhaoliu@example.com',
  },
  {
    id: 5,
    name: '钱七',
    age: 27,
    salary: 20000,
    department: '技术部',
    email: 'qianqi@example.com',
  },
  { id: 6, name: '孙八', age: 32, salary: 25000, department: '产品部', email: 'sunba@example.com' },
  {
    id: 7,
    name: '周九',
    age: 26,
    salary: 14000,
    department: '设计部',
    email: 'zhoujiu@example.com',
  },
  { id: 8, name: '吴十', age: 29, salary: 16000, department: '技术部', email: 'wushi@example.com' },
  {
    id: 9,
    name: '郑小明',
    age: 31,
    salary: 19000,
    department: '产品部',
    email: 'zhengxm@example.com',
  },
  {
    id: 10,
    name: '陈大文',
    age: 25,
    salary: 13000,
    department: '设计部',
    email: 'chendw@example.com',
  },
];

// ══════════════════════════════════════════════════
// 示例 1：基础列搜索 — search: true 默认文本包含匹配
// ══════════════════════════════════════════════════
const basicColumns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  {
    id: 'name',
    accessorKey: 'name',
    header: '姓名',
    width: 140,
    search: true,
  },
  { id: 'age', accessorKey: 'age', header: '年龄', width: 80 },
  { id: 'salary', accessorKey: 'salary', header: '薪资', width: 120 },
  {
    id: 'department',
    accessorKey: 'department',
    header: '部门',
    width: 140,
    search: true,
  },
  { id: 'email', accessorKey: 'email', header: '邮箱', width: 240 },
];

// ══════════════════════════════════════════════════
// 示例 2：自定义搜索函数 — 支持多字段/复杂匹配
// ══════════════════════════════════════════════════
const customColumns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  {
    id: 'name',
    accessorKey: 'name',
    header: '姓名',
    width: 140,
    // 自定义搜索：同时匹配姓名和邮箱
    search: (value: string, record: Employee) => {
      const kw = value.toLowerCase();
      return record.name.toLowerCase().includes(kw) || record.email.toLowerCase().includes(kw);
    },
  },
  { id: 'age', accessorKey: 'age', header: '年龄', width: 80 },
  { id: 'salary', accessorKey: 'salary', header: '薪资', width: 120 },
  { id: 'department', accessorKey: 'department', header: '部门', width: 140 },
  { id: 'email', accessorKey: 'email', header: '邮箱', width: 240 },
];

// ══════════════════════════════════════════════════
// 示例 3：搜索 + 排序 + 过滤 联合使用
// ══════════════════════════════════════════════════
const combinedColumns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100, sorter: (a, b) => a.id - b.id },
  {
    id: 'name',
    accessorKey: 'name',
    header: '姓名',
    width: 140,
    search: true,
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
  {
    id: 'department',
    accessorKey: 'department',
    header: '部门',
    width: 140,
    search: true,
    filters: [
      { text: '技术部', value: '技术部' },
      { text: '产品部', value: '产品部' },
      { text: '设计部', value: '设计部' },
    ],
    onFilter: (value, record) => record.department === value,
  },
  { id: 'email', accessorKey: 'email', header: '邮箱', width: 240 },
];
</script>

<template>
  <div style="margin-bottom: 32px">
    <p style="font-weight: 600; margin: 0 0 8px">
      示例 1：基础列搜索（search: true，默认文本包含匹配）
    </p>
    <p style="color: rgba(0, 0, 0, 0.45); margin: 0 0 12px; font-size: 13px">
      姓名和部门列启用了搜索，点击搜索图标输入关键词，按 Enter 或点击搜索按钮过滤。
    </p>
    <STable bordered :columns="basicColumns" :data-source="dataSource" />
  </div>

  <div style="margin-bottom: 32px">
    <p style="font-weight: 600; margin: 0 0 8px">示例 2：自定义搜索函数（同时匹配姓名和邮箱）</p>
    <p style="color: rgba(0, 0, 0, 0.45); margin: 0 0 12px; font-size: 13px">
      在姓名列搜索时，同时匹配邮箱字段，例如搜索 "example" 会显示所有行。
    </p>
    <STable bordered :columns="customColumns" :data-source="dataSource" />
  </div>

  <div style="margin-bottom: 32px">
    <p style="font-weight: 600; margin: 0 0 8px">示例 3：搜索 + 排序 + 过滤 联合使用</p>
    <p style="color: rgba(0, 0, 0, 0.45); margin: 0 0 12px; font-size: 13px">
      姓名列同时支持搜索和排序，部门列同时支持搜索和过滤。数据管道顺序：搜索 → 过滤 → 排序。
    </p>
    <STable bordered :columns="combinedColumns" :data-source="dataSource" />
  </div>
</template>
