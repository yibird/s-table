<script setup lang="ts">
import { ref } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'age', accessorKey: 'age', header: '年龄' },
  { id: 'department', accessorKey: 'department', header: '部门' },
];

const dataSource: Employee[] = generateEmployees(20);

const clickedRow = ref<Employee | null>(null);
const message = ref('');

const handleAction = (action: string, row: Employee | null, close: () => void) => {
  clickedRow.value = row;
  message.value = `执行操作: ${action}，行ID: ${row?.id}`;
  close();
};
</script>

<template>
  <div style="padding: 16px; border: 1px dashed var(--vp-c-divider, #d9d9d9); border-radius: 12px">
    <p style="margin: 0 0 12px; font-weight: 600">右键菜单示例（在表格行上右键试试）</p>
    <p v-if="message" style="margin: 0 0 12px; color: var(--s-primary-color, #1677ff)">
      {{ message }}
    </p>
    <STable :columns="columns" :data-source="dataSource" style="height: 400px">
      <template #contextMenu="{ row, close }">
        <button class="s-table-context-menu-item" @click="handleAction('查看详情', row, close)">
          查看详情
        </button>
        <button class="s-table-context-menu-item" @click="handleAction('编辑', row, close)">
          编辑
        </button>
        <button class="s-table-context-menu-item" @click="handleAction('复制', row, close)">
          复制
        </button>
        <div class="s-table-context-menu-divider" />
        <button
          class="s-table-context-menu-item s-table-context-menu-item-danger"
          @click="handleAction('删除', row, close)"
        >
          删除
        </button>
      </template>
    </STable>
  </div>
</template>
