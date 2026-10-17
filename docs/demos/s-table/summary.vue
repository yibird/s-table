<script setup lang="ts">
import { computed } from 'vue';
import STable, { SummaryRow, SummaryCell, type STableColumn } from '../../../packages/vue/src';

// ── 基础数据 ──
interface UserRecord {
  id: number;
  name: string;
  age: number;
  salary: number;
  department: string;
}

const dataSource: UserRecord[] = [
  { id: 1, name: '张三', age: 28, salary: 15000, department: '技术部' },
  { id: 2, name: '李四', age: 32, salary: 20000, department: '技术部' },
  { id: 3, name: '王五', age: 25, salary: 12000, department: '设计部' },
  { id: 4, name: '赵六', age: 30, salary: 18000, department: '产品部' },
  { id: 5, name: '孙七', age: 27, salary: 14000, department: '技术部' },
  { id: 6, name: '周八', age: 35, salary: 25000, department: '管理层' },
];

const columns: STableColumn<UserRecord>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  { id: 'name', accessorKey: 'name', header: '姓名', width: 160 },
  { id: 'age', accessorKey: 'age', header: '年龄', width: 120 },
  { id: 'salary', accessorKey: 'salary', header: '薪资', width: 200 },
  { id: 'department', accessorKey: 'department', header: '部门', width: 240 },
];

// ══════════════════════════════════════════════════
// 示例 1：基础汇总
// ══════════════════════════════════════════════════
const totalSalary = computed(() => dataSource.reduce((s, r) => s + r.salary, 0));
const avgAge = computed(() =>
  (dataSource.reduce((s, r) => s + r.age, 0) / dataSource.length).toFixed(1)
);

// ══════════════════════════════════════════════════
// 示例 2：多行汇总 + colSpan
// ══════════════════════════════════════════════════
const deptStats = computed(() => {
  const map = new Map<string, { count: number; salary: number }>();
  dataSource.forEach((r) => {
    const cur = map.get(r.department) ?? { count: 0, salary: 0 };
    cur.count++;
    cur.salary += r.salary;
    map.set(r.department, cur);
  });
  return map;
});

// ══════════════════════════════════════════════════
// 示例 3：固定列 + 汇总
// ══════════════════════════════════════════════════
const fixedColumns: STableColumn<UserRecord>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100, fixed: 'left' },
  { id: 'name', accessorKey: 'name', header: '姓名', width: 160, fixed: 'left' },
  { id: 'age', accessorKey: 'age', header: '年龄', width: 120 },
  { id: 'salary', accessorKey: 'salary', header: '薪资', width: 200 },
  { id: 'department', accessorKey: 'department', header: '部门', width: 300 },
];

// ══════════════════════════════════════════════════
// 示例 4：Summary + Footer 同时使用
// ══════════════════════════════════════════════════
const footerColumns: STableColumn<UserRecord>[] = [...columns];
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; font-weight: 600">1. 基础汇总行</p>
    <p style="margin: 0 0 8px; font-size: 13px; color: #666">
      通过 <code>#summary</code> 插槽渲染 <code>&lt;tfoot&gt;</code> 汇总行，使用
      <code>SummaryRow</code> + <code>SummaryCell</code> 构建布局。
    </p>
    <STable :columns="columns" :data-source="dataSource" row-key="id" bordered>
      <template #summary>
        <SummaryRow>
          <SummaryCell :index="0">合计</SummaryCell>
          <SummaryCell :index="1">—</SummaryCell>
          <SummaryCell :index="2" align="center">平均 {{ avgAge }}</SummaryCell>
          <SummaryCell :index="3" align="right">¥{{ totalSalary.toLocaleString() }}</SummaryCell>
          <SummaryCell :index="4">共 {{ dataSource.length }} 人</SummaryCell>
        </SummaryRow>
      </template>
    </STable>

    <p style="margin: 32px 0 12px; font-weight: 600">2. 多行汇总 + colSpan</p>
    <p style="margin: 0 0 8px; font-size: 13px; color: #666">
      使用多行 <code>SummaryRow</code> 和 <code>colSpan</code> 实现跨列合并。
    </p>
    <STable :columns="columns" :data-source="dataSource" row-key="id" bordered>
      <template #summary>
        <SummaryRow>
          <SummaryCell :index="0" :col-span="2">总计（{{ dataSource.length }} 人）</SummaryCell>
          <SummaryCell :index="2" align="center">平均年龄 {{ avgAge }}</SummaryCell>
          <SummaryCell :index="3" align="right"
            >总薪资 ¥{{ totalSalary.toLocaleString() }}</SummaryCell
          >
          <SummaryCell :index="4" align="right"
            >平均薪资 ¥{{
              Math.round(totalSalary / dataSource.length).toLocaleString()
            }}</SummaryCell
          >
        </SummaryRow>
        <SummaryRow v-for="[dept, stat] in deptStats" :key="dept">
          <SummaryCell :index="0" :col-span="2">{{ dept }}（{{ stat.count }} 人）</SummaryCell>
          <SummaryCell :index="2">—</SummaryCell>
          <SummaryCell :index="3" align="right">¥{{ stat.salary.toLocaleString() }}</SummaryCell>
          <SummaryCell :index="4" align="right"
            >¥{{ Math.round(stat.salary / stat.count).toLocaleString() }}</SummaryCell
          >
        </SummaryRow>
      </template>
    </STable>

    <p style="margin: 32px 0 12px; font-weight: 600">3. 固定列 + 汇总</p>
    <p style="margin: 0 0 8px; font-size: 13px; color: #666">
      汇总行中的单元格支持固定列的 sticky 定位，滚动时保持可见。
    </p>
    <STable :columns="fixedColumns" :data-source="dataSource" row-key="id" bordered>
      <template #summary>
        <SummaryRow>
          <SummaryCell :index="0" column-id="id">合计</SummaryCell>
          <SummaryCell :index="1" column-id="name">—</SummaryCell>
          <SummaryCell :index="2" align="center">平均 {{ avgAge }}</SummaryCell>
          <SummaryCell :index="3" align="right">¥{{ totalSalary.toLocaleString() }}</SummaryCell>
          <SummaryCell :index="4">{{ dataSource.length }} 个部门</SummaryCell>
        </SummaryRow>
      </template>
    </STable>

    <p style="margin: 32px 0 12px; font-weight: 600">4. Summary + Footer 同时使用</p>
    <p style="margin: 0 0 8px; font-size: 13px; color: #666">
      <code>#summary</code>（tfoot 汇总行）和
      <code>#footer</code>（通用内容区）可以同时存在，各负其责。
    </p>
    <STable
      :columns="footerColumns"
      :data-source="dataSource"
      :show-footer="true"
      row-key="id"
      bordered
    >
      <template #summary>
        <SummaryRow>
          <SummaryCell :index="0">合计</SummaryCell>
          <SummaryCell :index="1">—</SummaryCell>
          <SummaryCell :index="2" align="center">{{ avgAge }}</SummaryCell>
          <SummaryCell :index="3" align="right">¥{{ totalSalary.toLocaleString() }}</SummaryCell>
          <SummaryCell :index="4">{{ deptStats.size }} 个部门</SummaryCell>
        </SummaryRow>
      </template>
      <template #footer>
        <div
          style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
          "
        >
          <span style="color: rgba(0, 0, 0, 0.45)">数据更新时间：2026-07-01</span>
          <span
            >共 <strong>{{ dataSource.length }}</strong> 条记录</span
          >
        </div>
      </template>
    </STable>
  </div>
</template>
