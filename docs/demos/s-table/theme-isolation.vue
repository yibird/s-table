<script setup lang="ts">
import STable, { type STableColumn, type STableRowSelection } from '../../../packages/vue/src';

interface WorkspaceItem {
  id: number;
  task: string;
  owner: string;
  status: '进行中' | '已完成';
}

const columns: STableColumn<WorkspaceItem>[] = [
  { id: 'task', accessorKey: 'task', header: '事项' },
  { id: 'status', accessorKey: 'status', header: '状态', width: 88 },
];

const dataSource: WorkspaceItem[] = [
  { id: 701, task: '月度结算', owner: '林晓', status: '已完成' },
  { id: 702, task: '预算复核', owner: '周宁', status: '进行中' },
  { id: 703, task: '合同归档', owner: '陈默', status: '进行中' },
];

const rowSelection: STableRowSelection<WorkspaceItem> = {
  type: 'checkbox',
  hideSelectAll: true,
  fixed: false,
};
</script>

<template>
  <div class="theme-isolation-demo">
    <section class="theme-scope theme-scope--teal">
      <header class="theme-scope-header">
        <span class="theme-scope-swatch" />
        <strong>财务工作台</strong>
      </header>
      <STable
        row-key="id"
        bordered
        striped
        :columns="columns"
        :data-source="dataSource"
        :row-selection="rowSelection"
        :default-selected-row-keys="[701]"
      />
    </section>

    <section class="theme-scope theme-scope--rose">
      <header class="theme-scope-header">
        <span class="theme-scope-swatch" />
        <strong>审核工作台</strong>
      </header>
      <STable
        row-key="id"
        bordered
        striped
        :columns="columns"
        :data-source="dataSource"
        :row-selection="rowSelection"
        :default-selected-row-keys="[702]"
      />
    </section>
  </div>
</template>

<style scoped>
.theme-isolation-demo {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.theme-scope {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--demo-scope-border);
  border-radius: 8px;
  background: var(--s-color-bg-cell);
}

.theme-scope--teal {
  --demo-scope-border: #99f6e4;
  --s-primary-color: #0f766e;
  --s-color-bg-header: #ecfdf5;
  --s-color-bg-cell: #ffffff;
  --s-color-bg-row-hover: #f0fdfa;
  --s-color-bg-row-selected: #ccfbf1;
  --s-color-bg-row-selected-hover: #99f6e4;
  --s-color-bg-row-striped: #f8fafc;
  --s-color-border: #a7f3d0;
  --s-color-border-control: #5eead4;
}

.theme-scope--rose {
  --demo-scope-border: #fecdd3;
  --s-primary-color: #be123c;
  --s-color-bg-header: #fff1f2;
  --s-color-bg-cell: #ffffff;
  --s-color-bg-row-hover: #fff1f2;
  --s-color-bg-row-selected: #ffe4e6;
  --s-color-bg-row-selected-hover: #fecdd3;
  --s-color-bg-row-striped: #fffafa;
  --s-color-border: #fecdd3;
  --s-color-border-control: #fda4af;
}

.theme-scope-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: var(--s-color-text, #1f2937);
  font-size: 14px;
}

.theme-scope-swatch {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--s-primary-color);
}

@media (max-width: 760px) {
  .theme-isolation-demo {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
