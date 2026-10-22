<script setup lang="ts">
import { ref, shallowRef, useTemplateRef } from 'vue';
import STable, {
  type STableCellRange,
  type STableColumn,
  type STableInstance,
  type STableRowSelection,
} from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const dataSource = generateEmployees(12);
const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 90 },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'department', accessorKey: 'department', header: '部门' },
  { id: 'salary', accessorKey: 'salary', header: '月薪', align: 'right' },
];

const selectedKeys = ref<(string | number)[]>([3, 4]);
const selectedRecords = shallowRef<Employee[]>([]);
const ranges = shallowRef<STableCellRange[]>([]);
const tableRef = useTemplateRef<STableInstance<Employee>>('tableRef');

const rowSelection: STableRowSelection<Employee> = { type: 'checkbox' };

const syncRanges = () => {
  ranges.value = tableRef.value?.getCellRanges() ?? [];
};

const selectRows = () => {
  tableRef.value?.setCellRange({ startRow: 1, startCol: 0, endRow: 3, endCol: 2 });
  syncRanges();
};

const addRange = () => {
  tableRef.value?.addCellRange(
    { startRow: 6, startCol: 0, endRow: 7, endCol: 1 },
    { mode: 'include' }
  );
  syncRanges();
};

const clear = () => {
  tableRef.value?.clearCellRange();
  syncRanges();
};

const onRangeSelect = (_range: STableCellRange, records: Employee[]) => {
  selectedRecords.value = records;
};
</script>

<template>
  <div class="demo-shell">
    <div class="demo-toolbar">
      <button type="button" @click="selectRows">setCellRange（1–3 行）</button>
      <button type="button" @click="addRange">addCellRange（6–7 行）</button>
      <button type="button" @click="clear">清空范围</button>
      <span style="color: #666; font-size: 13px">
        区间数：{{ ranges.length }}；勾选 {{ selectedKeys.length }} 行；最近涉及
        {{ selectedRecords.length }} 行
      </span>
    </div>
    <STable
      ref="tableRef"
      :columns="columns"
      :data-source="dataSource"
      :row-selection="rowSelection"
      v-model:selected-row-keys="selectedKeys"
      :cell-range-selection="{ mode: 'row', selectRowOnClick: true }"
      row-key="id"
      bordered
      @cell-range-select="onRangeSelect"
      @cell-range-change="syncRanges"
    />
  </div>
</template>

<style scoped>
.demo-shell {
  padding: 16px;
  border: 1px dashed #d9d9d9;
  border-radius: 12px;
}

.demo-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.demo-toolbar button {
  padding: 4px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}
</style>
