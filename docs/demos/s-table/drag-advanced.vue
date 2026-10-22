<script setup lang="ts">
import { h, ref } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 90, draggable: true },
  { id: 'name', accessorKey: 'name', header: '姓名', width: 140, draggable: true },
  { id: 'department', accessorKey: 'department', header: '部门', width: 140, draggable: true },
  { id: 'salary', accessorKey: 'salary', header: '月薪', width: 140 },
];

const dataSource = ref(generateEmployees(10));

const rowDrag = {
  trigger: 'row' as const,
  // 月薪低于 10000 的行禁止拖拽。
  canDrag: ({ record }: { record: Employee }) => record.salary >= 10000,
  ghost: ({ record }: { record: Employee }) =>
    h(
      'div',
      {
        style:
          'padding:8px 14px;background:#1677ff;color:#fff;border-radius:6px;font-size:13px;box-shadow:0 6px 16px rgba(0,0,0,.2)',
      },
      `移动：${record.name}`
    ),
};

const columnDrag = {
  ghost: ({ columnId }: { columnId: string }) =>
    h(
      'div',
      {
        style:
          'padding:6px 12px;background:#fff;border:1px solid #1677ff;color:#1677ff;border-radius:6px;font-size:12px',
      },
      `列：${columnId}`
    ),
};

const lastOrder = ref('');
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; color: #666">
      整行拖拽（按钮/输入框除外）；自定义行与列拖拽 ghost；月薪 &lt; 10000 的行不可拖。
    </p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      row-key="id"
      :row-drag="rowDrag"
      :column-drag="columnDrag"
      :pagination="false"
      @update:data-source="
        (rows: Employee[]) => (lastOrder = rows.map((row) => row.name).join(' → '))
      "
    />
    <p v-if="lastOrder" style="margin: 12px 0 0; color: #666">当前顺序：{{ lastOrder }}</p>
  </div>
</template>
