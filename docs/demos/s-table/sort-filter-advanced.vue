<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import STable, {
  type STableColumn,
  type STableFilterPanelSlotContext,
  type STableSortItem,
} from '../../../packages/vue/src';

interface Employee {
  id: number;
  name: string;
  department: '研发' | '产品' | '设计';
  score: number;
}

const dataSource: Employee[] = [
  { id: 1, name: 'Ada', department: '研发', score: 96 },
  { id: 2, name: 'Grace', department: '研发', score: 91 },
  { id: 3, name: 'Lin', department: '产品', score: 94 },
  { id: 4, name: 'Mia', department: '设计', score: 88 },
  { id: 5, name: 'Ken', department: '产品', score: 86 },
];
const sorting = shallowRef<STableSortItem[]>([
  { columnId: 'department', order: 'ascend' },
  { columnId: 'score', order: 'descend' },
]);
const departments = shallowRef<Array<Employee['department']>>(['研发', '产品']);

const columns = computed<STableColumn<Employee>[]>(() => [
  { accessorKey: 'name', header: '姓名', sorter: true },
  {
    accessorKey: 'department',
    header: '部门',
    sorter: true,
    filterMode: 'custom',
    filteredValue: departments.value,
    onFilter: (value, record) => record.department === value,
  },
  {
    accessorKey: 'score',
    header: '评分',
    align: 'right',
    sorter: (a, b) => a.score - b.score,
  },
]);

const toggleDepartment = (
  scope: STableFilterPanelSlotContext<Employee>,
  value: Employee['department']
) => {
  const selected = new Set(scope.selectedKeys);
  if (selected.has(value)) selected.delete(value);
  else selected.add(value);
  scope.setSelectedKeys([...selected]);
};

const confirmFilter = (scope: STableFilterPanelSlotContext<Employee>) => {
  departments.value = scope.selectedKeys as Array<Employee['department']>;
  scope.confirm();
};
</script>

<template>
  <section class="advanced-query-demo">
    <div class="query-state">
      排序：{{ sorting.map((item) => `${item.columnId}:${item.order}`).join(' → ') || '无' }}
    </div>
    <STable
      v-model:sorting="sorting"
      row-key="id"
      bordered
      multi-sort
      :columns="columns"
      :data-source="dataSource"
    >
      <template #filterPanel="scope">
        <div class="department-filter">
          <label v-for="value in ['研发', '产品', '设计']" :key="value">
            <input
              type="checkbox"
              :checked="scope.selectedKeys.includes(value)"
              @change="toggleDepartment(scope, value as Employee['department'])"
            />
            {{ value }}
          </label>
          <div class="filter-actions">
            <button
              type="button"
              @click="
                scope.reset();
                departments = [];
                scope.confirm();
              "
            >
              重置
            </button>
            <button type="button" class="primary" @click="confirmFilter(scope)">确定</button>
          </div>
        </div>
      </template>
    </STable>
  </section>
</template>

<style scoped>
.advanced-query-demo {
  padding: 16px;
  border: 1px dashed var(--vp-c-divider, #d9d9d9);
  border-radius: 8px;
}

.query-state {
  margin-bottom: 10px;
  color: var(--vp-c-text-2, #666);
  font:
    13px/1.5 ui-monospace,
    monospace;
}

.department-filter {
  display: grid;
  min-width: 180px;
  gap: 8px;
  padding: 10px;
}

.department-filter label {
  display: flex;
  align-items: center;
  gap: 7px;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}

.filter-actions button {
  min-height: 28px;
  padding: 3px 9px;
  border: 1px solid var(--s-color-border-control, #d9d9d9);
  border-radius: 4px;
  background: var(--s-color-bg-cell, #fff);
  color: var(--s-color-text, rgba(0, 0, 0, 0.88));
  cursor: pointer;
}

.filter-actions .primary {
  border-color: var(--s-primary-color, #1677ff);
  background: var(--s-primary-color, #1677ff);
  color: #fff;
}
</style>
