# 常见问题

## 1. 修改 dataSource 后为什么没有刷新？

确认更新方式与响应式容器一致。普通 `ref` 可跟踪数组修改；`shallowRef` 需要替换 `.value` 引用，例如 `dataSource.value = [...dataSource.value, row]`。

## 2. 为什么 accessorKey 没有生效？

字段必须存在于行数据中。嵌套路径可使用 `profile.name`；如果字段需要计算，改用带必填 `id` 的 `accessorFn`。

## 3. 为什么 accessorFn 提示缺少 id？

函数无法像字段路径一样推导稳定列 ID，因此 `id` 是必填项。这也是排序、过滤、固定和拖拽识别该列的依据。

## 4. 如何让 columns 获得正确泛型？

声明 `const columns: STableColumn<User>[]`，或使用 `createSTableColumnHelper<User>()`。不要使用无泛型的 `STableColumn[]`。

## 5. 为什么选择状态在排序后错位？

通常是使用了默认数组索引作为行键。设置稳定且唯一的 `row-key="id"`，不要使用会随排序变化的索引。

## 6. 为什么 v-model:selectedRowKeys 更新后又恢复？

受控状态必须由父组件接收并保留更新值。检查是否又从旧的接口状态覆盖了 `selectedRowKeys`。

## 7. 如何跨服务端分页保留选择？

设置 `rowSelection.preserveSelectedRowKeys: true` 并在父组件保存键集合。当前页不存在的行只能保留键，`getSelectedRows()` 无法返回未加载的完整记录。

## 8. 为什么 Footer 插槽没有显示？

Footer 容器在提供 `#footer` 插槽或 `footer` 属性时自动渲染，不需要额外开关。请确认插槽名是 `footer`（`#summary` 用于汇总栏，二者互不影响）。

## 9. Summary 和 Footer 有什么区别？

Summary 渲染为与列对齐的 `<tfoot>`，适合合计；Footer 是表格下方的通用内容区，适合说明、操作和状态栏。

## 10. 为什么固定列没有效果？

固定列应配置明确 `width`，并确保列总宽度超过容器以产生横向滚动。检查祖先元素是否用自定义样式破坏了 sticky 定位。

## 11. 为什么固定表头没有滚动效果？

`fixedHeader` 默认开启，但容器需要有限高度才能产生内部纵向滚动。通过 `style="height: 400px"` 或外部 class 设置高度。

## 12. virtual 能和分页一起使用吗？

可以。客户端分页时虚拟器只渲染当前页的可视行；服务端分页时同时启用 `manualPagination`，虚拟器会渲染后端返回的当前页数据。需要浏览同一连续数据集时显式设置 `pagination="false"`。

## 13. 大数据如何优化？

优先减少传入浏览器的数据量；必须连续滚动时启用虚拟滚动，等高行设置 `rowHeight`，大数组使用 `shallowRef`，并保持 columns/data 引用稳定。

## 14. 为什么设置 rowHeight 后内容重叠？

固定行高要求所有主行等高。内容换行或动态高度时移除 `rowHeight`，改用 `estimateSize` 让组件测量实际高度。

## 15. scrollToBottom 为什么触发多次？

只要滚动位置持续满足阈值，后续更新仍可能再次触发。请求函数中使用 `loading` 和 `hasMore` 防重入。

## 16. 如何进行服务端排序和过滤？

启用 `manualSorting` / `manualFiltering`，监听 `sortChange` / `filterChange`，请求新数据后替换 `dataSource`。组件不会自动调用接口。

## 17. 为什么翻页请求执行了两次？

通常是 `pagination.onChange` 和 `@page-change` 都调用了请求。选择其中一个作为唯一请求入口。

## 18. 如何清空排序、过滤和搜索？

使用带 `STableInstance<TData>` 类型的组件 ref，依次调用 `clearSort()`、`clearFilter()`、`clearSearch()`。

## 19. 如何自定义某一行的 class 或 style？

使用 `rowClassName(record, rowIndex)` 和 `rowStyle(record, rowIndex)`。固定结构位置仍使用 `classes` / `styles`；不要依赖内部行 DOM class。

## 20. 如何监听普通行点击？

监听 `rowClick`、`rowDoubleClick`、`rowContextMenu`、`rowMouseenter` 或 `rowMouseleave`。事件载荷包含 `record`、`rowKey`、`rowIndex` 和原生 `event`。

## 21. 是否支持树形数据和数据分组？

树形层级用 `tree`，并与详情展开共用 `expandedRowKeys`。按列聚合用 `groupBy`（或 `v-model:groupBy`），且参与分组的列必须设置 `column.groupable: true`。嵌套 `columns` 只表示分组表头，不是行分组。

`tree` 与 `groupBy` 互斥：同时传入时树形优先，分组被忽略。分组展开使用独立 id 空间，不能用 `expandedRowKeys` / `expandAll` 控制；应使用 `expandAllGroups`、`collapseAllGroups`、`toggleGroup` 或 `#groupRow` 插槽里的 `toggle()`。

## 22. 如何覆盖主题样式？

优先在 `.s-table` 实例 class 上覆盖 `--s-*` CSS Variables。结构位置使用 `styles` / `classes`，不建议绑定内部 `.s-table-*` class。
