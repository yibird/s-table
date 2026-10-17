# 展开行

展开行由 `expandable` 开启，通过 `#expandedRowRender` 渲染详情。状态既可由组件内部管理，也可使用 `v-model:expandedRowKeys` 受控。

## 基础、受控与单行展开

<demo vue="../../demos/s-table/expandable.vue" />

适用场景：

- 列表中展示不适合常驻列的详情。
- 主记录下展示审核记录、子表或说明。
- 使用 `multiple: false` 构建手风琴式详情列表。

## 配置

```ts
const expandable: STableExpandable<Order> = {
  multiple: true,
  columnWidth: 48,
  fixed: true,
  isRowExpandable: (record) => record.detailCount > 0,
};
```

`isRowExpandable` 只负责判断能否展开，不负责提供展开内容。没有 `#expandedRowRender` 时不应启用详情展开配置。

## 受控状态

`expandedRowKeys` 是当前展开键集合，`update:expandedRowKeys` 支持 `v-model`。`expandChange(expanded, record)` 用于执行日志、加载详情等副作用。

异步加载详情时应按 `rowKey` 缓存结果，避免每次收起再展开都重复请求。

## 异步加载详情

监听 `expandChange`，仅在首次展开时请求详情，并按稳定行键缓存结果。示例使用延时模拟接口，重复展开不会重新加载。

<demo vue="../../demos/s-table/async-expandable.vue" />

## 实例方法

组件实例提供 `getExpandedRowKeys()`、`toggleExpand()`、`expandRow()`、`collapseRow()`、`expandAll()` 和 `collapseAll()`。

## 与虚拟滚动组合

虚拟滚动支持展开行。配置 `rowHeight` 时，主行走固定行高快路径，已展开的逻辑行块仍会动态测量。展开内容高度变化后应避免依赖固定像素定位。

## 树形数据

树形数据通过 `tree` 配置启用，并与详情展开复用同一套 TanStack 展开状态；完整用法参阅[树形数据](./tree)。
