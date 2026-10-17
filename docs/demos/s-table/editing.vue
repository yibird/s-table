<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue';
import STable, {
  type STableColumn,
  type STableEditingState,
  type STableInstance,
} from '../../../packages/vue/src';

interface Member {
  id: number;
  name: string;
  email: string;
  quota: number;
  active: boolean;
}

const tableRef = useTemplateRef<STableInstance<Member>>('table');
const message = shallowRef('双击单元格编辑，或使用工具栏打开整行编辑');
const dataSource = shallowRef<Member[]>([
  { id: 1, name: 'Ada', email: 'ada@example.com', quota: 120, active: true },
  { id: 2, name: 'Grace', email: 'grace@example.com', quota: 80, active: true },
  { id: 3, name: 'Lin', email: 'lin@example.com', quota: 40, active: false },
]);

const columns: STableColumn<Member>[] = [
  { accessorKey: 'id', header: 'ID', width: 72 },
  {
    accessorKey: 'name',
    header: '姓名',
    editable: true,
    valueParser: (value) => String(value).trim(),
  },
  {
    accessorKey: 'email',
    header: '邮箱',
    editable: true,
    valueParser: (value) => String(value).trim().toLowerCase(),
  },
  {
    accessorKey: 'quota',
    header: '额度',
    align: 'right',
    editable: true,
    editor: 'number',
    valueParser: (value) => Number(value),
  },
  {
    accessorKey: 'active',
    header: '启用',
    align: 'center',
    editable: true,
    editor: 'checkbox',
    cell: ({ getValue }) => (getValue() ? '是' : '否'),
  },
];

const startRowEdit = () => {
  message.value = tableRef.value?.startRowEdit(1) ? '正在编辑 Ada 的整行草稿' : '无法打开编辑器';
};

const commit = async () => {
  message.value = (await tableRef.value?.commitEdit()) ? '提交成功' : '当前没有可提交的草稿';
};

const cancel = () => {
  tableRef.value?.cancelEdit();
  message.value = '已取消草稿';
};

const onEditCommit = (editing: STableEditingState, _record: Member, nextRecord: Member) => {
  message.value = `已提交 ${nextRecord.name}（${editing.mode === 'row' ? '整行' : '单元格'}）`;
};
</script>

<template>
  <section class="demo-shell">
    <div class="demo-toolbar">
      <button type="button" @click="startRowEdit">编辑第一行</button>
      <button type="button" class="primary" @click="commit">提交</button>
      <button type="button" @click="cancel">取消</button>
      <span aria-live="polite">{{ message }}</span>
    </div>
    <STable
      ref="table"
      v-model:data-source="dataSource"
      row-key="id"
      bordered
      :columns="columns"
      :edit-config="{
        mode: 'cell',
        trigger: 'dblclick',
        validate: (values) =>
          Object.values(values).some((value) => typeof value === 'string' && !value.trim())
            ? '文本字段不能为空'
            : true,
      }"
      @edit-commit="onEditCommit"
      @edit-validate-error="(reason) => (message = reason ?? '校验未通过')"
    />
  </section>
</template>

<style scoped>
.demo-shell {
  padding: 16px;
  border: 1px dashed var(--vp-c-divider, #d9d9d9);
  border-radius: 8px;
}

.demo-toolbar {
  display: flex;
  min-height: 32px;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.demo-toolbar button {
  min-height: 30px;
  padding: 4px 10px;
  border: 1px solid var(--vp-c-divider, #d9d9d9);
  border-radius: 4px;
  background: var(--vp-c-bg-soft, #fff);
  color: var(--vp-c-text-1, #222);
  cursor: pointer;
}

.demo-toolbar .primary {
  border-color: #1677ff;
  background: #1677ff;
  color: #fff;
}

.demo-toolbar span {
  color: var(--vp-c-text-2, #666);
  font-size: 13px;
}
</style>
