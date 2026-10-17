# 树形数据

传入 `tree` 即可启用树形行模型。树节点展开与详情展开共用 `expandedRowKeys`，因此受控状态、展开全部、滚动定位和拖拽不会维护两套互相冲突的状态。

<demo vue="../../demos/s-table/tree.vue" />

## 数据契约

默认读取 `children`。自定义字段可传 `tree.childrenColumnName`；数据不是普通对象字段时，提供 `getChildren`。编辑或树拖拽需要写回自定义结构时，还应提供 `setChildren`。

```ts
const tree = {
  getChildren: (node: Node) => node.nodes,
  setChildren: (node: Node, children: Node[]) => ({ ...node, nodes: children }),
  indentSize: 20,
};
```

`defaultExpandAllRows` 负责初始全部展开，`expandRowByClick` 允许点击行展开；`expandable.isRowExpandable(record)` 可禁用特定节点。实例提供 `expandRow`、`collapseRow`、`toggleExpand`、`expandAll` 和 `collapseAll`。

## 树拖拽

`rowDrag: { allowTreeReparent: true }` 开启跨层级投放。目标行上、中、下区域分别映射为 `before`、`inside`、`after`，事件载荷包含移动行键、目标行键、目标父键和最终树数据。服务端规则可放在异步 `beforeDrop` 中。

树形数据务必提供全树唯一且稳定的 `rowKey`。未提供时组件会生成路径型内部 ID，但它只适合展示，不适合持久化展开、选择和拖拽状态。

`tree` 与 `groupBy` 互斥。需要按列聚合时请使用行分组，不要把同一份数据同时配成树。
