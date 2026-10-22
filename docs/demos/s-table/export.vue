<script setup lang="ts">
import { ref, shallowRef, useTemplateRef } from 'vue';
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
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef');
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
    lastFile.value = `已从 ${file.name} 导入 ${imported.length} 行数据`;
  } catch (error) {
    lastFile.value = `导入失败：${error instanceof Error ? error.message : String(error)}`;
  } finally {
    // 允许连续选择同一个文件。
    input.value = '';
  }
};
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <div style="display: flex; gap: 8px; margin-bottom: 12px">
      <button type="button" @click="handleExportCsv">导出当前页 CSV</button>
      <button type="button" @click="handleExportSelected">导出选中行</button>
      <button type="button" @click="handleExportExcel">Excel 适配器导出</button>
      <button type="button" @click="fileInputRef?.click()">导入 CSV</button>
      <input
        ref="fileInputRef"
        type="file"
        accept=".csv,text/csv"
        hidden
        @change="handleImportFile"
      />
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
