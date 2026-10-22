<script setup lang="ts">
import { shallowRef } from 'vue';
import STable, {
  type STableColumn,
  type STableEditPatch,
  type STableEditConfig,
} from '../../../packages/vue/src';

interface Member {
  id: number;
  name: string;
  quota: number;
}

const dataSource = shallowRef<Member[]>([
  { id: 1, name: 'Ada', quota: 120 },
  { id: 2, name: 'Grace', quota: 80 },
  { id: 3, name: 'Lin', quota: 40 },
]);

const message = shallowRef('双击单元格编辑；额度必须为非负数，姓名不能为空');

const columns: STableColumn<Member>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 80 },
  {
    id: 'name',
    accessorKey: 'name',
    header: '姓名',
    editable: true,
    valueParser: (value) => String(value).trim(),
  },
  {
    id: 'quota',
    accessorKey: 'quota',
    header: '额度',
    align: 'right',
    editable: true,
    editor: 'number',
    valueParser: (value) => Number(value),
  },
];

const editConfig: STableEditConfig<Member> = {
  mode: 'cell',
  trigger: 'dblclick',
  updateMode: 'patch',
  validate: (values) =>
    Object.entries(values).every(([key, value]) =>
      key === 'quota' ? Number(value) >= 0 : String(value).trim() !== ''
    )
      ? true
      : '校验失败：姓名不能为空，额度必须 ≥ 0',
};

const onEditPatch = (patch: STableEditPatch<Member>) => {
  // patch 模式不会自动替换 dataSource，这里模拟业务侧写回行级 store。
  dataSource.value = dataSource.value.map((record) =>
    record.id === patch.rowKey ? patch.nextRecord : record
  );
  message.value = `editPatch：${JSON.stringify(patch.values)}（revision ${patch.revision}）`;
};
</script>

<template>
  <div class="demo-shell">
    <p style="margin: 0 0 12px; color: #666; font-size: 13px">{{ message }}</p>
    <STable
      v-model:data-source="dataSource"
      :columns="columns"
      :edit-config="editConfig"
      row-key="id"
      bordered
      @edit-patch="onEditPatch"
      @edit-validate-error="(reason) => (message = reason ?? '校验未通过')"
    />
  </div>
</template>

<style scoped>
.demo-shell {
  padding: 16px;
  border: 1px dashed #d9d9d9;
  border-radius: 12px;
}
</style>
