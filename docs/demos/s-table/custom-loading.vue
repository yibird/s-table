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
      <div
        style="
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 20px 24px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(22, 119, 255, 0.14);
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(22, 119, 255, 0.12);
        "
      >
        <div
          style="
            width: 32px;
            height: 32px;
            border: 3px solid rgba(22, 119, 255, 0.18);
            border-top-color: #1677ff;
            border-radius: 50%;
            animation: s-table-demo-spin 0.8s linear infinite;
          "
        ></div>
        <div style="color: rgba(0, 0, 0, 0.75); font-weight: 600">正在同步表格数据</div>
        <div style="color: rgba(0, 0, 0, 0.45); font-size: 12px">请稍候，系统正在准备最新结果</div>
      </div>
    </template>
  </STable>
</template>

<style scoped>
@keyframes s-table-demo-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
