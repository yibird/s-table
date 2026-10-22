# 基础用法

本页覆盖表格的基础展示状态。业务数据建议始终声明明确的行类型，并让 `columns` 与 `dataSource` 使用同一个泛型。

## 基础表格

适用于后台列表、查询结果和只读数据展示。`accessorKey` 从行数据取值，`header` 定义表头。

<demo vue="../../demos/s-table/basic.vue" />

## 边框

信息密度较高、需要强调单元格边界时启用 `bordered`。无边框是默认值。

<demo vue="../../demos/s-table/bordered.vue" />

## 斑马纹

长列表横向阅读困难时可启用 `striped`，偶数行会使用独立背景变量，并保留 hover 层级。

<demo vue="../../demos/s-table/striped.vue" />

## 尺寸

`size` 支持 `small`、`middle`、`large`。紧凑后台页通常使用 `small`，默认使用 `middle`，触控或低密度页面可使用 `large`。

<demo vue="../../demos/s-table/size.vue" />

## 高度与固定表头

表格本身不提供独立的 `height` Prop。通过 `style` 或外部 class 设置根节点高度；`fixedHeader` 默认为 `true`，在容器滚动时保持表头可见。不设置高度时，表格随内容自然撑开。

<demo vue="../../demos/s-table/fixed-header.vue" />

## 固定行

`pinnedRowKeys`（或受控的 `v-model:pinned-row-keys`）可以把指定行固定在顶部或底部；实例方法 `pinRow()` / `getPinnedRowKeys()` 用于命令式操作。

<demo vue="../../demos/s-table/basic-pinned-rows.vue" />

## 空数据

`dataSource` 为空数组时显示默认空状态。使用 `#empty` 替换整个空状态，使用 `#emptyAction` 只追加操作区。

<demo vue="../../demos/s-table/empty.vue" />

## 加载状态

异步请求期间设置 `loading`。遮罩覆盖表格内容，但不会替换或清空当前数据。

<demo vue="../../demos/s-table/loading.vue" />

## 自定义加载内容

使用 `#loading` 插槽替换默认加载指示器。插槽没有参数，加载状态仍由 `loading` 控制。

<demo vue="../../demos/s-table/custom-loading.vue" />

## 国际化

`locale` 可以传入内置的 `zh_CN`、`en_US`，也可以传入局部覆盖对象。语言切换会同步更新空状态、过滤面板、分页等组件内文案。

<demo vue="../../demos/s-table/locale.vue" />

## 使用建议

- 不要在模板中重复创建 `columns` 或 `dataSource` 数组；稳定引用能复用 TanStack 行模型缓存。
- `dataSource` 不是数组时组件会回退为空数组，并在开发环境输出警告。
- 选择、展开、拖拽和虚拟滚动依赖行身份，生产环境应避免使用默认数组索引作为 `rowKey`。

## 标题与页脚

```vue
<STable
  :title="({ currentPageData }) => `当前页 ${currentPageData.length} 人`"
  :footer="({ total }) => `共 ${total} 条`"
  summary-fixed
/>
```

`title` / `footer` 同时支持同名插槽；声明式汇总可直接写在列的 `footer` 字段上。
