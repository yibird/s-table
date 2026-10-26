<script setup lang="ts">
import { shallowRef } from 'vue';
import STable, { type STableColumn, type STableEditingState } from '../../../packages/vue/src';

type TaskStatus = 'todo' | 'doing' | 'done';

interface Task {
  id: number;
  title: string;
  status: TaskStatus;
  remark: string;
}

const statusOptions: Array<{ value: TaskStatus; text: string }> = [
  { value: 'todo', text: '待处理' },
  { value: 'doing', text: '进行中' },
  { value: 'done', text: '已完成' },
];

const statusLabel = (value: TaskStatus) =>
  statusOptions.find((option) => option.value === value)?.text ?? value;

const dataSource = shallowRef<Task[]>([
  { id: 1, title: '整理需求清单', status: 'todo', remark: '等待产品确认' },
  { id: 2, title: '补充接口文档', status: 'doing', remark: '本周五前完成' },
  { id: 3, title: '回归测试', status: 'done', remark: '已通过' },
]);

const columns: STableColumn<Task>[] = [
  { accessorKey: 'id', header: 'ID', width: 64 },
  { accessorKey: 'title', header: '任务', width: 180 },
  {
    accessorKey: 'status',
    header: '状态',
    width: 140,
    editable: true,
    cell: ({ getValue }) => statusLabel(getValue() as TaskStatus),
  },
  { accessorKey: 'remark', header: '备注', editable: true },
];

const message = shallowRef('双击「状态」或「备注」列体验自定义编辑器');

const onEditCommit = (_editing: STableEditingState, _record: Task, next: Task) => {
  message.value = `已保存:${next.title} → ${statusLabel(next.status)}`;
};

/** 下拉框选择后立即提交。 */
const onStatusChange = (
  event: Event,
  setValue: (value: unknown) => void,
  commit: () => Promise<boolean>
) => {
  setValue((event.target as HTMLSelectElement).value);
  commit();
};
</script>

<template>
  <section class="demo-shell">
    <p class="demo-tip">{{ message }}</p>
    <STable
      v-model:data-source="dataSource"
      row-key="id"
      bordered
      :columns="columns"
      :edit-config="{ mode: 'cell', trigger: 'dblclick' }"
      @edit-commit="onEditCommit"
    >
      <template #cellEditor="{ value, setValue, commit, cancel, columnId }">
        <div class="demo-editor">
          <select
            v-if="columnId === 'status'"
            :value="String(value)"
            @change="onStatusChange($event, setValue, commit)"
          >
            <option v-for="option in statusOptions" :key="option.value" :value="option.value">
              {{ option.text }}
            </option>
          </select>
          <template v-else>
            <textarea
              :value="String(value ?? '')"
              rows="2"
              @input="setValue(($event.target as HTMLTextAreaElement).value)"
              @keydown.esc="cancel"
            />
            <div class="demo-editor-actions">
              <button type="button" @click="commit()">保存</button>
              <button type="button" @click="cancel()">取消</button>
            </div>
          </template>
        </div>
      </template>
    </STable>
  </section>
</template>

<style scoped>
.demo-shell {
  padding: 16px;
  border: 1px dashed var(--vp-c-divider, #d9d9d9);
  border-radius: 8px;
}

.demo-tip {
  margin: 0 0 12px;
  color: var(--vp-c-text-2, #666);
  font-size: 13px;
}

.demo-editor {
  display: grid;
  gap: 6px;
  min-width: 160px;
}

.demo-editor select,
.demo-editor textarea {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid var(--vp-c-divider, #d9d9d9);
  border-radius: 4px;
  background: var(--vp-c-bg, #fff);
  color: var(--vp-c-text-1, #222);
  font: inherit;
  box-sizing: border-box;
}

.demo-editor-actions {
  display: flex;
  gap: 6px;
}

.demo-editor-actions button {
  padding: 2px 8px;
  border: 1px solid var(--vp-c-divider, #d9d9d9);
  border-radius: 4px;
  background: var(--vp-c-bg-soft, #f5f5f5);
  cursor: pointer;
}
</style>
