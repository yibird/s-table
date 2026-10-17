<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import STable, {
  type STableColumn,
  type STableRowKey,
  type STableRowSelection,
} from '../../../packages/vue/src';

interface Ticket {
  id: number;
  subject: string;
  owner: string;
  priority: '高' | '中' | '低';
  status: '处理中' | '已解决';
  locked: boolean;
}

const columns: STableColumn<Ticket>[] = [
  { id: 'id', accessorKey: 'id', header: '编号', width: 88 },
  { id: 'subject', accessorKey: 'subject', header: '工单主题' },
  { id: 'owner', accessorKey: 'owner', header: '负责人' },
  { id: 'priority', accessorKey: 'priority', header: '优先级', width: 96 },
  { id: 'status', accessorKey: 'status', header: '状态', width: 110 },
];

const dataSource = ref<Ticket[]>([
  {
    id: 301,
    subject: '登录回调超时',
    owner: '林嘉',
    priority: '高',
    status: '处理中',
    locked: false,
  },
  {
    id: 302,
    subject: '导出字段缺失',
    owner: '周宁',
    priority: '中',
    status: '处理中',
    locked: false,
  },
  {
    id: 303,
    subject: '历史账单归档',
    owner: '陈安',
    priority: '低',
    status: '已解决',
    locked: true,
  },
  {
    id: 304,
    subject: '审批通知重复',
    owner: '许言',
    priority: '高',
    status: '处理中',
    locked: false,
  },
]);

const selectedRowKeys = ref<STableRowKey[]>([]);
const actionMessage = shallowRef('请选择需要处理的工单');

const rowSelection: STableRowSelection<Ticket> = {
  type: 'checkbox',
  getCheckboxProps: (record) => ({ disabled: record.locked }),
  selections: [
    {
      key: 'assign',
      text: '分配已选工单',
      onSelect: (keys, rows) => {
        actionMessage.value = `准备分配 ${keys.length} 条工单：${rows
          .map((row) => row.subject)
          .join('、')}`;
      },
    },
  ],
};

const resolveSelected = () => {
  const selected = new Set(selectedRowKeys.value);
  dataSource.value = dataSource.value.map((ticket) =>
    selected.has(ticket.id) ? { ...ticket, status: '已解决' } : ticket
  );
  actionMessage.value = `已解决 ${selected.size} 条工单`;
  selectedRowKeys.value = [];
};

const clearSelection = () => {
  selectedRowKeys.value = [];
  actionMessage.value = '已清空选择';
};
</script>

<template>
  <div class="selection-actions-demo">
    <div class="selection-actions-toolbar">
      <span class="selection-actions-count">已选 {{ selectedRowKeys.length }} 项</span>
      <button type="button" :disabled="selectedRowKeys.length === 0" @click="resolveSelected">
        标记为已解决
      </button>
      <button type="button" :disabled="selectedRowKeys.length === 0" @click="clearSelection">
        清空选择
      </button>
      <span class="selection-actions-message" aria-live="polite">{{ actionMessage }}</span>
    </div>
    <STable
      v-model:selected-row-keys="selectedRowKeys"
      row-key="id"
      bordered
      :columns="columns"
      :data-source="dataSource"
      :row-selection="rowSelection"
    />
  </div>
</template>

<style scoped>
.selection-actions-demo {
  padding: 16px;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
}

.selection-actions-toolbar {
  display: flex;
  min-height: 32px;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.selection-actions-toolbar button {
  min-height: 30px;
  padding: 4px 10px;
  border: 1px solid var(--vp-c-divider, #d9d9d9);
  border-radius: 4px;
  background: var(--vp-c-bg-soft, #fff);
  color: var(--vp-c-text-1, rgba(0, 0, 0, 0.88));
  cursor: pointer;
}

.selection-actions-toolbar button:disabled {
  color: rgba(0, 0, 0, 0.25);
  cursor: not-allowed;
}

.selection-actions-count {
  min-width: 72px;
  color: var(--vp-c-text-2, rgba(0, 0, 0, 0.65));
  font-size: 13px;
}

.selection-actions-message {
  min-width: 180px;
  color: var(--vp-c-green-1, #0f766e);
  font-size: 13px;
}
</style>
