<script setup lang="ts">
import { shallowRef } from 'vue';
import STable, {
  type STableCellEvent,
  type STableColumn,
  type STableRowEvent,
} from '../../../packages/vue/src';

interface Ticket {
  id: number;
  subject: string;
  priority: string;
}

const dataSource: Ticket[] = [
  { id: 101, subject: '登录失败', priority: '高' },
  { id: 102, subject: '导出超时', priority: '中' },
  { id: 103, subject: '字段显示错误', priority: '低' },
];
const columns: STableColumn<Ticket>[] = [
  { accessorKey: 'id', header: '工单', width: 90 },
  { accessorKey: 'subject', header: '主题' },
  { accessorKey: 'priority', header: '优先级', width: 100 },
];
const logs = shallowRef<string[]>(['等待交互']);

const recordLog = (message: string) => {
  logs.value = [message, ...logs.value].slice(0, 5);
};

const onCell = (name: string, payload: STableCellEvent<Ticket, MouseEvent>) => {
  if (name === '右键') payload.event.preventDefault();
  recordLog(`${name}：行 ${payload.rowKey}，列 ${payload.columnId}，值 ${String(payload.value)}`);
};

const onRow = (name: string, payload: STableRowEvent<Ticket, MouseEvent>) => {
  recordLog(`${name}：行 ${payload.rowKey}（可见索引 ${payload.rowIndex}）`);
};
</script>

<template>
  <section class="events-demo">
    <STable
      row-key="id"
      bordered
      keyboard-navigation
      :columns="columns"
      :data-source="dataSource"
      @row-click="(payload) => onRow('行点击', payload)"
      @row-double-click="(payload) => onRow('行双击', payload)"
      @row-mouseenter="(payload) => onRow('进入行', payload)"
      @row-mouseleave="(payload) => onRow('离开行', payload)"
      @cell-click="(payload) => onCell('单元格点击', payload)"
      @cell-double-click="(payload) => onCell('单元格双击', payload)"
      @cell-context-menu="(payload) => onCell('右键', payload)"
      @cell-mouseenter="(payload) => onCell('进入单元格', payload)"
      @cell-mouseleave="(payload) => onCell('离开单元格', payload)"
      @cell-keydown="(payload) => recordLog(`键盘：${payload.event.key}，列 ${payload.columnId}`)"
    />
    <ol class="event-log" aria-live="polite">
      <li v-for="(log, index) in logs" :key="`${index}-${log}`">{{ log }}</li>
    </ol>
  </section>
</template>

<style scoped>
.events-demo {
  padding: 16px;
  border: 1px dashed var(--vp-c-divider, #d9d9d9);
  border-radius: 8px;
}

.event-log {
  min-height: 100px;
  margin: 12px 0 0;
  padding: 10px 10px 10px 32px;
  border-left: 3px solid #1677ff;
  background: var(--vp-c-bg-soft, #f6f7f9);
  color: var(--vp-c-text-2, #555);
  font:
    13px/1.7 ui-monospace,
    monospace;
}
</style>
