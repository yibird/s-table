# STable 表格

STable 是面向 Vue 3 和 TypeScript 的数据表格组件。组件用稳定的公开类型描述列、状态和实例能力，内部使用 TanStack Table 计算行模型。

## 快速体验

基础用法只需要 `columns` 和 `dataSource`。涉及选择、展开、拖拽或虚拟滚动时，应同时提供稳定且唯一的 `rowKey`。

<demo vue="../demos/s-table/basic.vue" />

## 能力地图

| 领域     | 已支持能力                                                                  | 文档                                                                |
| -------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 基础展示 | 边框、斑马纹、三种尺寸、固定表头、空状态、加载状态                          | [基础用法](./s-table/basic)                                         |
| 列定义   | `accessorKey`、`accessorFn`、自定义表头和单元格、分组、固定、调整宽度、合并 | [列与单元格](./s-table/columns)                                     |
| 数据处理 | 单列/多列排序、受控排序、内置/自定义过滤、列搜索                            | [排序、过滤与搜索](./s-table/sorting-filtering)                     |
| 分页     | 受控/非受控分页、位置、页大小、序号列                                       | [分页与序号](./s-table/pagination)                                  |
| 选择     | Checkbox、Radio、禁用行、受控选中状态                                       | [行选择](./s-table/selection)                                       |
| 服务端   | 手动分页、排序和过滤                                                        | [服务端数据](./s-table/server-side)                                 |
| 展开     | 详情展开、树形数据、统一受控展开状态                                        | [展开行](./s-table/expandable) / [树形数据](./s-table/tree)         |
| 分组     | `groupBy` 行分组、列聚合、`#groupRow`、行固定                               | [列与单元格](./s-table/columns#行分组与聚合)                        |
| 编辑     | 单元格/整行编辑、异步校验、草稿状态、自定义编辑器                           | [单元格与整行编辑](./s-table/editing)                               |
| 大数据   | 动态/固定行高行虚拟化、列虚拟化、固定列、触底加载                           | [虚拟滚动](./s-table/virtual)                                       |
| 交互     | 单元格框选、键盘导航、右键菜单、完整行/单元格事件                           | [框选与右键菜单](./s-table/interactions) / [事件](./s-table/events) |
| 拖拽     | 行/列/树拖拽、多行拖拽、异步拦截、FLIP 动画                                 | [行列拖拽](./s-table/drag)                                          |
| 汇总     | Footer、Summary 汇总行                                                      | [插槽](./s-table/slots)                                             |
| 定制     | 插槽、语义化 class/style、CSS Variables、语言包                             | [插槽](./s-table/slots) / [样式与主题](./s-table/css)               |

## 状态模型

STable 对高频业务状态采用受控与非受控并存的设计：

- `selectedRowKeys` 与 `expandedRowKeys` 可通过 `v-model` 受控，也可使用对应的 `default*` 初始值。
- 分页通过 `pagination.current/pageSize/onChange` 受控，或通过 `defaultCurrent/defaultPageSize` 交给组件管理。
- 排序、过滤和列顺序默认由组件管理；`sorting`、列 `sortOrder` 和 `filteredValue` 可受控，需要接入后端时启用 `manualSorting`、`manualFiltering`、`manualPagination`。
- 树节点和详情展开共用 `expandedRowKeys`；行分组使用独立的分组展开状态，不能用 `expandedRowKeys` 控制。
- 编辑草稿可通过 `v-model:editing` 受控；行分组和固定行可通过 `v-model:groupBy` / `v-model:pinnedRowKeys` 受控。
- 高级场景可通过组件实例方法操作状态，或使用 `getTanStackTable()` 获取底层实例。

## 与 SurelyVue 的关系

STable 已覆盖 SurelyVue 的主要表格工作流，并额外提供完整的数据导入管线。它不是同名 API 的二进制兼容克隆：属性名、事件载荷和 Excel 导出格式存在差异，迁移时需要做薄适配。完整能力矩阵和替换边界参阅 [SurelyVue 迁移](./s-table/surelyvue-compat)。

## API 导航

- [完整 API](./s-table/api)
- [TypeScript 类型](./s-table/types)
- [最佳实践与性能](./s-table/best-practices)
- [常见问题](./s-table/faq)
