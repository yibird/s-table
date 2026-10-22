<script setup lang="ts">
import { h, ref } from 'vue';
import STable, { type STableColumn, type STableExpandable } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const dataSource = generateEmployees(6);
const expandedRowKeys = ref<(string | number)[]>([1]);

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 90 },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'department', accessorKey: 'department', header: '部门' },
  { id: 'email', accessorKey: 'email', header: '邮箱' },
];

const expandable: STableExpandable<Employee> = {
  multiple: false,
  expandFixed: 'right',
  expandIconColumnIndex: 1,
  isRowExpandable: (record) => record.id !== 2,
  expandIcon: ({ expanded, expandable, toggle, record }) =>
    h(
      'button',
      {
        type: 'button',
        disabled: !expandable,
        'aria-label': `${expanded ? '收起' : '展开'} ${record.name}`,
        style:
          'width:20px;height:20px;border:1px solid #d9d9d9;border-radius:4px;background:#fff;cursor:pointer;',
        onClick: toggle,
      },
      expanded ? '−' : '+'
    ),
};
</script>

<template>
  <div class="demo-shell">
    <p style="margin: 0 0 12px; color: #666; font-size: 13px">
      单行展开、展开列固定在右侧、自定义图标，且 ID 2 不可展开。
    </p>
    <STable
      v-model:expanded-row-keys="expandedRowKeys"
      :columns="columns"
      :data-source="dataSource"
      :expandable="expandable"
      row-key="id"
      expand-row-by-click
      bordered
    >
      <template #expandedRowRender="{ record }">
        <div style="padding: 12px; background: #fafafa">
          <strong>{{ record.name }}</strong>
          <span style="margin-left: 12px; color: #666">
            {{ record.department }} · {{ record.email }} · 月薪 {{ record.salary }}
          </span>
        </div>
      </template>
    </STable>
  </div>
</template>

<style scoped>
.demo-shell {
  padding: 16px;
  border: 1px dashed #d9d9d9;
  border-radius: 12px;
}
</style>
