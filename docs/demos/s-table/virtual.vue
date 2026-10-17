<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import STable, {
  type STableColumn,
  type STableExpandable,
  type STableRowSelection,
} from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

type VirtualMode = 'basic' | 'expandable' | 'selection';

const modeOptions: { label: string; value: VirtualMode; rows: number }[] = [
  { label: '基础 10,000 行', value: 'basic', rows: 10_000 },
  { label: '展开 5,000 行', value: 'expandable', rows: 5_000 },
  { label: '选择 5,000 行', value: 'selection', rows: 5_000 },
];

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  { id: 'name', accessorKey: 'name', header: '姓名', width: 120 },
  { id: 'age', accessorKey: 'age', header: '年龄', width: 80 },
  { id: 'city', accessorKey: 'city', header: '城市', width: 100 },
  { id: 'email', accessorKey: 'email', header: '邮箱' },
];

const mode = ref<VirtualMode>('basic');
const dataSource = shallowRef(generateEmployees(10_000));
const selectedKeys = ref<(string | number)[]>([]);
const expandable: STableExpandable<Employee> = {};
const rowSelection: STableRowSelection<Employee> = { type: 'checkbox' };

const changeMode = (nextMode: VirtualMode, rows: number) => {
  if (mode.value === nextMode) return;
  mode.value = nextMode;
  selectedKeys.value = [];
  dataSource.value = generateEmployees(rows);
};
</script>

<template>
  <div class="virtual-demo">
    <div class="virtual-modes" role="group" aria-label="虚拟滚动场景">
      <button
        v-for="option in modeOptions"
        :key="option.value"
        type="button"
        class="virtual-mode"
        :class="{ active: mode === option.value }"
        :aria-pressed="mode === option.value"
        @click="changeMode(option.value, option.rows)"
      >
        {{ option.label }}
      </button>
    </div>

    <STable
      v-model:selected-row-keys="selectedKeys"
      :columns="columns"
      :data-source="dataSource"
      :virtual="true"
      :expandable="mode === 'expandable' ? expandable : undefined"
      :row-selection="mode === 'selection' ? rowSelection : undefined"
      row-key="id"
      style="height: 420px"
    >
      <template v-if="mode === 'expandable'" #expandedRowRender="{ record }">
        <div class="expanded-content">
          <strong>{{ record.name }}</strong>
          <span>{{ record.department }} · ¥{{ record.salary.toLocaleString('zh-CN') }}</span>
        </div>
      </template>
    </STable>
  </div>
</template>

<style scoped>
.virtual-demo {
  min-width: 640px;
}

.virtual-modes {
  display: inline-flex;
  margin-bottom: 12px;
  overflow: hidden;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
}

.virtual-mode {
  min-height: 32px;
  padding: 4px 12px;
  color: rgba(0, 0, 0, 0.65);
  font: inherit;
  border: 0;
  border-right: 1px solid #d9d9d9;
  background: #fff;
  cursor: pointer;
}

.virtual-mode:last-child {
  border-right: 0;
}

.virtual-mode.active {
  color: #fff;
  background: #1677ff;
}

.expanded-content {
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  background: #fff;
}
</style>
