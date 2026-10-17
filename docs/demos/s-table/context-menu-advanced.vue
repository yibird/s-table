<script setup lang="ts">
import { ref } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'department', accessorKey: 'department', header: '部门' },
  { id: 'salary', accessorKey: 'salary', header: '月薪' },
];

const dataSource = generateEmployees(12);
const archivedRowIds = ref<Set<number>>(new Set());
const message = ref('');
const salaryFormatter = new Intl.NumberFormat('zh-CN');

/** 执行普通菜单命令，并通过作用域插槽提供的 close 主动关闭浮层。 */
const runAction = (action: string, row: Employee, rowIndex: number, close: () => void) => {
  message.value = `${action}：${row.name}（当前第 ${rowIndex + 1} 行）`;
  close();
};

/** 用不可变 Set 更新归档状态，确保菜单文案和状态提示立即刷新。 */
const toggleArchive = (row: Employee, rowIndex: number, close: () => void) => {
  const next = new Set(archivedRowIds.value);
  const archived = next.has(row.id);
  if (archived) next.delete(row.id);
  else next.add(row.id);
  archivedRowIds.value = next;
  runAction(archived ? '取消归档' : '归档', row, rowIndex, close);
};
</script>

<template>
  <div class="context-menu-demo">
    <p class="context-menu-demo-title">动态菜单</p>
    <p v-if="message" class="context-menu-demo-message">{{ message }}</p>

    <STable
      row-key="id"
      :columns="columns"
      :data-source="dataSource"
      :pagination="{ defaultPageSize: 6 }"
    >
      <template #contextMenu="{ row, rowIndex, close }">
        <div class="context-menu-profile">
          <strong>{{ row.name }}</strong>
          <span>第 {{ rowIndex + 1 }} 行 · {{ row.department }}</span>
        </div>

        <div class="s-table-context-menu-group-title">
          月薪 ¥{{ salaryFormatter.format(row.salary) }}
        </div>
        <button
          class="s-table-context-menu-item"
          @click="runAction('查看详情', row, rowIndex, close)"
        >
          查看详情
        </button>
        <button
          class="s-table-context-menu-item"
          @click="
            runAction(
              row.department === '技术部' ? '打开代码仓库' : '发送消息',
              row,
              rowIndex,
              close
            )
          "
        >
          {{ row.department === '技术部' ? '打开代码仓库' : '发送消息' }}
        </button>
        <button
          class="s-table-context-menu-item"
          @click="runAction('复制行信息', row, rowIndex, close)"
        >
          复制行信息
        </button>

        <div class="s-table-context-menu-divider" />
        <button class="s-table-context-menu-item" @click="toggleArchive(row, rowIndex, close)">
          {{ archivedRowIds.has(row.id) ? '取消归档' : '归档' }}
        </button>
        <button
          class="s-table-context-menu-item s-table-context-menu-item-danger"
          :class="{ 's-table-context-menu-item-disabled': row.department === '技术部' }"
          :disabled="row.department === '技术部'"
          @click="runAction('删除', row, rowIndex, close)"
        >
          {{ row.department === '技术部' ? '技术部员工不可删除' : '删除' }}
        </button>
      </template>
    </STable>
  </div>
</template>

<style scoped>
.context-menu-demo {
  padding: 16px;
  border: 1px dashed var(--vp-c-divider, #d9d9d9);
  border-radius: 8px;
}

.context-menu-demo-title {
  margin: 0 0 12px;
  font-weight: 600;
}

.context-menu-demo-message {
  margin: 0 0 12px;
  color: var(--s-primary-color, #1677ff);
}

.context-menu-profile {
  display: flex;
  flex-direction: column;
  min-width: 220px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--s-color-border, #f0f0f0);
}

.context-menu-profile strong {
  color: var(--s-color-text, rgba(0, 0, 0, 0.88));
  font-size: 14px;
  line-height: 22px;
}

.context-menu-profile span {
  color: var(--s-color-text-tertiary, rgba(0, 0, 0, 0.45));
  font-size: 12px;
  line-height: 20px;
}
</style>
