<script setup lang="ts">
import { h, shallowRef } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const message = shallowRef('点击表头右侧的「⋯」打开列菜单');

const dataSource = generateEmployees(6);

const makeItem = (text: string, action: () => void) =>
  h(
    'button',
    {
      type: 'button',
      style:
        'display:block;width:100%;padding:5px 12px;border:0;border-radius:4px;background:transparent;text-align:left;cursor:pointer;font-size:14px;',
      onClick: action,
    },
    text
  );

const columns: STableColumn<Employee>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: '姓名',
    showMenu: true,
    // 用普通文本替换默认「更多」图标
    menuIcon: '⋯',
    menuPopup: ({ close }) =>
      h('div', [
        makeItem('复制姓名', () => {
          message.value = '已触发「复制姓名」';
          close();
        }),
        makeItem('仅看该员工', () => {
          message.value = '已触发「仅看该员工」';
          close();
        }),
      ]),
  },
  { id: 'department', accessorKey: 'department', header: '部门' },
  { id: 'salary', accessorKey: 'salary', header: '月薪' },
];
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; color: #666; font-size: 13px">{{ message }}</p>
    <STable :columns="columns" :data-source="dataSource" row-key="id" />
  </div>
</template>
