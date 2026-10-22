# API

本页内容对应当前包入口实际导出的组件和类型。泛型 `TData` 表示单行数据类型。

## STable Props

| 属性                     | 类型                                                  | 默认值        | 必填 | 描述                                                |
| ------------------------ | ----------------------------------------------------- | ------------- | ---- | --------------------------------------------------- |
| `dataSource`             | `TData[]`                                             | `[]`          | 否   | 数据源；默认使用不可变更新                          |
| `columns`                | `STableColumn<TData>[]`                               | `[]`          | 否   | 列定义                                              |
| `rowKey`                 | `keyof TData \| (record => string \| number)`         | 数组索引      | 否   | 行唯一标识                                          |
| `bordered`               | `boolean`                                             | `false`       | 否   | 显示边框                                            |
| `striped`                | `boolean`                                             | `false`       | 否   | 显示斑马纹                                          |
| `size`                   | `'small' \| 'middle' \| 'large'`                      | `'middle'`    | 否   | 表格尺寸                                            |
| `loading`                | `boolean`                                             | `false`       | 否   | 显示加载遮罩                                        |
| `showHeader`             | `boolean`                                             | `true`        | 否   | 渲染表头                                            |
| `fixedHeader`            | `boolean`                                             | `true`        | 否   | 滚动时固定表头                                      |
| `getPopupContainer`      | `(trigger) => HTMLElement \| null`                    | `body`        | 否   | 统一浮层挂载容器                                    |
| `title`                  | `VNodeChild \| ((ctx) => VNodeChild)`                 | -             | 否   | 表格标题，作用域含 `currentPageData`                |
| `footer`                 | `VNodeChild \| ((ctx) => VNodeChild)`                 | -             | 否   | 页脚，作用域含分页信息                              |
| `summaryFixed`           | `boolean`                                             | `false`       | 否   | 汇总栏固定在滚动容器底部                            |
| `breakpoints`            | `Partial<Record<STableBreakpoint, number>>`           | -             | 否   | 响应式断点阈值                                      |
| `defaultBreakpoint`      | `STableBreakpoint`                                    | `'lg'`        | 否   | SSR / 首帧断点                                      |
| `deepWatchDataSource`    | `boolean`                                             | `false`       | 否   | 深度监听数据源嵌套字段                              |
| `deepWatchColumns`       | `boolean`                                             | `false`       | 否   | 深度监听列配置                                      |
| `ignoreCellKey`          | `boolean`                                             | `false`       | 否   | 渲染缓存忽略行索引/列 token                         |
| `preserveRow`            | `boolean`                                             | `false`       | 否   | 按 row.id 保留已测量行高                            |
| `filterDropdownOpenKeys` | `string[]`                                            | -             | 否   | 受控筛选面板打开列集合                              |
| `customRow`              | `(record, index) => Record<string, unknown>`          | -             | 否   | 注入 `<tr>` 属性                                    |
| `customCell`             | `(record, index, column) => Record<string, unknown>`  | -             | 否   | 注入 `<td>` 属性                                    |
| `customHeaderCell`       | `(column) => Record<string, unknown>`                 | -             | 否   | 注入 `<th>` 属性                                    |
| `columnResizeMode`       | `'onChange' \| 'onEnd'`                               | `'onEnd'`     | 否   | 列宽更新时机                                        |
| `rowSelection`           | `STableRowSelection<TData>`                           | -             | 否   | 选择列行为配置                                      |
| `selectedRowKeys`        | `STableRowKey[]`                                      | -             | 否   | 受控选择键集合                                      |
| `defaultSelectedRowKeys` | `STableRowKey[]`                                      | `[]`          | 否   | 非受控选择初始值                                    |
| `selectionIntent`        | `STableSelectionIntent`                               | -             | 否   | 大数据选择意图；传入即开启 intent 模式              |
| `defaultSelectionIntent` | `STableSelectionIntent`                               | -             | 否   | 非受控选择意图初始值                                |
| `expandedRowKeys`        | `STableRowKey[]`                                      | -             | 否   | 受控展开键集合                                      |
| `defaultExpandedRowKeys` | `STableRowKey[]`                                      | `[]`          | 否   | 非受控展开初始值                                    |
| `pagination`             | `boolean \| STablePaginationProps`                    | -             | 否   | 分页开关或配置                                      |
| `paginationPlacement`    | `PaginationPlacement \| PaginationPlacement[]`        | `'bottomEnd'` | 否   | 分页位置，数组可同时渲染多处分页                    |
| `manualPagination`       | `boolean`                                             | `false`       | 否   | 禁用客户端分页切片                                  |
| `manualSorting`          | `boolean`                                             | `false`       | 否   | 禁用客户端排序                                      |
| `manualFiltering`        | `boolean`                                             | `false`       | 否   | 禁用客户端过滤和搜索                                |
| `sorting`                | `STableSortItem[]`                                    | -             | 否   | 受控多列排序状态                                    |
| `defaultSorting`         | `STableSortItem[]`                                    | `[]`          | 否   | 非受控排序初始值                                    |
| `multiSort`              | `boolean`                                             | `false`       | 否   | 允许修饰键累积排序                                  |
| `virtual`                | `boolean \| STableVirtualProps`                       | `false`       | 否   | 启用横向/纵向虚拟化                                 |
| `allowUnsafeFullRender`  | `boolean`                                             | `false`       | 否   | 显式关闭大规模非虚拟渲染告警                        |
| `tree`                   | `STableTree<TData>`                                   | -             | 否   | 树形数据读取/写回                                   |
| `groupBy`                | `string[]`                                            | -             | 否   | 受控行分组列 ID；与 `tree` 互斥                     |
| `defaultGroupBy`         | `string[]`                                            | `[]`          | 否   | 非受控行分组初始值                                  |
| `pinnedRowKeys`          | `STablePinnedRowKeys`                                 | -             | 否   | 受控固定行键                                        |
| `defaultPinnedRowKeys`   | `STablePinnedRowKeys`                                 | -             | 否   | 非受控固定行初始值                                  |
| `defaultExpandAllRows`   | `boolean`                                             | `false`       | 否   | 初始展开全部节点                                    |
| `expandRowByClick`       | `boolean`                                             | `false`       | 否   | 点击行切换展开                                      |
| `expandable`             | `STableExpandable<TData>`                             | -             | 否   | 展开列行为配置                                      |
| `editConfig`             | `STableEditConfig<TData>`                             | -             | 否   | 编辑模式、触发和校验                                |
| `editing`                | `STableEditingState \| null`                          | -             | 否   | 受控编辑草稿                                        |
| `defaultEditing`         | `STableEditingState \| null`                          | `null`        | 否   | 非受控编辑初始值                                    |
| `rowClassName`           | `string \| ((record, index) => string)`               | -             | 否   | 逐行 class                                          |
| `rowStyle`               | `CSSProperties \| ((record, index) => CSSProperties)` | -             | 否   | 逐行 style                                          |
| `seq`                    | `boolean \| STableSeq<TData>`                         | `false`       | 否   | 启用序号列                                          |
| `cellRangeSelection`     | `STableCellRangeSelection`                            | -             | 否   | 框选模式配置                                        |
| `onCellRangeCopy`        | `(payload) => boolean \| void`                        | -             | 否   | 返回 false 时不写入框选文本，也不拦截浏览器原生复制 |
| `keyboardNavigation`     | `boolean`                                             | `true`        | 否   | 单元格焦点与方向键                                  |
| `rowDrag`                | `boolean \| fn \| STableRowDragConfig<TData>`         | `false`       | 否   | 行拖拽开关、按行判定函数或配置                      |
| `columnDrag`             | `STableColumnDragConfig<TData>`                       | -             | 否   | 列拖拽动画与拦截                                    |
| `styles`                 | `STableStyles`                                        | -             | 否   | 语义化内联样式                                      |
| `classes`                | `STableClasses`                                       | -             | 否   | 语义化 class                                        |
| `locale`                 | `STableLocaleOverrides`                               | `en_US`       | 否   | 局部语言包覆盖                                      |

```ts
interface TableProps<TData> extends STableProps<TData> {}
```

## STable Events

Vue 模板中使用 kebab-case 事件名，TypeScript 类型保留源码中的 camelCase 键。

| Event                               | 参数                                           | 触发时机                              |
| ----------------------------------- | ---------------------------------------------- | ------------------------------------- |
| `filterDropdownOpenChange`          | `columnId, open`                               | 筛选面板请求切换打开状态              |
| `update:dataSource`                 | `dataSource: TData[]`                          | 编辑/行拖拽不可变提交                 |
| `update:selectedRowKeys`            | `keys: STableRowKey[]`                         | 受控选择状态变化；intent 策略下不触发 |
| `selectChange`                      | `keys, rows, info`                             | 行选择变化完成；intent 策略下不触发   |
| `update:selectionIntent`            | `intent: STableSelectionIntent`                | 受控选择意图变化                      |
| `selectionIntentChange`             | `intent, info`                                 | 选择意图变化；不物化全量键            |
| `update:expandedRowKeys`            | `keys: STableRowKey[]`                         | 受控展开状态变化                      |
| `update:groupBy`                    | `groupBy: string[]`                            | 受控行分组变化                        |
| `groupByChange`                     | `groupBy: string[]`                            | 行分组变化完成                        |
| `update:pinnedRowKeys`              | `keys: STablePinnedRowKeys`                    | 受控固定行变化                        |
| `pinnedRowsChange`                  | `keys: STablePinnedRowKeys`                    | 固定行变化完成                        |
| `update:sorting`                    | `sorting: STableSortItem[]`                    | 受控排序状态变化                      |
| `update:editing`                    | `editing: STableEditingState \| null`          | 受控编辑草稿变化                      |
| `editPatch`                         | `STableEditPatch<TData>`                       | patch 编辑提交                        |
| `expandChange`                      | `expanded: boolean, record: TData`             | 单行展开或收起                        |
| `columnResizeStart`                 | `payload: STableColumnResizeEvent<TData>`      | 开始拖拽列宽                          |
| `columnResizeEnd`                   | `payload: STableColumnResizeEvent<TData>`      | 结束拖拽列宽                          |
| `cellRangeChange`                   | `range: STableCellRange \| null`               | 框选范围变化或清空                    |
| `cellRangeSelect`                   | `range, records`                               | 一次框选完成                          |
| `scrollToBottom`                    | 无                                             | 到达配置的触底阈值                    |
| `columnOrderChange`                 | `{ columns, columnOrder, fromIndex, toIndex }` | 列拖拽完成                            |
| `rowOrderChange`                    | `STableRowOrderChangeEvent<TData>`             | 行/多行/树拖拽完成                    |
| `sortChange`                        | `{ columnId, order, sorting, reason }`         | 排序状态变化                          |
| `filterChange`                      | `{ filters, searches }`                        | 过滤或搜索状态变化                    |
| `pageChange`                        | `{ page, pageSize }`                           | 页码或页大小变化                      |
| `rowClick` / `rowDoubleClick`       | `STableRowEvent<TData, MouseEvent>`            | 行点击/双击                           |
| `rowContextMenu`                    | `STableRowEvent<TData, MouseEvent>`            | 行右键                                |
| `rowMouseenter` / `rowMouseleave`   | `STableRowEvent<TData, MouseEvent>`            | 行悬浮边界                            |
| `cellClick` / `cellDoubleClick`     | `STableCellEvent<TData, MouseEvent>`           | 单元格点击/双击                       |
| `cellContextMenu`                   | `STableCellEvent<TData, MouseEvent>`           | 单元格右键                            |
| `cellMouseenter` / `cellMouseleave` | `STableCellEvent<TData, MouseEvent>`           | 单元格悬浮边界                        |
| `cellKeydown`                       | `STableCellEvent<TData, KeyboardEvent>`        | 单元格键盘输入                        |
| `editStart` / `editChange`          | `editing, record`                              | 编辑开始/草稿变化                     |
| `editCommit`                        | `editing, record, nextRecord`                  | 编辑提交成功                          |
| `editCancel`                        | `editing, record`                              | 编辑取消                              |
| `editValidateError`                 | `message, editing, record`                     | 编辑校验失败                          |

```ts
type TableEmits<TData> = STableEmits<TData>;
```

`sortChange.sorting` 始终是完整的多列排序快照；无排序时为空数组。`reason` 为 `user` 或 `column-removed`；当排序列从新列定义中消失时，组件会被动清空排序。

## STable Methods

通过带泛型的 `STableInstance<TData>` 标注组件引用。

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue';
import type { STableInstance } from '@zchengfeng/s-table-vue';

const tableRef = useTemplateRef<STableInstance<User>>('table');

function resetQueryState() {
  tableRef.value?.clearSort();
  tableRef.value?.clearFilter();
  tableRef.value?.clearSearch();
}
</script>

<template>
  <STable ref="table" :columns="columns" :data-source="dataSource" />
</template>
```

| 方法                 | 参数                         | 返回值                        | 用途                                             |
| -------------------- | ---------------------------- | ----------------------------- | ------------------------------------------------ |
| `getTanStackTable`   | 无                           | `Table<TableFeatures, TData>` | 获取底层 TanStack 实例                           |
| `getSelectedRows`    | 无                           | `TData[]`                     | 获取当前可解析的选中行快照                       |
| `getSelectedRowKeys` | 无                           | `STableRowKey[]`              | 获取选中键快照；intent `all` 模式返回 `[]`       |
| `getSelectionIntent` | 无                           | `STableSelectionIntent`       | 获取选择意图快照                                 |
| `setSelectionIntent` | `intent`                     | `void`                        | 设置选择意图                                     |
| `selectAll`          | 无                           | `void`                        | 选择可选行                                       |
| `clearSelection`     | 无                           | `void`                        | 清空选择                                         |
| `toggleRowSelection` | `row, selected?`             | `void`                        | 切换或设置指定行选择状态                         |
| `clearSort`          | 无                           | `void`                        | 清空排序                                         |
| `getSorting`         | 无                           | `STableSortItem[]`            | 获取多列排序快照                                 |
| `setSorting`         | `STableSortItem[]`           | `void`                        | 设置完整多列排序                                 |
| `clearFilter`        | 无                           | `void`                        | 清空列过滤                                       |
| `clearSearch`        | 无                           | `void`                        | 清空列搜索                                       |
| `getEditing`         | 无                           | `STableEditingState \| null`  | 获取当前编辑草稿快照                             |
| `startCellEdit`      | `rowKey, columnId`           | `boolean`                     | 打开单元格编辑                                   |
| `startRowEdit`       | `rowKey`                     | `boolean`                     | 打开整行编辑                                     |
| `setEditValue`       | `columnId, value`            | `void`                        | 更新草稿值                                       |
| `commitEdit`         | 无                           | `Promise<boolean>`            | 校验并提交草稿                                   |
| `cancelEdit`         | 无                           | `void`                        | 取消草稿                                         |
| `copyCellRange`      | `options?`                   | `Promise<string>`             | 复制当前框选；拒绝或无范围时返回空串             |
| `getExpandedRowKeys` | 无                           | `STableRowKey[]`              | 获取展开键快照                                   |
| `toggleExpand`       | `rowKey`                     | `void`                        | 切换指定行展开状态                               |
| `expandRow`          | `rowKey`                     | `void`                        | 展开指定行                                       |
| `collapseRow`        | `rowKey`                     | `void`                        | 收起指定行                                       |
| `expandAll`          | 无                           | `void`                        | 展开所有可展开行                                 |
| `collapseAll`        | 无                           | `void`                        | 收起所有行                                       |
| `getGroupBy`         | 无                           | `string[]`                    | 获取当前分组列 ID 快照                           |
| `setGroupBy`         | `groupBy: string[]`          | `void`                        | 设置分组列；数组顺序即层级                       |
| `expandAllGroups`    | 无                           | `void`                        | 展开全部分组行                                   |
| `collapseAllGroups`  | 无                           | `void`                        | 折叠全部分组行                                   |
| `toggleGroup`        | `groupRowId: string`         | `void`                        | 切换指定分组行展开状态                           |
| `pinRow`             | `rowKey, position`           | `boolean`                     | 固定到顶/底，或 `false` 取消；行不存在返回 false |
| `getPinnedRowKeys`   | 无                           | `STablePinnedRowKeys`         | 获取固定行键快照                                 |
| `scrollToRow`        | `rowKey`                     | `boolean`                     | 定位指定行；发起滚动时返回 true                  |
| `scrollToTop`        | 无                           | `void`                        | 滚动到顶部                                       |
| `scrollToBottom`     | 无                           | `void`                        | 滚动到底部                                       |
| `scrollToColumn`     | `columnId`                   | `boolean`                     | 横向定位指定列                                   |
| `getScrollPosition`  | 无                           | `{ left, top }`               | 获取滚动位置快照                                 |
| `scrollTo`           | `{ left?, top?, behavior? }` | `void`                        | 设置横纵滚动位置                                 |
| `getCellRange`       | 无                           | `STableCellRange \| null`     | 获取框选范围快照                                 |
| `clearCellRange`     | 无                           | `void`                        | 清空框选                                         |
| `getColumnOrder`     | 无                           | `string[]`                    | 获取用户叶子列 ID 顺序                           |
| `setColumnOrder`     | `nextOrder: string[]`        | `void`                        | 设置列顺序并规范无效/缺失 ID                     |
| `resetColumnOrder`   | 无                           | `void`                        | 恢复声明顺序                                     |
| `swapColumns`        | `columnIdA, columnIdB`       | `void`                        | 交换两列                                         |
| `moveColumn`         | `columnId, targetColumnId`   | `void`                        | 移动列到目标列位置                               |
| `moveColumnByIndex`  | `fromIndex, toIndex`         | `void`                        | 按叶子列索引移动                                 |

`rowSelection.strategy = 'intent'` 时请使用 `v-model:selection-intent` / `getSelectionIntent()`。`getSelectedRowKeys()` 在 `mode: 'all'` 时返回空数组，且不会触发 `selectChange` 或 `update:selectedRowKeys`。

`scrollToRow` 在需要翻页时会先切页再滚动，此时立即返回 `true` 表示已发起定位，不保证虚拟窗口已经滚到目标行。

行分组与树形数据互斥（`tree` 优先，分组被忽略）。分组展开占用独立 id 空间，`expandedRowKeys` 不能控制分组行。

## Slots

列头和单元格通过列定义的 `header` / `cell` 渲染，不走命名插槽。完整说明见 [插槽](./slots)。

| Slot                | 作用域                         | 描述                 |
| ------------------- | ------------------------------ | -------------------- |
| `empty`             | 无                             | 替换空状态           |
| `emptyAction`       | 无                             | 默认空状态后的操作区 |
| `loading`           | 无                             | 替换加载指示器       |
| `expandedRowRender` | `record`, `index`, `expanded`  | 展开行内容           |
| `contextMenu`       | `row`, `rowIndex`, `close`     | 行右键菜单           |
| `scrollToBottom`    | 无                             | 触底状态内容         |
| `rowDragHandle`     | `record`, `index`              | 行拖拽句柄           |
| `cellEditor`        | `STableCellEditorSlotContext`  | 自定义单元格编辑器   |
| `filterPanel`       | `STableFilterPanelSlotContext` | 自定义列过滤面板     |
| `groupRow`          | `STableGroupRowSlotContext`    | 自定义整行分组内容   |
| `summary`           | 无                             | `<tfoot>` 汇总       |
| `footer`            | 无                             | 表格下方页脚         |

## Column API

| 属性                    | 类型                                        | 默认值                  | 描述                                    |
| ----------------------- | ------------------------------------------- | ----------------------- | --------------------------------------- |
| `id`                    | `string`                                    | 由 `accessorKey` 推导   | 列唯一 ID；函数取值、展示列和分组列必填 |
| `accessorKey`           | `STableAccessorKey<TData>`                  | -                       | 数据字段或嵌套路径                      |
| `accessorFn`            | `(record, index) => TValue`                 | -                       | 自定义取值函数，与 `accessorKey` 互斥   |
| `header`                | `VNodeChild \| (ctx => VNodeChild)`         | -                       | 表头内容                                |
| `cell`                  | `VNodeChild \| (ctx => VNodeChild)`         | -                       | 单元格内容                              |
| `footer`                | `VNodeChild \| (ctx => VNodeChild)`         | -                       | 列 Footer 渲染定义                      |
| `meta`                  | `Record<string, unknown>`                   | -                       | 用户列元数据                            |
| `columns`               | `STableColumn<TData>[]`                     | -                       | 分组列的子列                            |
| `width`                 | `number`                                    | -                       | 列宽 px                                 |
| `minWidth`              | `number`                                    | -                       | 最小列宽 px                             |
| `maxWidth`              | `number`                                    | -                       | 最大列宽 px                             |
| `align`                 | `'left' \| 'center' \| 'right'`             | `'left'`                | 内容对齐                                |
| `fixed`                 | `'left' \| 'right'`                         | -                       | 固定位置                                |
| `draggable`             | `boolean`                                   | `false`                 | 是否允许列拖拽                          |
| `resizable`             | `boolean`                                   | `false`                 | 是否允许调整列宽                        |
| `hidden`                | `boolean`                                   | `false`                 | 初始隐藏                                |
| `sorter`                | `boolean \| ((a, b) => number)`             | -                       | 启用默认或自定义排序                    |
| `sortDirections`        | `STableSortOrder[]`                         | `['ascend', 'descend']` | 允许排序方向                            |
| `defaultSortOrder`      | `STableSortOrder`                           | -                       | 默认排序方向                            |
| `sortOrder`             | `STableSortOrder \| null`                   | -                       | 受控排序方向；`null` 表示受控且不排序   |
| `filters`               | `STableFilterOption[]`                      | -                       | 过滤选项                                |
| `onFilter`              | `(value, record) => boolean`                | -                       | 客户端过滤判断                          |
| `filterMode`            | `'checkbox' \| 'menu' \| 'custom'`          | `'checkbox'`            | 过滤 UI 模式                            |
| `filterMultiple`        | `boolean`                                   | `true`                  | 是否多选过滤值                          |
| `defaultFilteredValues` | `(string \| number \| boolean)[]`           | -                       | 默认过滤值                              |
| `filteredValue`         | `(string \| number \| boolean)[]`           | -                       | 受控过滤值                              |
| `search`                | `boolean \| ((value, record) => boolean)`   | `false`                 | 启用默认或自定义列搜索                  |
| `editable`              | `boolean \| ((record, index) => boolean)`   | `false`                 | 是否允许编辑                            |
| `editableTrigger`       | `'click' \| 'dblclick' \| 'manual'`         | 表格配置                | 列级编辑触发                            |
| `editor`                | `'text' \| 'number' \| 'checkbox'`          | `'text'`                | 内置编辑器类型                          |
| `valueParser`           | `(value, record, index) => TValue`          | -                       | 草稿值类型转换                          |
| `valueSetter`           | `(record, value) => TData`                  | -                       | 自定义不可变写回                        |
| `spanRows`              | TanStack cell spanning 配置                 | -                       | 合并相邻等值行                          |
| `spanColumns`           | TanStack cell spanning 配置                 | -                       | 声明跨列数量                            |
| `onCell`                | `(record, rowIndex) => STableCellProps`     | -                       | 返回 `rowSpan` / `colSpan`              |
| `groupable`             | `boolean`                                   | `false`                 | 是否允许该列参与 `groupBy`              |
| `getGroupingValue`      | `(record) => unknown`                       | 列 accessor             | 自定义分组值                            |
| `aggregation`           | 内置聚合名或 `(values, records) => unknown` | -                       | 分组行上该列的聚合方式                  |
| `aggregatedCell`        | `VNodeChild \| (ctx => VNodeChild)`         | 聚合结果文本            | 分组行聚合单元格渲染                    |

## Pagination 配置

| 属性                                           | 类型                       | 默认值           | 描述                       |
| ---------------------------------------------- | -------------------------- | ---------------- | -------------------------- |
| `current` / `pageSize`                         | `number`                   | `1` / `10`       | 受控页码和页大小           |
| `defaultCurrent` / `defaultPageSize`           | `number`                   | `1` / `10`       | 非受控初始值               |
| `total`                                        | `number`                   | 数据行数         | 数据总数                   |
| `pageCount`                                    | `number`                   | 由总数推算       | 服务端已知总页数时覆盖推算 |
| `disabled`                                     | `boolean`                  | `false`          | 禁用分页器                 |
| `showQuickJumper`                              | `boolean`                  | `false`          | 快速跳页                   |
| `showSizeChanger`                              | `boolean`                  | `false`          | 页大小选择器               |
| `showTotal`                                    | `(total, range) => string` | -                | 总数与范围文案             |
| `pageSizeOptions`                              | `number[]`                 | `[10,20,50,100]` | 页大小选项                 |
| `onChange`                                     | `(page, pageSize) => void` | -                | 分页变化回调               |
| `jumpToText` / `pageText` / `itemsPerPageText` | `string`                   | 语言包           | 文案覆盖                   |
| `selectPlaceholder` / `selectEmptyText`        | `string`                   | 语言包           | 页大小选择器文案           |

`size` 和 `compact` 来自基础分页类型，但 STable 的分页桥接层当前不向内部分页器转发这两个字段，不应依赖它们改变表格分页器外观。

## RowSelection 配置

| 属性                      | 类型                                                 | 默认值       | 描述                                |
| ------------------------- | ---------------------------------------------------- | ------------ | ----------------------------------- |
| `type`                    | `'checkbox' \| 'radio'`                              | `'checkbox'` | 选择类型                            |
| `align`                   | `'left' \| 'center' \| 'right'`                      | `'center'`   | 选择列对齐                          |
| `columnWidth`             | `number \| string`                                   | `62` 或 `52` | 选择列宽度                          |
| `fixed`                   | `boolean`                                            | `true`       | 固定选择列                          |
| `hideSelectAll`           | `boolean`                                            | `false`      | 隐藏全选与批量菜单                  |
| `selections`              | `STableSelectionOption<TData>[]`                     | `[]`         | 自定义批量选择项                    |
| `strategy`                | `'keys' \| 'intent'`                                 | `'keys'`     | 选择状态表达方式；大数据使用 intent |
| `preserveSelectedRowKeys` | `boolean`                                            | `false`      | 数据移除后保留键                    |
| `getCheckboxProps`        | `(record) => STableCheckboxProps`                    | -            | 行选择控件属性                      |
| `getTitleCheckboxProps`   | `() => STableCheckboxProps`                          | -            | 表头全选控件属性                    |
| `renderCell`              | `(checked, record, index, originNode) => VNodeChild` | -            | 自定义选择单元格                    |

`strategy: 'intent'`，或传入 `selectionIntent` / `defaultSelectionIntent`，都会开启意图模式。此时选择状态只走 `selectionIntent`。`v-model:selectedRowKeys`、`selectChange` 和 `getSelectedRowKeys()`（`mode: 'all'` 时）都不会反映“当前全选了哪些行”；批量操作应把意图和例外键交给服务端解释。

## 其他配置

### STableVirtualProps

| 属性                   | 类型                                                 | 默认值 | 描述                          |
| ---------------------- | ---------------------------------------------------- | ------ | ----------------------------- |
| `y`                    | `boolean`                                            | -      | 启用纵向行虚拟化              |
| `x`                    | `boolean`                                            | -      | 启用横向中心列虚拟化          |
| `estimateSize`         | `number`                                             | `47`   | 动态行高初始估值              |
| `rowHeight`            | `number \| ((record, index) => number \| undefined)` | -      | 固定行高或按行返回高度        |
| `buffer`               | `number \| { x?: number; y?: number }`               | -      | 统一横纵缓冲，优先于 overscan |
| `overscan`             | `number`                                             | `15`   | 视口上下额外渲染行数          |
| `scrollToBottomOffset` | `number`                                             | `50`   | 触底阈值 px                   |
| `columnOverscan`       | `number`                                             | `3`    | 视口外额外渲染的中心列数      |
| `columnEstimateSize`   | `number`                                             | `150`  | 未配置宽度列的预估宽度 px     |

`virtual: true` 为兼容旧 API，仅开启纵向虚拟化。对象模式下 `x`、`y` 必须显式声明。

### STableTree

| 属性                 | 类型                               | 默认值       | 描述                  |
| -------------------- | ---------------------------------- | ------------ | --------------------- |
| `childrenColumnName` | `string`                           | `'children'` | 子节点字段            |
| `getChildren`        | `(record) => TData[] \| undefined` | -            | 自定义读取子节点      |
| `setChildren`        | `(record, children) => TData`      | -            | 编辑/拖拽时不可变写回 |
| `indentSize`         | `number`                           | `16`         | 每层缩进 px           |

### STableEditConfig

| 属性             | 类型                                                         | 默认值         | 描述                       |
| ---------------- | ------------------------------------------------------------ | -------------- | -------------------------- |
| `mode`           | `'cell' \| 'row'`                                            | `'cell'`       | 单元格或整行编辑           |
| `trigger`        | `'click' \| 'dblclick' \| 'manual'`                          | `'dblclick'`   | 表格级触发方式             |
| `commitOnBlur`   | `boolean`                                                    | `false`        | 编辑器失焦时提交           |
| `updateMode`     | `'dataSource' \| 'patch'`                                    | `'dataSource'` | 提交完整数组或只派发 patch |
| `getRowEditable` | `(record, rowIndex) => boolean`                              | -              | 按行控制编辑               |
| `validate`       | `(values, record, rowIndex) => boolean \| string \| Promise` | -              | 提交前校验                 |

### STableRowDragConfig

| 属性                | 类型                                          | 默认值     | 描述                                      |
| ------------------- | --------------------------------------------- | ---------- | ----------------------------------------- |
| `trigger`           | `'handle' \| 'row'`                           | `'handle'` | 拖拽触发区域（手柄或整行）                |
| `ghost`             | `({ record, index }) => VNode \| HTMLElement` | -          | 自定义拖拽预览                            |
| `animation`         | `boolean`                                     | `false`    | 启用行 FLIP 动画                          |
| `multiple`          | `boolean`                                     | `false`    | 拖动选中行有序块                          |
| `allowTreeReparent` | `boolean`                                     | `false`    | 允许投放到树节点内部                      |
| `canDrag`           | `({ record, index }) => boolean`              | -          | 拖拽开始前判定，返回 `false` 阻止该行拖拽 |
| `beforeDrop`        | `(payload) => boolean \| Promise<boolean>`    | -          | 提交移动前拦截                            |

### STableColumnDragConfig

| 属性         | 类型                                                    | 默认值  | 描述                                      |
| ------------ | ------------------------------------------------------- | ------- | ----------------------------------------- |
| `animation`  | `boolean`                                               | `false` | 启用列 FLIP 动画                          |
| `ghost`      | `({ column, columnId, index }) => VNode \| HTMLElement` | -       | 自定义列拖拽预览                          |
| `canDrag`    | `({ column, columnId, index }) => boolean`              | -       | 拖拽开始前判定，返回 `false` 阻止该列拖拽 |
| `beforeDrop` | `(payload) => boolean \| Promise<boolean>`              | -       | 提交移动前拦截                            |

### STableExpandable

| 属性                    | 类型                           | 默认值 | 描述               |
| ----------------------- | ------------------------------ | ------ | ------------------ |
| `multiple`              | `boolean`                      | `true` | 是否允许多行展开   |
| `columnWidth`           | `number`                       | `40`   | 展开列宽度 px      |
| `expandIcon`            | `(ctx) => VNodeChild`          | -      | 自定义展开图标     |
| `expandIconColumnIndex` | `number`                       | `0`    | 展开列插入位置     |
| `expandFixed`           | `boolean \| 'left' \| 'right'` | `true` | 展开列固定方向     |
| `fixed`                 | `boolean`                      | `true` | 兼容别名           |
| `isRowExpandable`       | `(record) => boolean`          | -      | 判断指定行能否展开 |

### STableCellRangeSelection

| 属性               | 类型              | 默认值  | 描述                   |
| ------------------ | ----------------- | ------- | ---------------------- |
| `mode`             | `'cell' \| 'row'` | 必填    | 框选模式               |
| `selectRowOnClick` | `boolean`         | `false` | 行范围点击时同步行选择 |

翻页后当前页不再包含框选行时，组件会清空框选并派发 `cellRangeChange(null)`。

### STableCopyOptions

| 属性                      | 类型      | 默认值  | 描述                                                              |
| ------------------------- | --------- | ------- | ----------------------------------------------------------------- |
| `delimiter`               | `string`  | Tab     | 字段分隔符                                                        |
| `includeHeaders`          | `boolean` | `false` | 是否包含表头                                                      |
| `writeToClipboard`        | `boolean` | `true`  | 是否写入系统剪贴板                                                |
| `preventFormulaInjection` | `boolean` | `true`  | 给 `=+-@` / 制表符 / 回车开头的字段加单引号，避免电子表格公式注入 |

### STableSeq

| 属性          | 类型                            | 默认值       | 描述             |
| ------------- | ------------------------------- | ------------ | ---------------- |
| `title`       | `string`                        | 语言包“序号” | 表头标题         |
| `columnWidth` | `number`                        | `60`         | 列宽 px          |
| `align`       | `STableColumnAlign`             | `'center'`   | 对齐方式         |
| `fixed`       | `boolean`                       | `true`       | 固定到左侧       |
| `startIndex`  | `number`                        | `1`          | 起始序号         |
| `paginate`    | `boolean`                       | `true`       | 是否计入分页偏移 |
| `renderCell`  | `(index, record) => VNodeChild` | -            | 自定义序号内容   |

## Summary Components

`SummaryRow` 只提供默认插槽并渲染 `<tr>`。`SummaryCell` Props：

| 属性       | 类型                | 默认值   | 描述                                     |
| ---------- | ------------------- | -------- | ---------------------------------------- |
| `colSpan`  | `number`            | `1`      | 跨列数                                   |
| `align`    | `STableColumnAlign` | `'left'` | 内容对齐                                 |
| `columnId` | `string`            | -        | 按列 ID 解析固定列样式                   |
| `index`    | `number`            | -        | 未提供 `columnId` 时按可见叶子列索引匹配 |
