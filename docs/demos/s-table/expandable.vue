<script setup lang="ts">
/* eslint-disable no-console */
import { ref } from 'vue';
import STable, { type STableColumn, type STableExpandable } from '../../../packages/vue/src';

// ── 基础数据 ──
interface UserData {
  id: number;
  name: string;
  age: number;
  address: string;
  description: string;
}

const columns: STableColumn<UserData>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  { id: 'name', accessorKey: 'name', header: '姓名', width: 120 },
  { id: 'age', accessorKey: 'age', header: '年龄', width: 80 },
  { id: 'address', accessorKey: 'address', header: '地址' },
];

const dataSource: UserData[] = [
  {
    id: 1,
    name: '张三',
    age: 28,
    address: '杭州市西湖区',
    description: '张三是一名资深前端工程师，擅长 Vue 和 React 开发。',
  },
  {
    id: 2,
    name: '李四',
    age: 32,
    address: '北京市海淀区',
    description: '李四是后端架构师，负责微服务架构设计和性能优化。',
  },
  {
    id: 3,
    name: '王五',
    age: 25,
    address: '上海市浦东新区',
    description: '王五是产品经理，专注于 B 端产品的规划和设计。',
  },
  {
    id: 4,
    name: '赵六',
    age: 30,
    address: '深圳市南山区',
    description: '赵六是 UI/UX 设计师，拥有丰富的交互设计经验。',
  },
  {
    id: 5,
    name: '钱七',
    age: 27,
    address: '广州市天河区',
    description: '钱七是测试工程师，负责自动化测试框架的搭建。',
  },
];

// ══════════════════════════════════════════════════
// 示例 1：基础展开
// ══════════════════════════════════════════════════
const basicExpandable: STableExpandable<UserData> = {};
const handleBasicExpandChange = (expanded: boolean, record: UserData) => {
  console.log('[Basic] expanded:', expanded, 'record:', record.name);
};

// ══════════════════════════════════════════════════
// 示例 2：受控展开
// ══════════════════════════════════════════════════
const expandedKeys = ref<(string | number)[]>([1]);

const controlledExpandable: STableExpandable<UserData> = {};

const expandAll = () => {
  expandedKeys.value = dataSource.map((d) => d.id);
};

const collapseAll = () => {
  expandedKeys.value = [];
};

// ══════════════════════════════════════════════════
// 示例 3：单行展开（手风琴模式）
// ══════════════════════════════════════════════════
const singleExpandable: STableExpandable<UserData> = {
  multiple: false,
};
const handleSingleExpandChange = (expanded: boolean, record: UserData) => {
  console.log('[Single] expanded:', expanded, 'record:', record.name);
};

// ══════════════════════════════════════════════════
// 示例 4：禁用部分行展开
// ══════════════════════════════════════════════════
const disabledExpandable: STableExpandable<UserData> = {
  isRowExpandable: (record) => record.id !== 3,
};
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; font-weight: 600">1. 基础展开（点击箭头展开/收起）</p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      :expandable="basicExpandable"
      row-key="id"
      @expand-change="handleBasicExpandChange"
    >
      <template #expandedRowRender="{ record }">
        <div style="padding: 8px 16px; background: #fff; border-radius: 6px">
          <p style="margin: 0; font-weight: 600; color: #1677ff">{{ record.name }} 的详细信息</p>
          <p style="margin: 8px 0 0; color: rgba(0, 0, 0, 0.65)">{{ record.description }}</p>
          <p style="margin: 8px 0 0; color: rgba(0, 0, 0, 0.45); font-size: 12px">
            地址：{{ record.address }} | 年龄：{{ record.age }}
          </p>
        </div>
      </template>
    </STable>

    <p style="margin: 24px 0 12px; font-weight: 600">
      2. 受控展开
      <span style="margin-left: 12px; font-weight: 400; font-size: 13px; color: #888">
        已展开：{{ expandedKeys.join(', ') || '无' }}
      </span>
    </p>
    <div style="margin-bottom: 8px; display: flex; gap: 8px">
      <button
        type="button"
        @click="expandAll"
        style="
          padding: 4px 12px;
          cursor: pointer;
          border: 1px solid #1677ff;
          border-radius: 4px;
          background: #1677ff;
          color: #fff;
        "
      >
        全部展开
      </button>
      <button
        type="button"
        @click="collapseAll"
        style="
          padding: 4px 12px;
          cursor: pointer;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          background: #fff;
        "
      >
        全部收起
      </button>
    </div>
    <STable
      :columns="columns"
      :data-source="dataSource"
      :expandable="controlledExpandable"
      v-model:expanded-row-keys="expandedKeys"
      row-key="id"
    >
      <template #expandedRowRender="{ record }">
        <div style="padding: 8px 16px; background: #fff; border-radius: 6px">
          <p style="margin: 0; color: rgba(0, 0, 0, 0.65)">{{ record.description }}</p>
        </div>
      </template>
    </STable>

    <p style="margin: 24px 0 12px; font-weight: 600">3. 单行展开（手风琴模式，同时只能展开一行）</p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      :expandable="singleExpandable"
      row-key="id"
      @expand-change="handleSingleExpandChange"
    >
      <template #expandedRowRender="{ record }">
        <div style="padding: 8px 16px; background: #fff; border-radius: 6px">
          <p style="margin: 0; color: rgba(0, 0, 0, 0.65)">{{ record.description }}</p>
        </div>
      </template>
    </STable>

    <p style="margin: 24px 0 12px; font-weight: 600">4. 禁用部分行展开（王五 id=3 不可展开）</p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      :expandable="disabledExpandable"
      row-key="id"
    >
      <template #expandedRowRender="{ record }">
        <div style="padding: 8px 16px; background: #fff; border-radius: 6px">
          <p style="margin: 0; color: rgba(0, 0, 0, 0.65)">{{ record.description }}</p>
        </div>
      </template>
    </STable>
  </div>
</template>
