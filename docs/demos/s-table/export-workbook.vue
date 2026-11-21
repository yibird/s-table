<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import STable, { type STableColumn, type STableInstance } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 80 },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'department', accessorKey: 'department', header: '部门' },
  { id: 'salary', accessorKey: 'salary', header: '月薪', align: 'right' },
];

/** 自定义导出列：可以新增计算列，也可以调整字段顺序。 */
const workbookColumns = [
  { header: '姓名', getValue: (record: Employee) => record.name },
  { header: '部门', getValue: (record: Employee) => record.department },
  { header: '月薪', getValue: (record: Employee) => record.salary },
  { header: '年薪', getValue: (record: Employee) => record.salary * 12 },
];

const dataSource = shallowRef(generateEmployees(36));
const tableRef = ref<STableInstance<Employee>>();
const message = shallowRef('');

type Worksheet = { name: string; header: string[]; rows: unknown[][] };
type Workbook = { SheetNames: string[]; Sheets: Record<string, Worksheet> };

const buildWorksheet = (name: string, rows: Employee[]): Worksheet => ({
  name,
  header: workbookColumns.map((column) => column.header),
  rows: rows.map((record) => workbookColumns.map((column) => column.getValue(record))),
});

const buildWorkbook = (): Workbook => {
  const allSheet = buildWorksheet('全部数据', tableRef.value?.getAllData() ?? []);
  const pageSheet = buildWorksheet('当前页', tableRef.value?.getCurrentPageData() ?? []);
  return {
    SheetNames: [allSheet.name, pageSheet.name],
    Sheets: { [allSheet.name]: allSheet, [pageSheet.name]: pageSheet },
  };
};

const download = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const previewWorkbook = () => {
  const workbook = buildWorkbook();
  message.value = `工作簿包含 ${workbook.SheetNames.length} 个 Sheet：${workbook.SheetNames.join(
    ' / '
  )}，全部数据 ${workbook.Sheets['全部数据']?.rows.length ?? 0} 行。`;
};

const exportWorkbook = () => {
  const workbook = buildWorkbook();
  // 真实项目可替换为 xlsx / exceljs：
  // const XLSX = await import('xlsx');
  // const sheets = Object.fromEntries(workbook.SheetNames.map((name) => {
  //   const sheet = workbook.Sheets[name];
  //   return [name, XLSX.utils.aoa_to_sheet([sheet.header, ...sheet.rows])];
  // }));
  // XLSX.writeFile({ SheetNames: workbook.SheetNames, Sheets: sheets }, 'employees.xlsx');
  download(JSON.stringify(workbook, null, 2), 'employees-workbook.json', 'application/json');
  message.value = '已按工作簿结构导出 JSON，可交给 xlsx / exceljs 生成 .xlsx 文件。';
};
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px">
      <button type="button" @click="previewWorkbook">查看工作簿结构</button>
      <button type="button" @click="exportWorkbook">导出工作簿 JSON</button>
    </div>
    <p style="margin: 0 0 12px; color: #666; font-size: 13px">
      {{ message || '示例使用 getAllData / getCurrentPageData 组装多 Sheet 工作簿。' }}
    </p>
    <STable
      ref="tableRef"
      :columns="columns"
      :data-source="dataSource"
      row-key="id"
      :pagination="{ defaultPageSize: 8 }"
    />
  </div>
</template>
