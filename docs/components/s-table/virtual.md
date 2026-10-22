# 虚拟滚动

虚拟滚动只挂载可视区域附近的行或列，适合需要在浏览器中浏览大量数据的场景。`virtual` 默认为 `false`；`true` 仅开启纵向虚拟化，对象模式通过 `x` / `y` 分别控制两个轴。纵向虚拟化可以与客户端分页或 `manualPagination` 服务端分页组合，虚拟器只消费当前页的最终行模型；需要连续滚动时将 `pagination` 设为 `false`。纵向虚拟化表格必须有明确高度。

## 基础虚拟列表

示例可在 10,000 行基础列表、5,000 行展开和 5,000 行选择之间切换，一次只创建一个场景。点击运行后再生成数据，三种场景都使用稳定 `rowKey`。

<demo vue="../../demos/s-table/virtual.vue" manual />

## 固定行高快路径

所有主行等高时设置 `rowHeight`，组件会跳过逐行 `ResizeObserver` 测量。`overscan` 控制视口上下额外渲染的行数。

```ts
const virtual: STableVirtualProps = {
  y: true,
  x: false,
  rowHeight: 47,
  overscan: 24,
};
```

以下示例默认运行 10,000 行，可切换到 50,000 / 100,000 行进行压力测试。高压选项不代表所有业务都应一次加载这么多完整对象。

<demo vue="../../demos/s-table/virtual-100k.vue" manual />

## 动态行高

行内容会换行或高度不一致时不要设置 `rowHeight`。使用 `estimateSize` 提供初始估值，组件会在渲染后测量实际高度。

```ts
const virtual: STableVirtualProps = {
  y: true,
  x: false,
  estimateSize: 56,
  overscan: 15,
};
```

## 横向与双向虚拟化

开启 `x` 后仅渲染横向视口附近的中心列，左右 fixed 列始终保留。`columnOverscan` 控制额外渲染的中心列数；未显式设置列宽时，使用 `columnEstimateSize` 估算。

<demo vue="../../demos/s-table/virtual-horizontal.vue" manual />

## 滚动触底

`scrollToBottomOffset` 定义距离底部多少像素时触发 `scrollToBottom`。`#scrollToBottom` 可显示加载提示。

<demo vue="../../demos/s-table/scroll-to-bottom.vue" />

事件可能在用户停留于底部时多次满足触发条件，请在请求层维护 `loading` 和 `hasMore` 防重入。

## 选择方案

| 数据量与来源             | 建议                                                     |
| ------------------------ | -------------------------------------------------------- |
| 数百行以内               | 普通渲染或分页，通常不需要虚拟滚动                       |
| 数千到数万行，已在内存中 | 虚拟滚动；等高行优先设置 `rowHeight`                     |
| 十万行以上，后端可分页   | 优先服务端分页或游标加载，避免创建全部对象               |
| 十万行以上，必须连续滚动 | 分块获取数据、固定行高、稳定列和数据引用，并进行设备实测 |

## 实例滚动

`scrollToRow(rowKey)` 找到目标行并发起滚动时返回 `true`。`scrollToTop()` 和 `scrollToBottom()` 用于快捷定位。目标键不在当前数据集中时 `scrollToRow()` 返回 `false`。

<demo vue="../../demos/s-table/virtual-instance-scroll.vue" />

## 函数式行高与 autoHeight

```ts
const virtual = {
  rowHeight: (record, index) => (record.expanded ? 88 : 44),
  buffer: { x: 2, y: 10 },
};
```

函数返回有限正数时作为该行的精确高度/初始估算；任一可见列设置 `autoHeight: true` 时强制动态测量。`preserveRow` 会按 `row.id` 保留实测高度，`deepWatchDataSource` / `deepWatchColumns` 支持原地修改数据或列配置。

<demo vue="../../demos/s-table/virtual-dynamic-height.vue" />

<demo vue="../../demos/s-table/popup-rowheight-perf.vue" />
