<script setup lang="ts">
import { ref } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';

type ThemeMode = 'light' | 'dark';

interface Service {
  id: number;
  service: string;
  owner: string;
  latency: number;
  status: '正常' | '告警' | '维护';
}

const themeMode = ref<ThemeMode>('light');

const columns: STableColumn<Service>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 72 },
  { id: 'service', accessorKey: 'service', header: '服务名称' },
  { id: 'owner', accessorKey: 'owner', header: '负责人' },
  {
    id: 'latency',
    accessorKey: 'latency',
    header: '平均延迟',
    align: 'right',
    cell: ({ row }) => String(row.original.latency) + ' ms',
  },
  { id: 'status', accessorKey: 'status', header: '状态', width: 96 },
];

const dataSource: Service[] = [
  { id: 1, service: '用户中心', owner: '林晓', latency: 42, status: '正常' },
  { id: 2, service: '订单服务', owner: '周宁', latency: 86, status: '告警' },
  { id: 3, service: '支付网关', owner: '陈默', latency: 58, status: '正常' },
  { id: 4, service: '消息队列', owner: '苏言', latency: 113, status: '维护' },
  { id: 5, service: '搜索服务', owner: '林晓', latency: 67, status: '正常' },
  { id: 6, service: '文件服务', owner: '周宁', latency: 75, status: '正常' },
  { id: 7, service: '数据分析', owner: '陈默', latency: 129, status: '告警' },
  { id: 8, service: '通知中心', owner: '苏言', latency: 51, status: '正常' },
];

const pagination = {
  defaultPageSize: 5,
  showSizeChanger: false,
};
</script>

<template>
  <section class="theme-mode-demo" :data-theme="themeMode">
    <div class="theme-mode-toolbar">
      <div>
        <strong>主题模式</strong>
        <span>{{ themeMode === 'light' ? '浅色' : '暗色' }}</span>
      </div>
      <div class="theme-mode-switch" role="group" aria-label="主题模式">
        <button
          type="button"
          :class="{ active: themeMode === 'light' }"
          @click="themeMode = 'light'"
        >
          浅色
        </button>
        <button type="button" :class="{ active: themeMode === 'dark' }" @click="themeMode = 'dark'">
          暗色
        </button>
      </div>
    </div>

    <STable
      class="theme-mode-table"
      row-key="id"
      bordered
      striped
      :columns="columns"
      :data-source="dataSource"
      :pagination="pagination"
    />
  </section>
</template>

<style scoped>
.theme-mode-demo {
  padding: 16px;
  border: 1px solid #d9e2ec;
  border-radius: 8px;
  background: #ffffff;
  color: #1f2937;
  transition:
    background-color 0.2s,
    border-color 0.2s,
    color 0.2s;
}

.theme-mode-demo[data-theme='dark'] {
  border-color: #374151;
  background: #111827;
  color: #f3f4f6;
}

.theme-mode-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.theme-mode-toolbar > div:first-child {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.theme-mode-toolbar span {
  color: #64748b;
  font-size: 13px;
}

.theme-mode-demo[data-theme='dark'] .theme-mode-toolbar span {
  color: #9ca3af;
}

.theme-mode-switch {
  display: inline-flex;
  overflow: hidden;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
}

.theme-mode-demo[data-theme='dark'] .theme-mode-switch {
  border-color: #4b5563;
}

.theme-mode-switch button {
  min-width: 52px;
  padding: 5px 10px;
  border: 0;
  background: transparent;
  color: #475569;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
}

.theme-mode-demo[data-theme='dark'] .theme-mode-switch button {
  color: #d1d5db;
}

.theme-mode-switch button + button {
  border-left: 1px solid #cbd5e1;
}

.theme-mode-demo[data-theme='dark'] .theme-mode-switch button + button {
  border-left-color: #4b5563;
}

.theme-mode-switch button.active {
  background: #0f766e;
  color: #ffffff;
}

.theme-mode-demo[data-theme='dark'] .theme-mode-switch button.active {
  background: #0f766e;
  color: #ffffff;
}
</style>
