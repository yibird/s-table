<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue';
import STable, { type STableColumn } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 80 },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'department', accessorKey: 'department', header: '部门' },
  { id: 'salary', accessorKey: 'salary', header: '月薪', align: 'right' },
];

const initialData = () => generateEmployees(12);
const dataSource = shallowRef(initialData());
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef');
const message = shallowRef('选择 CSV 文件后由业务侧解析并替换数据源。');

/** 解析一行 CSV，支持引号包裹的逗号与双引号转义。 */
const parseCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (quoted) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index++;
        } else {
          quoted = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
};

/** 表头别名：兼容中英文列名。 */
const FIELD_ALIASES: Record<string, keyof Employee> = {
  id: 'id',
  ID: 'id',
  name: 'name',
  姓名: 'name',
  age: 'age',
  年龄: 'age',
  city: 'city',
  城市: 'city',
  email: 'email',
  邮箱: 'email',
  department: 'department',
  部门: 'department',
  salary: 'salary',
  月薪: 'salary',
  joinDate: 'joinDate',
  入职日期: 'joinDate',
  address: 'address',
  地址: 'address',
};

const handleImportFile = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const text = (await file.text()).replace(/^\uFEFF/, '');
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
    if (lines.length < 2) throw new Error('CSV 至少需要表头与一行数据');
    const headers = parseCsvLine(lines[0]).map((header) => FIELD_ALIASES[header.trim()]);
    if (!headers.some(Boolean)) throw new Error('未识别到任何有效列名');
    const imported = lines.slice(1).map((line, rowIndex) => {
      const cells = parseCsvLine(line);
      const record: Partial<Employee> = {};
      headers.forEach((field, index) => {
        if (field) (record as Record<string, unknown>)[field] = cells[index] ?? '';
      });
      return {
        id: Number(record.id) || rowIndex + 1,
        name: record.name ?? '',
        age: Number(record.age) || 0,
        city: record.city ?? '',
        email: record.email ?? '',
        department: record.department ?? '',
        salary: Number(record.salary) || 0,
        joinDate: record.joinDate ?? '',
        address: record.address ?? '',
      } satisfies Employee;
    });
    dataSource.value = imported;
    message.value = `已从 ${file.name} 导入 ${imported.length} 行数据`;
  } catch (error) {
    message.value = `导入失败：${error instanceof Error ? error.message : String(error)}`;
  } finally {
    // 允许连续选择同一个文件。
    input.value = '';
  }
};

const resetData = () => {
  dataSource.value = initialData();
  message.value = '已恢复示例数据';
};
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <div style="display: flex; gap: 8px; margin-bottom: 12px">
      <button type="button" class="demo-button" @click="fileInputRef?.click()">导入 CSV</button>
      <button type="button" class="demo-button" @click="resetData">恢复示例数据</button>
      <input
        ref="fileInputRef"
        type="file"
        accept=".csv,text/csv"
        hidden
        @change="handleImportFile"
      />
    </div>
    <p style="margin: 0 0 12px; color: #666; font-size: 13px">{{ message }}</p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      row-key="id"
      :pagination="{ defaultPageSize: 8 }"
      style="max-height: 420px"
    />
  </div>
</template>

<style scoped>
.demo-button {
  padding: 5px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background-color 0.15s,
    color 0.15s;
}

.demo-button:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.demo-button:active {
  background-color: var(--vp-c-brand-soft);
}
</style>
