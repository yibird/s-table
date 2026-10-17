<script setup lang="ts">
import { ref, computed } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';

// ── 基础数据 ──
interface UserRecord {
  id: number;
  name: string;
  age: number;
  email: string;
  role: string;
}

const dataSource: UserRecord[] = [
  { id: 1, name: '张三', age: 28, email: 'zhangsan@example.com', role: '前端' },
  { id: 2, name: '李四', age: 32, email: 'lisi@example.com', role: '后端' },
  { id: 3, name: '王五', age: 25, email: 'wangwu@example.com', role: '设计' },
  { id: 4, name: '赵六', age: 30, email: 'zhaoliu@example.com', role: '产品' },
  { id: 5, name: '孙七', age: 27, email: 'sunqi@example.com', role: '前端' },
  { id: 6, name: '周八', age: 35, email: 'zhouba@example.com', role: '后端' },
];

const columns: STableColumn<UserRecord>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  { id: 'name', accessorKey: 'name', header: '姓名', width: 160 },
  { id: 'age', accessorKey: 'age', header: '年龄', width: 120 },
  { id: 'email', accessorKey: 'email', header: '邮箱', width: 280 },
  { id: 'role', accessorKey: 'role', header: '角色', width: 200 },
];

// ══════════════════════════════════════════════════
// 示例 1：简单文本 footer
// ══════════════════════════════════════════════════
const footerText = `共 ${dataSource.length} 条记录`;

// ══════════════════════════════════════════════════
// 示例 2：操作按钮 footer
// ══════════════════════════════════════════════════
const selectedRows = ref<number[]>([]);
const handleExport = () => alert('导出数据');
const handleBatchDelete = () => alert(`删除 ${selectedRows.value.length} 条`);

const selectionConfig = {
  type: 'checkbox' as const,
};

const actionColumns: STableColumn<UserRecord>[] = [...columns];

// ══════════════════════════════════════════════════
// 示例 3：统计信息 footer
// ══════════════════════════════════════════════════
const avgAge = computed(() => {
  const sum = dataSource.reduce((s, r) => s + r.age, 0);
  return (sum / dataSource.length).toFixed(1);
});
const roleCount = computed(() => {
  const map = new Map<string, number>();
  dataSource.forEach((r) => map.set(r.role, (map.get(r.role) ?? 0) + 1));
  return map;
});
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; font-weight: 600">1. 简单文本 Footer</p>
    <p style="margin: 0 0 8px; font-size: 13px; color: #666">
      通过 <code>#footer</code> 插槽在表格下方展示描述性文本。
    </p>
    <STable :columns="columns" :data-source="dataSource" :show-footer="true" row-key="id" bordered>
      <template #footer>
        <span style="color: rgba(0, 0, 0, 0.45)">📋 {{ footerText }}，数据更新于 2026-07-01</span>
      </template>
    </STable>

    <p style="margin: 32px 0 12px; font-weight: 600">2. 操作按钮 Footer</p>
    <p style="margin: 0 0 8px; font-size: 13px; color: #666">
      在 footer 中放置操作按钮，实现批量导出、删除等功能入口。
    </p>
    <STable
      :columns="actionColumns"
      :data-source="dataSource"
      :show-footer="true"
      :row-selection="selectionConfig"
      v-model:selected-row-keys="selectedRows"
      row-key="id"
      bordered
    >
      <template #footer>
        <div style="display: flex; align-items: center; gap: 12px">
          <span style="color: rgba(0, 0, 0, 0.45); font-size: 13px">
            已选 <strong style="color: #1677ff">{{ selectedRows.length }}</strong> 项
          </span>
          <button
            type="button"
            :disabled="selectedRows.length === 0"
            style="
              padding: 4px 12px;
              border: 1px solid #d9d9d9;
              border-radius: 4px;
              background: #fff;
              cursor: pointer;
              font-size: 13px;
            "
            @click="handleBatchDelete"
          >
            批量删除
          </button>
          <button
            type="button"
            style="
              padding: 4px 12px;
              border: 1px solid #1677ff;
              border-radius: 4px;
              background: #1677ff;
              color: #fff;
              cursor: pointer;
              font-size: 13px;
            "
            @click="handleExport"
          >
            导出数据
          </button>
        </div>
      </template>
    </STable>

    <p style="margin: 32px 0 12px; font-weight: 600">3. 统计信息 Footer</p>
    <p style="margin: 0 0 8px; font-size: 13px; color: #666">
      在 footer 中展示数据统计摘要，如平均年龄、角色分布等。
    </p>
    <STable :columns="columns" :data-source="dataSource" :show-footer="true" row-key="id" bordered>
      <template #footer>
        <div style="display: flex; align-items: center; gap: 24px; flex-wrap: wrap">
          <div style="font-size: 13px">
            <span style="color: rgba(0, 0, 0, 0.45)">总人数：</span>
            <strong>{{ dataSource.length }}</strong>
          </div>
          <div style="font-size: 13px">
            <span style="color: rgba(0, 0, 0, 0.45)">平均年龄：</span>
            <strong>{{ avgAge }}</strong>
          </div>
          <div style="font-size: 13px">
            <span style="color: rgba(0, 0, 0, 0.45)">角色分布：</span>
            <span v-for="[role, count] in roleCount" :key="role" style="margin-right: 8px">
              <span
                style="
                  display: inline-block;
                  padding: 0 6px;
                  border-radius: 4px;
                  background: #f0f5ff;
                  color: #1677ff;
                  font-size: 12px;
                "
              >
                {{ role }} × {{ count }}
              </span>
            </span>
          </div>
        </div>
      </template>
    </STable>

    <p style="margin: 32px 0 12px; font-weight: 600">4. 自定义布局 Footer</p>
    <p style="margin: 0 0 8px; font-size: 13px; color: #666">
      在 footer 中放置任意 HTML 内容，实现复杂的自定义布局。
    </p>
    <STable :columns="columns" :data-source="dataSource" :show-footer="true" row-key="id" bordered>
      <template #footer>
        <div
          style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: #fafafa;
            border-radius: 6px;
          "
        >
          <div style="display: flex; gap: 16px; align-items: center">
            <span style="font-size: 13px; color: rgba(0, 0, 0, 0.65)">
              💡 提示：双击行可查看详情
            </span>
          </div>
          <div style="display: flex; gap: 8px; align-items: center">
            <button
              type="button"
              style="
                padding: 3px 10px;
                border: 1px solid #d9d9d9;
                border-radius: 4px;
                background: #fff;
                cursor: pointer;
                font-size: 12px;
              "
            >
              刷新
            </button>
            <button
              type="button"
              style="
                padding: 3px 10px;
                border: 1px solid #52c41a;
                border-radius: 4px;
                background: #fff;
                color: #52c41a;
                cursor: pointer;
                font-size: 12px;
              "
            >
              新增
            </button>
            <button
              type="button"
              style="
                padding: 3px 10px;
                border: 1px solid #1677ff;
                border-radius: 4px;
                background: #1677ff;
                color: #fff;
                cursor: pointer;
                font-size: 12px;
              "
            >
              保存
            </button>
          </div>
        </div>
      </template>
    </STable>
  </div>
</template>
