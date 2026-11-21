<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import STable, { type STableColumn, type STableInstance } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 80 },
  { id: 'name', accessorKey: 'name', header: '姓名', draggable: true },
  { id: 'department', accessorKey: 'department', header: '部门', draggable: true },
  { id: 'salary', accessorKey: 'salary', header: '月薪', align: 'right', draggable: true },
];

const dataSource = shallowRef(generateEmployees(8));
const tableRef = ref<STableInstance<Employee>>();
const order = ref('id, name, department, salary');

const syncOrder = () => {
  order.value = (tableRef.value?.getColumnOrder() ?? []).join(', ');
};

const swap = () => {
  tableRef.value?.swapColumns('name', 'department');
  syncOrder();
};

const moveToFront = () => {
  tableRef.value?.moveColumnByIndex(2, 0);
  syncOrder();
};

const reset = () => {
  tableRef.value?.resetColumnOrder();
  syncOrder();
};
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px">
      <button type="button" @click="swap">交换姓名 / 部门</button>
      <button type="button" @click="moveToFront">部门移到最前</button>
      <button type="button" @click="reset">恢复声明顺序</button>
    </div>
    <p style="margin: 0 0 12px; color: #666; font-size: 13px">
      当前列顺序：{{ order }}（也可直接拖拽表头调整）
    </p>
    <STable
      ref="tableRef"
      :columns="columns"
      :data-source="dataSource"
      :column-drag="{ animation: true }"
      row-key="id"
      bordered
    />
  </div>
</template>
