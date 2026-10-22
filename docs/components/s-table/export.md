# 导入与导出

表格内置 CSV 导出，并通过适配器接口支持 Excel。导出只读取当前行模型与可见列，不会修改页面状态。

## 实例 API

| 方法                        | 说明                                           |
| --------------------------- | ---------------------------------------------- |
| `exportCsv(options)`        | 同步返回 CSV 文本；`download: true` 时同时下载 |
| `exportCsvAsync(options)`   | 分块导出并返回 `Blob`，默认触发下载            |
| `exportExcel(options)`      | 通过适配器导出 Excel                           |
| `getExportColumns(options)` | 获取本次导出使用的列                           |
| `getExportRows(source)`     | 获取指定来源的行                               |

数据来源支持 `all`（过滤排序后、分页前）、`currentPage`、`selected`，也可以直接传 `TData[]`。默认列会排除选择列、序号列、拖拽列等注入列以及隐藏列。

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

演示中的导入由业务侧读取 CSV 并替换数据源，组件不内置文件解析。

<demo vue="../../demos/s-table/export.vue" />

## 子路径导入

只使用导出工具、不渲染表格时可以走独立子路径，避免把组件代码带入：

```ts
import {
  buildCsvContent,
  buildCsvChunksAsync,
  registerSTableExcelAdapter,
} from '@zchengfeng/s-table-vue/export';
```
