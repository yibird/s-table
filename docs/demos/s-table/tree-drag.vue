<script setup lang="ts">
import { shallowRef } from 'vue';
import STable, {
  type STableColumn,
  type STableRowOrderChangeEvent,
} from '../../../packages/vue/src';

interface Task {
  id: number;
  title: string;
  owner: string;
  children?: Task[];
}

const message = shallowRef('拖到行中部成为子任务，拖到上/下边缘调整同级顺序');
const dataSource = shallowRef<Task[]>([
  {
    id: 1,
    title: '版本 2.0',
    owner: 'Ada',
    children: [
      { id: 11, title: '接口冻结', owner: 'Grace' },
      { id: 12, title: '回归测试', owner: 'Lin' },
    ],
  },
  { id: 2, title: '文档发布', owner: 'Mia' },
  { id: 3, title: '灰度上线', owner: 'Ken' },
]);
const columns: STableColumn<Task>[] = [
  { accessorKey: 'title', header: '任务', width: 240 },
  { accessorKey: 'owner', header: '负责人', width: 140 },
];

const onDrop = (payload: STableRowOrderChangeEvent<Task>) => {
  message.value = `${payload.rowKeys.join(', ')} → ${payload.position} ${payload.targetRowKey}`;
};
</script>

<template>
  <section class="tree-drag-demo">
    <div class="drop-state" aria-live="polite">{{ message }}</div>
    <STable
      v-model:data-source="dataSource"
      row-key="id"
      bordered
      default-expand-all-rows
      :columns="columns"
      :tree="{}"
      :row-drag="{
        allowTreeReparent: true,
        beforeDrop: async ({ rowKeys, targetRowKey }) => !rowKeys.includes(targetRowKey),
      }"
      @row-order-change="onDrop"
    />
  </section>
</template>

<style scoped>
.tree-drag-demo {
  padding: 16px;
  border: 1px dashed var(--vp-c-divider, #d9d9d9);
  border-radius: 8px;
}

.drop-state {
  margin-bottom: 10px;
  color: var(--vp-c-text-2, #666);
  font:
    13px/1.5 ui-monospace,
    monospace;
}
</style>
