<script setup lang="ts">
import { ref } from 'vue';
import STable, { type STableColumn, type STableInstance } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'department', accessorKey: 'department', header: '部门' },
  { id: 'city', accessorKey: 'city', header: '城市' },
];

const dataSource = generateEmployees(30);
const tableRef = ref<STableInstance<Employee>>();
const rangeText = ref('');

const refresh = () => {
  const ranges = tableRef.value?.getCellRanges() ?? [];
  rangeText.value = ranges
    .map((range) => `[${range.startRow},${range.startCol}] → [${range.endRow},${range.endCol}]`)
    .join('；');
};

const selectAll = () => {
  tableRef.value?.getTanStackTable().selectAllCells();
  refresh();
};
const focusCell = () => {
  tableRef.value?.focusCell(0, 1);
  refresh();
};
const addRange = () => {
  tableRef.value?.addCellRange({ startRow: 2, startCol: 2, endRow: 3, endCol: 3 });
  refresh();
};
const clear = () => {
  tableRef.value?.clearCellRange();
  refresh();
};
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap">
      <button type="button" @click="selectAll">Ctrl+A 全选</button>
      <button type="button" @click="focusCell">聚焦 B1</button>
      <button type="button" @click="addRange">追加区间</button>
      <button type="button" @click="clear">清空</button>
    </div>
    <p style="margin: 0 0 12px; color: #666">
      聚焦单元格后可使用 Ctrl/Cmd+A、Shift+方向键；区间：{{ rangeText || '无' }}
    </p>
    <STable
      ref="tableRef"
      :columns="columns"
      :data-source="dataSource"
      row-key="id"
      :cell-range-selection="{ mode: 'cell' }"
      :pagination="false"
      style="max-height: 360px"
      @cell-range-change="refresh"
    />
  </div>
</template>
