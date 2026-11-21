<script setup lang="ts">
import STable, { type STableColumn } from '../../../packages/vue/src';

type UserRecord = {
  id: number;
  name: string;
  status: string;
};

const columns: STableColumn<UserRecord>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  { id: 'name', accessorKey: 'name', header: '姓名', width: 180 },
  { id: 'status', accessorKey: 'status', header: '状态' },
];

const dataSource: UserRecord[] = [
  { id: 1, name: 'Tom', status: '同步中' },
  { id: 2, name: 'Jerry', status: '同步中' },
];
</script>

<template>
  <STable :columns="columns" :data-source="dataSource" loading>
    <template #loading>
      <div class="sync-loading">
        <div class="sync-loading-icon" aria-hidden="true">
          <span v-for="row in 3" :key="row" class="sync-loading-row"></span>
        </div>
        <div class="sync-loading-content">
          <div class="sync-loading-title">正在同步表格数据</div>
          <div class="sync-loading-description">请稍候，正在准备最新结果</div>
        </div>
        <div class="sync-loading-progress" aria-hidden="true"></div>
      </div>
    </template>
  </STable>
</template>

<style scoped>
.sync-loading {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: calc(100% - 32px);
  padding: 20px 24px;
  overflow: hidden;
  background: var(--s-color-bg-cell);
  border: 1px solid var(--s-color-border);
  border-radius: var(--s-radius-lg);
  box-shadow: var(--s-shadow-elevated);
}

.sync-loading-icon {
  display: grid;
  align-content: center;
  gap: 5px;
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  padding: 10px;
  box-sizing: border-box;
  color: var(--s-primary-color);
  background: color-mix(in srgb, var(--s-primary-color) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--s-primary-color) 16%, transparent);
  border-radius: var(--s-radius-md);
}

.sync-loading-row {
  height: 3px;
  border-radius: 2px;
  background: currentColor;
  opacity: 0.65;
}

.sync-loading-row:nth-child(2) {
  width: 75%;
  opacity: 0.4;
}

.sync-loading-row:nth-child(3) {
  width: 90%;
  opacity: 0.25;
}

.sync-loading-content {
  min-width: 0;
}

.sync-loading-title {
  color: var(--s-color-text);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.6;
}

.sync-loading-description {
  margin-top: 3px;
  color: var(--s-color-text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.sync-loading-progress {
  position: absolute;
  inset: auto 0 0;
  height: 2px;
  overflow: hidden;
  background: color-mix(in srgb, var(--s-primary-color) 10%, transparent);
}

.sync-loading-progress::after {
  content: '';
  display: block;
  width: 45%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, transparent, var(--s-primary-color), transparent);
  animation: sync-loading-progress 1.8s ease-in-out infinite;
}

@keyframes sync-loading-progress {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(325%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sync-loading-progress::after {
    width: 100%;
    animation: none;
    opacity: 0.6;
  }
}
</style>
