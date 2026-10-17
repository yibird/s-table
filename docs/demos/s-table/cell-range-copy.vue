<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import STable, {
  type STableCellRangeCopyEvent,
  type STableColumn,
} from '../../../packages/vue/src';
import { Checkbox } from '../../../packages/vue/src/ui';

interface CopyRow {
  id: number;
  name: string;
  department: string;
  score: number;
}

const columns: STableColumn<CopyRow>[] = [
  { accessorKey: 'id', header: 'ID', width: 100 },
  { accessorKey: 'name', header: '姓名', width: 140 },
  { accessorKey: 'department', header: '部门', width: 140 },
  { accessorKey: 'score', header: '评分', width: 100 },
];

const data: CopyRow[] = [
  { id: 1, name: '张三', department: '工程部', score: 92 },
  { id: 2, name: '李四', department: '设计部', score: 88 },
  { id: 3, name: '王五', department: '产品部', score: 95 },
  { id: 4, name: '赵六', department: '市场部', score: 86 },
];

const preventCopy = ref(false);
const lastAttempt = shallowRef('暂无复制操作');

const handleCellRangeCopy = (payload: STableCellRangeCopyEvent) => {
  lastAttempt.value = payload.text.replace(/\r?\n/g, ' / ');
  return !preventCopy.value;
};
</script>

<template>
  <div class="copy-toolbar">
    <Checkbox v-model="preventCopy">禁止复制</Checkbox>
    <span>最近内容：{{ lastAttempt }}</span>
  </div>
  <STable
    bordered
    row-key="id"
    :columns="columns"
    :data-source="data"
    :cell-range-selection="{ mode: 'cell' }"
    @cell-range-copy="handleCellRangeCopy"
  />
</template>

<style scoped>
.copy-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 32px;
  margin-bottom: 12px;
  color: var(--s-color-text-secondary);
  font-size: 13px;
}
</style>
