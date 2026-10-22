<script setup lang="ts">
import { h, ref } from 'vue';
import STable, { type STableColumn, type STableRowSelection } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const dataSource = generateEmployees(6);
const selectedKeys = ref<(string | number)[]>([]);

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 90 },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'department', accessorKey: 'department', header: '部门' },
];

const rowSelection: STableRowSelection<Employee> = {
  type: 'radio',
  allowCancelRadio: true,
  hideSelectAll: true,
  columnTitle: ({ selectedRows }) =>
    h(
      'span',
      { style: 'font-size: 12px;color:#888' },
      selectedRows.length ? `${selectedRows.length}` : '—'
    ),
  getCheckboxProps: (record) => ({ disabled: record.id === 3 }),
  renderCell: (checked, record, _index, originNode) =>
    h('span', { style: 'display:inline-flex;align-items:center;gap:6px' }, [
      originNode,
      checked ? h('span', { style: 'font-size:11px;color:#1677ff' }, record.id) : null,
    ]),
};
</script>

<template>
  <div class="demo-shell">
    <p style="margin: 0 0 12px; color: #666; font-size: 13px">
      单选列：隐藏全选，ID 3 禁用，已选中项可再次点击取消；选择列使用自定义单元格渲染。 当前选中：{{
        selectedKeys.join(', ') || '无'
      }}
    </p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      :row-selection="rowSelection"
      v-model:selected-row-keys="selectedKeys"
      row-key="id"
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
