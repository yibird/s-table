<script setup lang="ts">
import STable, { type STableColumn, type STableCellProps } from '../../../packages/vue/src';

// ══════════════════════════════════════════════════
// 示例 1：分组表头（多级列嵌套）
// ══════════════════════════════════════════════════
interface Employee {
  id: number;
  name: string;
  age: number;
  salary: number;
  bonus: number;
  department: string;
  city: string;
}

const groupedColumns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  {
    id: 'basicInfo',
    header: '基本信息',
    columns: [
      { id: 'name', accessorKey: 'name', header: '姓名', width: 120 },
      { id: 'age', accessorKey: 'age', header: '年龄', width: 80 },
    ],
  },
  {
    id: 'compensation',
    header: '薪酬',
    columns: [
      { id: 'salary', accessorKey: 'salary', header: '月薪', width: 120 },
      { id: 'bonus', accessorKey: 'bonus', header: '奖金', width: 120 },
    ],
  },
  {
    id: 'location',
    header: '归属',
    columns: [
      { id: 'department', accessorKey: 'department', header: '部门', width: 120 },
      { id: 'city', accessorKey: 'city', header: '城市', width: 120 },
    ],
  },
];

const employees: Employee[] = [
  { id: 1, name: '张三', age: 28, salary: 15000, bonus: 5000, department: '技术部', city: '杭州' },
  { id: 2, name: '李四', age: 35, salary: 22000, bonus: 8000, department: '产品部', city: '北京' },
  { id: 3, name: '王五', age: 24, salary: 12000, bonus: 3000, department: '技术部', city: '杭州' },
  { id: 4, name: '赵六', age: 30, salary: 18000, bonus: 6000, department: '设计部', city: '上海' },
  { id: 5, name: '钱七', age: 27, salary: 20000, bonus: 7000, department: '技术部', city: '深圳' },
];

// ══════════════════════════════════════════════════
// 示例 2：三级分组表头
// ══════════════════════════════════════════════════
interface Student {
  id: number;
  name: string;
  chinese: number;
  math: number;
  english: number;
  physics: number;
  chemistry: number;
}

const deepGroupedColumns: STableColumn<Student>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  { id: 'name', accessorKey: 'name', header: '姓名', width: 100 },
  {
    id: 'scores',
    header: '成绩',
    columns: [
      {
        id: 'liberalArts',
        header: '文科',
        columns: [
          { id: 'chinese', accessorKey: 'chinese', header: '语文', width: 80 },
          { id: 'english', accessorKey: 'english', header: '英语', width: 80 },
        ],
      },
      {
        id: 'science',
        header: '理科',
        columns: [
          { id: 'math', accessorKey: 'math', header: '数学', width: 80 },
          { id: 'physics', accessorKey: 'physics', header: '物理', width: 80 },
          { id: 'chemistry', accessorKey: 'chemistry', header: '化学', width: 80 },
        ],
      },
    ],
  },
];

const students: Student[] = [
  { id: 1, name: '小明', chinese: 92, math: 88, english: 85, physics: 90, chemistry: 78 },
  { id: 2, name: '小红', chinese: 88, math: 95, english: 92, physics: 85, chemistry: 90 },
  { id: 3, name: '小刚', chinese: 76, math: 82, english: 78, physics: 88, chemistry: 95 },
  { id: 4, name: '小美', chinese: 95, math: 70, english: 96, physics: 72, chemistry: 80 },
];

// ══════════════════════════════════════════════════
// 示例 3：合并单元格（colSpan + rowSpan）
// ══════════════════════════════════════════════════
interface MergeData {
  id: number;
  name: string;
  department: string;
  role: string;
  status: string;
}

const mergeColumns: STableColumn<MergeData>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  {
    id: 'name',
    accessorKey: 'name',
    header: '姓名',
    width: 120,
    // 按部门合并行：同部门的第一行 rowSpan=N，其余行 rowSpan=0
    onCell: (record: MergeData, rowIndex: number): STableCellProps => {
      if (record.department === '技术部') {
        // 技术部有 3 人，第一行合并 3 行
        if (rowIndex === 0) return { rowSpan: 3 };
        if (rowIndex === 1 || rowIndex === 2) return { rowSpan: 0 };
      }
      return {};
    },
  },
  {
    id: 'department',
    accessorKey: 'department',
    header: '部门',
    width: 120,
    onCell: (record: MergeData, rowIndex: number): STableCellProps => {
      if (record.department === '技术部') {
        if (rowIndex === 0) return { rowSpan: 3 };
        if (rowIndex === 1 || rowIndex === 2) return { rowSpan: 0 };
      }
      return {};
    },
  },
  { id: 'role', accessorKey: 'role', header: '职位', width: 140 },
  { id: 'status', accessorKey: 'status', header: '状态', width: 100 },
];

const mergeData: MergeData[] = [
  { id: 1, name: '张三', department: '技术部', role: '前端工程师', status: '在职' },
  { id: 2, name: '王五', department: '技术部', role: '后端工程师', status: '在职' },
  { id: 3, name: '钱七', department: '技术部', role: '全栈工程师', status: '在职' },
  { id: 4, name: '李四', department: '产品部', role: '产品经理', status: '在职' },
  { id: 5, name: '赵六', department: '设计部', role: 'UI 设计师', status: '休假中' },
];

// ══════════════════════════════════════════════════
// 示例 4：列合并（colSpan）
// ══════════════════════════════════════════════════
interface ReportData {
  id: number;
  quarter: string;
  revenue: number;
  cost: number;
  profit: number;
}

const colSpanColumns: STableColumn<ReportData>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  { id: 'quarter', accessorKey: 'quarter', header: '季度', width: 100 },
  {
    id: 'revenue',
    accessorKey: 'revenue',
    header: '收入',
    width: 120,
    // 第一行跨 3 列合并显示总收入
    onCell: (_record: ReportData, rowIndex: number): STableCellProps => {
      if (rowIndex === 0) return { colSpan: 3 };
      return {};
    },
  },
  {
    id: 'cost',
    accessorKey: 'cost',
    header: '成本',
    width: 120,
    // 第一行被 revenue 的 colSpan 合并覆盖
    onCell: (_record: ReportData, rowIndex: number): STableCellProps => {
      if (rowIndex === 0) return { colSpan: 0 };
      return {};
    },
  },
  {
    id: 'profit',
    accessorKey: 'profit',
    header: '利润',
    width: 120,
    onCell: (_record: ReportData, rowIndex: number): STableCellProps => {
      if (rowIndex === 0) return { colSpan: 0 };
      return {};
    },
  },
];

const reportData: ReportData[] = [
  { id: 1, quarter: '全年合计', revenue: 500000, cost: 320000, profit: 180000 },
  { id: 2, quarter: 'Q1', revenue: 100000, cost: 75000, profit: 25000 },
  { id: 3, quarter: 'Q2', revenue: 120000, cost: 80000, profit: 40000 },
  { id: 4, quarter: 'Q3', revenue: 130000, cost: 82000, profit: 48000 },
  { id: 5, quarter: 'Q4', revenue: 150000, cost: 83000, profit: 67000 },
];
</script>

<template>
  <div style="margin-bottom: 32px">
    <p style="font-weight: 600; margin: 0 0 8px">示例 1：二级分组表头</p>
    <p style="color: rgba(0, 0, 0, 0.45); margin: 0 0 12px; font-size: 13px">
      通过列配置的 <code>columns</code> 属性嵌套子列，父级列头自动跨列合并。
    </p>
    <STable bordered :columns="groupedColumns" :data-source="employees" />
  </div>

  <div style="margin-bottom: 32px">
    <p style="font-weight: 600; margin: 0 0 8px">示例 2：三级分组表头</p>
    <p style="color: rgba(0, 0, 0, 0.45); margin: 0 0 12px; font-size: 13px">
      支持多层嵌套，非叶子列头自动计算 colSpan 和 rowSpan。
    </p>
    <STable bordered :columns="deepGroupedColumns" :data-source="students" />
  </div>

  <div style="margin-bottom: 32px">
    <p style="font-weight: 600; margin: 0 0 8px">示例 3：合并行（onCell + rowSpan）</p>
    <p style="color: rgba(0, 0, 0, 0.45); margin: 0 0 12px; font-size: 13px">
      技术部的 3 行在"姓名"和"部门"列通过 <code>onCell</code> 返回
      <code>rowSpan: 3</code> 合并，其余行返回 <code>rowSpan: 0</code> 隐藏。
    </p>
    <STable bordered :columns="mergeColumns" :data-source="mergeData" />
  </div>

  <div style="margin-bottom: 32px">
    <p style="font-weight: 600; margin: 0 0 8px">示例 4：合并列（onCell + colSpan）</p>
    <p style="color: rgba(0, 0, 0, 0.45); margin: 0 0 12px; font-size: 13px">
      第一行"收入"列通过 <code>colSpan: 3</code> 横跨 3 列，"成本"和"利润"列返回
      <code>colSpan: 0</code> 隐藏。
    </p>
    <STable bordered :columns="colSpanColumns" :data-source="reportData" />
  </div>
</template>
