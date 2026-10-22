<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import STable, {
  type STableColumn,
  type STableInstance,
  type STableRowSelection,
  type STableSelectionIntent,
} from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const dataSource = generateEmployees(26);
const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 90 },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'department', accessorKey: 'department', header: '部门' },
];

const intent = ref<STableSelectionIntent>({ mode: 'include', includedRowKeys: [] });
const tableRef = useTemplateRef<STableInstance<Employee>>('tableRef');

const rowSelection: STableRowSelection<Employee> = {
  strategy: 'intent',
  type: 'checkbox',
};

const summary = computed(() =>
  intent.value.mode === 'all'
    ? `全选（排除 ${intent.value.excludedRowKeys.length} 行）`
    : `显式选中 ${intent.value.includedRowKeys.length} 行`
);

const selectAllLoaded = () => {
  intent.value = { mode: 'all', excludedRowKeys: [] };
};
const selectFirstThree = () => {
  intent.value = { mode: 'include', includedRowKeys: [1, 2, 3] };
};
const excludeSome = () => {
  intent.value = { mode: 'all', excludedRowKeys: [2, 4] };
};
const clear = () => {
  intent.value = { mode: 'include', includedRowKeys: [] };
};
const snapshot = ref('');
const logSnapshot = () => {
  const instance = tableRef.value;
  snapshot.value = `intent=${JSON.stringify(instance?.getSelectionIntent())}；当前已加载选中 ${
    instance?.getSelectedRows().length ?? 0
  } 行`;
};
</script>

<template>
  <div class="demo-shell">
    <div class="demo-toolbar">
      <button type="button" @click="selectAllLoaded">全选</button>
      <button type="button" @click="selectFirstThree">选中前 3 行</button>
      <button type="button" @click="excludeSome">全选并排除 2/4</button>
      <button type="button" @click="clear">清空</button>
      <button type="button" @click="logSnapshot">打印快照</button>
    </div>
    <p style="margin: 0 0 6px; color: #666; font-size: 13px">
      {{ summary }}；intent 模式不会物化全量 key，只有当前已加载行能解析为记录。
    </p>
    <p v-if="snapshot" style="margin: 0 0 12px; color: #0958d9; font-size: 12px">{{ snapshot }}</p>
    <STable
      ref="tableRef"
      :columns="columns"
      :data-source="dataSource"
      :row-selection="rowSelection"
      v-model:selection-intent="intent"
      row-key="id"
      :pagination="{ defaultPageSize: 5 }"
      style="height: 420px"
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
