<script setup lang="ts">
import { h, ref } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';

interface Dept {
  id: number;
  name: string;
  children?: Dept[];
}

const columns: STableColumn<Dept>[] = [{ id: 'name', accessorKey: 'name', header: '部门 / 成员' }];

const dataSource: Dept[] = [
  {
    id: 1,
    name: '技术部',
    children: [
      { id: 11, name: '张三' },
      { id: 12, name: '李四' },
    ],
  },
  { id: 2, name: '产品部', children: [{ id: 21, name: '王五' }] },
];

const selectedKeys = ref<Array<string | number>>([]);
const expandedKeys = ref<Array<string | number>>([1]);

const rowSelection = {
  type: 'checkbox' as const,
  // 父子级联：选中部门自动选中全部子成员。
  checkStrictly: false,
  // 隐藏内置批量动作，只保留自定义项。
  hideDefaultSelections: true,
  selections: [{ key: 'tech', text: '选择全部技术部' }],
};
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; color: #666">
      checkStrictly=false 父子联动；hideDefaultSelections 隐藏内置动作；自定义展开图标。
    </p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      row-key="id"
      :tree="{}"
      :row-selection="rowSelection"
      v-model:selected-row-keys="selectedKeys"
      v-model:expanded-row-keys="expandedKeys"
      :expandable="{
        expandIcon: ({ expanded }) => h('span', { style: 'font-size:12px' }, expanded ? '▾' : '▸'),
        expandFixed: false,
      }"
      :pagination="false"
    />
    <p style="margin: 12px 0 0; color: #666">选中：{{ selectedKeys.join(', ') || '无' }}</p>
  </div>
</template>
