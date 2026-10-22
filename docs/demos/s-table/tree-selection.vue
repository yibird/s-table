<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import STable, {
  type STableColumn,
  type STableInstance,
  type STableRowSelection,
} from '../../../packages/vue/src';

interface Node {
  id: number;
  name: string;
  owner: string;
  children?: Node[];
}

const dataSource: Node[] = [
  {
    id: 1,
    name: '版本 2.0',
    owner: 'Ada',
    children: [
      { id: 11, name: '接口冻结', owner: 'Grace' },
      { id: 12, name: '回归测试', owner: 'Lin' },
    ],
  },
  {
    id: 2,
    name: '文档发布',
    owner: 'Mia',
    children: [{ id: 21, name: 'API 校对', owner: 'Ken' }],
  },
  { id: 3, name: '灰度上线', owner: 'Zoe' },
];

const columns: STableColumn<Node>[] = [
  { id: 'name', accessorKey: 'name', header: '任务' },
  { id: 'owner', accessorKey: 'owner', header: '负责人' },
];

const selectedKeys = ref<(string | number)[]>([]);
const strict = ref(false);
const tableRef = useTemplateRef<STableInstance<Node>>('tableRef');

const rowSelection = computed<STableRowSelection<Node>>(() => ({
  type: 'checkbox',
  checkStrictly: strict.value,
}));
</script>

<template>
  <div class="demo-shell">
    <div class="demo-toolbar">
      <label style="display: inline-flex; gap: 6px; align-items: center">
        <input v-model="strict" type="checkbox" />
        checkStrictly（父子不联动）
      </label>
      <button type="button" @click="tableRef?.expandAll()">全部展开</button>
      <button type="button" @click="tableRef?.collapseAll()">全部收起</button>
      <span style="color: #666; font-size: 13px">已选：{{ selectedKeys.join(', ') || '无' }}</span>
    </div>
    <STable
      ref="tableRef"
      v-model:selected-row-keys="selectedKeys"
      :columns="columns"
      :data-source="dataSource"
      :tree="{}"
      :row-selection="rowSelection"
      row-key="id"
      default-expand-all-rows
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

.demo-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
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
