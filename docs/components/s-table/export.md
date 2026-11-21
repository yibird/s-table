# 导入与导出

表格内置 CSV 导出，并通过适配器接口支持 Excel。导出只读取当前行模型与可见列，不会修改页面状态。

## 实例 API

| 方法                        | 说明                                           |
| --------------------------- | ---------------------------------------------- |
| `exportCsv(options)`        | 同步返回 CSV 文本；`download: true` 时同时下载 |
| `exportCsvAsync(options)`   | 分块导出并返回 `Blob`，默认触发下载            |
| `exportExcel(options)`      | 通过适配器导出 Excel                           |
| `getAllData()`              | 获取过滤排序后、分页前的全部数据快照           |
| `getCurrentPageData()`      | 获取当前页数据快照                             |
| `getExportColumns(options)` | 获取本次导出使用的列                           |
| `getExportRows(source)`     | 获取指定来源的行                               |

数据来源支持 `all`（过滤排序后、分页前）、`currentPage`、`selected`，也可以直接传 `TData[]`。默认列会排除选择列、序号列、拖拽列等注入列以及隐藏列。

`getAllData()` / `getCurrentPageData()` 返回新的数组快照，元素仍是原始行对象，适合直接交给 `xlsx`、`exceljs` 等工具库。手动分页（`manualPagination`）时两者都返回当前 `dataSource`。

```ts
// CSV
const text = tableRef.value?.exportCsv({
  dataSource: 'currentPage',
  delimiter: ',',
  bom: true,
  preventFormulaInjection: true,
});

// 自定义列与格式化
await tableRef.value?.exportCsvAsync({
  dataSource: 'selected',
  columns: [
    { columnId: 'name', header: '姓名' },
    { columnId: 'salary', header: '月薪', getValue: (row) => row.salary * 12 },
  ],
  filename: 'selected.csv',
});
```

## Excel 适配器

核心不内置 `xlsx` 依赖，只产出与库无关的 `STableExcelSheet`。全局注册或单次传入适配器：

```ts
import {
  registerSTableExcelAdapter,
  type STableExcelAdapter,
} from '@zchengfeng/s-table-vue/export';

const adapter: STableExcelAdapter = {
  extension: 'xlsx',
  mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  async write(sheet) {
    // 在这里调用 xlsx / exceljs，把 sheet.columns / sheet.rows 写成文件
    return new Blob([JSON.stringify(sheet)]);
  },
};

registerSTableExcelAdapter(adapter);

await tableRef.value?.exportExcel({ dataSource: 'all', filename: 'employees.xlsx' });
```

## 导出示例

导出当前页 CSV、选中行 CSV 以及通过适配器生成 Excel 文件。

<demo vue="../../demos/s-table/export.vue" />

## 读取数据快照

自定义导出时，可以直接读取实例的当前行模型：

```ts
const allRows = tableRef.value?.getAllData() ?? [];
const pageRows = tableRef.value?.getCurrentPageData() ?? [];
```

两者都返回新的数组快照；当前页跟随分页、排序和过滤结果变化。

<demo vue="../../demos/s-table/export-data-api.vue" />

## 接入 xlsx / exceljs

组件不内置工作簿工具库。可以先用 `getAllData()` / `getCurrentPageData()` 和自定义列组装二维数据，再交给第三方库生成文件：

```ts
import * as XLSX from 'xlsx';

const rows = tableRef.value?.getAllData() ?? [];
const worksheet = XLSX.utils.aoa_to_sheet([
  ['姓名', '部门', '年薪'],
  ...rows.map((row) => [row.name, row.department, row.salary * 12]),
]);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, '员工');
XLSX.writeFile(workbook, 'employees.xlsx');
```

下面的示例演示多 Sheet 工作簿的数据组装；实际项目中把 JSON 下载替换为 `XLSX.writeFile` 或 `exceljs` 即可。

<demo vue="../../demos/s-table/export-workbook.vue" />

## 导入

组件不内置文件解析，导入由业务侧完成：读取文件内容、映射列名、校验数据，再替换 `dataSource`。下面的示例解析 CSV，并把识别后的行数据直接写回表格。

<demo vue="../../demos/s-table/import.vue" />

## 子路径导入

只使用导出工具、不渲染表格时可以走独立子路径，避免把组件代码带入：

```ts
import {
  buildCsvContent,
  buildCsvChunksAsync,
  registerSTableExcelAdapter,
} from '@zchengfeng/s-table-vue/export';
```
