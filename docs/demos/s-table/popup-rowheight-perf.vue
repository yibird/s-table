<script setup lang="ts">
import { ref } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const columns: STableColumn<Employee>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: '姓名',
    filters: [{ text: '技术部', value: '技术部' }],
    width: 140,
  },
  {
    id: 'email',
    accessorKey: 'email',
    header: '邮箱',
    width: 220,
    ellipsis: true,
    tooltip: true,
  },
  {
    id: 'address',
    accessorKey: 'address',
    header: '地址（autoHeight）',
    autoHeight: true,
  },
];

const dataSource = generateEmployees(60).map((row) => ({
  ...row,
  address: `${row.city} ${row.address}，这是一段会自动换行的长地址内容。`,
}));

const popupRef = ref<HTMLElement>();

/** 浮层容器：优先挂到示例容器，节点不可用时回退到文档 body。 */
const getPopupContainer = () =>
  popupRef.value?.isConnected
    ? popupRef.value
    : (popupRef.value?.ownerDocument.body ?? document.body);
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; color: #666">
      筛选浮层挂到自定义容器；函数式 rowHeight 作为初始估算，autoHeight 强制动态测量；
      deepWatchDataSource / preserveRow 开启。
    </p>
    <div ref="popupRef" style="position: relative; border-radius: 8px; overflow: visible">
      <STable
        :columns="columns"
        :data-source="dataSource"
        row-key="id"
        :get-popup-container="getPopupContainer"
        :virtual="{
          rowHeight: (record) => (record.address.length > 30 ? 64 : 44),
          buffer: { x: 2, y: 10 },
        }"
        :deep-watch-data-source="true"
        :deep-watch-columns="true"
        preserve-row
        :ignore-cell-key="false"
        :pagination="false"
        style="max-height: 360px"
      />
    </div>
  </div>
</template>
