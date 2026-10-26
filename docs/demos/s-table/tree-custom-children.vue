<script setup lang="ts">
import { shallowRef } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';

interface OrgNode {
  id: number;
  name: string;
  owner: string;
  // 使用非默认的子节点字段
  nodes?: OrgNode[];
}

const dataSource = shallowRef<OrgNode[]>([
  {
    id: 1,
    name: '产品中心',
    owner: 'Ada',
    nodes: [
      { id: 11, name: '产品设计', owner: 'Lin' },
      {
        id: 12,
        name: '用户研究',
        owner: 'Mia',
        nodes: [{ id: 121, name: '可用性测试', owner: 'Ken' }],
      },
    ],
  },
  {
    id: 2,
    name: '研发中心',
    owner: 'Grace',
    nodes: [{ id: 21, name: '平台工程', owner: 'Wei' }],
  },
]);

const columns: STableColumn<OrgNode>[] = [
  { accessorKey: 'name', header: '组织', width: 220 },
  { accessorKey: 'owner', header: '负责人', width: 160 },
];

const tree = { childrenColumnName: 'nodes', indentSize: 20 };
</script>

<template>
  <section class="demo-shell">
    <p class="demo-tip">
      通过 <code>tree.childrenColumnName: 'nodes'</code> 读取自定义子节点字段。
    </p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      :tree="tree"
      row-key="id"
      bordered
      default-expand-all-rows
    />
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

.demo-tip code {
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft, #f5f5f5);
}
</style>
