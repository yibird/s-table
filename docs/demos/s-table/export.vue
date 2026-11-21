<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import STable, {
  type STableColumn,
  type STableExcelAdapter,
  type STableExcelSheet,
  type STableInstance,
} from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'department', accessorKey: 'department', header: '部门' },
  { id: 'salary', accessorKey: 'salary', header: '月薪' },
];

const dataSource = shallowRef(generateEmployees(20));
const tableRef = ref<STableInstance<Employee>>();
const lastFile = shallowRef('');

const escapeXml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * 用 SpreadsheetML 生成 Excel 可直接打开的 .xls 文件。
 * 真实项目也可换成 xlsx / exceljs，只要实现同一个适配器契约。
 */
const toSpreadsheetXml = (sheet: STableExcelSheet) => {
  const cell = (value: unknown) => {
    const isNumber = typeof value === 'number' && Number.isFinite(value);
    return `<Cell><Data ss:Type="${isNumber ? 'Number' : 'String'}">${escapeXml(value)}</Data></Cell>`;
  };
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${escapeXml(sheet.name)}">
  <Table>
   <Row>${sheet.columns.map((column) => cell(column.header)).join('')}</Row>
   ${sheet.rows.map((row) => `<Row>${row.map(cell).join('')}</Row>`).join('\n   ')}
  </Table>
 </Worksheet>
</Workbook>`;
};

const excelAdapter: STableExcelAdapter = {
  extension: 'xls',
  mimeType: 'application/vnd.ms-excel',
  write: async (sheet) => new Blob([toSpreadsheetXml(sheet)], { type: 'application/vnd.ms-excel' }),
};

const handleExportCsv = () => {
  const text =
    tableRef.value?.exportCsv({
      dataSource: 'currentPage',
      filename: 'employees-current-page.csv',
      download: true,
    }) ?? '';
  const rowCount = Math.max(text.split('\r\n').filter(Boolean).length - 1, 0);
  lastFile.value = `已下载当前页 CSV（${rowCount} 行）`;
};

const handleExportSelected = async () => {
  const selectedCount = tableRef.value?.getSelectedRowKeys().length ?? 0;
  if (!selectedCount) {
    lastFile.value = '请先勾选需要导出的行';
    return;
  }
  await tableRef.value?.exportCsvAsync({
    dataSource: 'selected',
    filename: 'selected.csv',
    download: true,
  });
  lastFile.value = `已导出 ${selectedCount} 行选中数据 CSV`;
};

const handleExportExcel = async () => {
  const result = await tableRef.value?.exportExcel({
    adapter: excelAdapter,
    dataSource: 'all',
    filename: 'employees.xls',
    download: true,
  });
  // 未注册 adapter 或导出失败时 result 为 undefined。
  lastFile.value = result ? '已通过适配器导出 Excel（.xls）' : 'Excel 导出失败';
};
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <div style="display: flex; gap: 8px; margin-bottom: 12px">
      <button type="button" class="demo-button" @click="handleExportCsv">导出当前页 CSV</button>
      <button type="button" class="demo-button" @click="handleExportSelected">导出选中行</button>
      <button type="button" class="demo-button" @click="handleExportExcel">Excel 适配器导出</button>
    </div>
    <p v-if="lastFile" style="margin: 0 0 12px; color: #666">{{ lastFile }}</p>
    <STable
      ref="tableRef"
      :columns="columns"
      :data-source="dataSource"
      row-key="id"
      :row-selection="{ type: 'checkbox' }"
      :pagination="{ defaultPageSize: 10 }"
      :virtual="{ rowHeight: 40 }"
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
