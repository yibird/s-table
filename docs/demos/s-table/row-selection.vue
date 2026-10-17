<script setup lang="ts">
/* eslint-disable no-console */
import { ref } from 'vue';
import STable, { type STableColumn, type STableRowSelection } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

// ── 基础数据 ──
const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'age', accessorKey: 'age', header: '年龄' },
  { id: 'department', accessorKey: 'department', header: '部门' },
];

const dataSource = generateEmployees(8);

// ══════════════════════════════════════════════════
// 示例 1：基础多选（非受控）
// ══════════════════════════════════════════════════
const basicSelection: STableRowSelection<Employee> = {
  type: 'checkbox',
};
const handleBasicSelectionChange = (keys: (string | number)[], rows: Employee[]) => {
  console.log('[Basic] selectedKeys:', keys, 'selectedRows:', rows);
};

// ══════════════════════════════════════════════════
// 示例 2：受控多选
// ══════════════════════════════════════════════════
const selectedKeys = ref<(string | number)[]>([2, 4]);

const controlledSelection: STableRowSelection<Employee> = {
  type: 'checkbox',
};

const clearSelection = () => {
  selectedKeys.value = [];
};

const selectAll = () => {
  selectedKeys.value = dataSource.map((d) => d.id);
};

// ══════════════════════════════════════════════════
// 示例 3：单选模式（Radio）
// ══════════════════════════════════════════════════
const radioSelection: STableRowSelection<Employee> = {
  type: 'radio',
};
const handleRadioSelectionChange = (keys: (string | number)[]) => {
  console.log('[Radio] selectedKeys:', keys);
};

// ══════════════════════════════════════════════════
// 示例 4：禁用部分行
// ══════════════════════════════════════════════════
const disabledSelection: STableRowSelection<Employee> = {
  type: 'checkbox',
  getCheckboxProps: (record) => ({
    disabled: record.id === 3 || record.id === 7,
  }),
};
const handleDisabledSelectionChange = (keys: (string | number)[]) => {
  console.log('[Disabled] selectedKeys:', keys);
};
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; font-weight: 600">1. 基础多选（非受控）</p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      :row-selection="basicSelection"
      row-key="id"
      style="height: 340px"
      @select-change="handleBasicSelectionChange"
    />

    <p style="margin: 24px 0 12px; font-weight: 600">
      2. 受控多选
      <span style="margin-left: 12px; font-weight: 400; font-size: 13px; color: #888">
        已选：{{ selectedKeys.join(', ') || '无' }}
      </span>
    </p>
    <div style="margin-bottom: 8px; display: flex; gap: 8px">
      <button
        type="button"
        @click="clearSelection"
        style="
          padding: 4px 12px;
          cursor: pointer;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          background: #fff;
        "
      >
        清空选择
      </button>
      <button
        type="button"
        @click="selectAll"
        style="
          padding: 4px 12px;
          cursor: pointer;
          border: 1px solid #1677ff;
          border-radius: 4px;
          background: #1677ff;
          color: #fff;
        "
      >
        全选
      </button>
    </div>
    <STable
      :columns="columns"
      :data-source="dataSource"
      :row-selection="controlledSelection"
      v-model:selected-row-keys="selectedKeys"
      row-key="id"
      style="height: 340px"
    />

    <p style="margin: 24px 0 12px; font-weight: 600">3. 单选模式（Radio）</p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      :row-selection="radioSelection"
      row-key="id"
      style="height: 340px"
      @select-change="handleRadioSelectionChange"
    />

    <p style="margin: 24px 0 12px; font-weight: 600">4. 禁用部分行（id=3 和 id=7 不可选）</p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      :row-selection="disabledSelection"
      row-key="id"
      style="height: 340px"
      @select-change="handleDisabledSelectionChange"
    />
  </div>
</template>
