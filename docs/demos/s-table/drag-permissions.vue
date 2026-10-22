<script setup lang="ts">
import { shallowRef } from 'vue';
import STable, {
  type STableColumn,
  type STableRowDragConfig,
  type STableRowOrderChangeEvent,
} from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const dataSource = shallowRef(generateEmployees(8).map((record) => ({ ...record })));
const message = shallowRef('ID 1 不可拖拽；拖拽到 ID 2 会被 beforeDrop 拒绝');

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 90 },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'department', accessorKey: 'department', header: '部门' },
  { id: 'salary', accessorKey: 'salary', header: '月薪', align: 'right' },
];

const rowDrag: STableRowDragConfig<Employee> = {
  trigger: 'handle',
  animation: true,
  canDrag: ({ record }) => record.id !== 1,
  beforeDrop: async ({ targetRowKey }: STableRowOrderChangeEvent<Employee>) => {
    if (targetRowKey === 2) {
      message.value = 'beforeDrop 拒绝：不能把行放到 ID 2 的位置';
      await new Promise((resolve) => setTimeout(resolve, 200));
      return false;
    }
    return true;
  },
};

const onOrderChange = (payload: STableRowOrderChangeEvent<Employee>) => {
  message.value = `已移动 ${payload.rowKeys.join(', ')} → ${payload.position} ${payload.targetRowKey}`;
};
</script>

<template>
  <div class="demo-shell">
    <p style="margin: 0 0 12px; color: #666; font-size: 13px">{{ message }}</p>
    <STable
      v-model:data-source="dataSource"
      :columns="columns"
      :row-drag="rowDrag"
      row-key="id"
      bordered
      @row-order-change="onOrderChange"
    >
      <template #rowDragHandle="{ record }">
        <span
          :title="record.id === 1 ? '不允许拖拽' : '拖拽排序'"
          style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            color: #999;
            cursor: grab;
          "
        >
          ⠿
        </span>
      </template>
    </STable>
  </div>
</template>

<style scoped>
.demo-shell {
  padding: 16px;
  border: 1px dashed #d9d9d9;
  border-radius: 12px;
}
</style>
