# 框选与交互事件

STable 提供面向数据工作台的单元格框选、键盘范围操作与原生交互事件。动态数据场景应提供稳定 `rowKey`。

## 单元格范围选择

`cellRangeSelection` 支持 `true`、`'single'`（单选区间）或配置对象；`rangeSelection` 是对齐 Surely Vue 的别名。内置以下交互：

- **方向键**：点击单元格后，上下左右移动选区。
- **Tab / Shift+Tab**：移动到下一个 / 上一个单元格，跨行自动首尾衔接。
- **拖拽**：从单元格按下并拖动，连续扩展矩形范围。
- **Ctrl / ⌘ + 拖拽**：在 `multi` 未关闭时追加或切换多个区间。
- **Shift + 点击**：以当前 focus 单元格为锚点，选中到点击单元格之间的矩形。
- **Ctrl / ⌘ + Shift + 方向键**：把选区扩展到该方向最后一个可选单元格。
- **Ctrl / ⌘ + A**：全选当前行模型中的可选单元格。
- **Ctrl / ⌘ + C**：复制选区；可通过 `formatRangeCellText` 自定义文本。

<demo vue="../../demos/s-table/cell-range.vue" />

`cellRangeChange` 在范围变化时触发，也可能返回 `null`；`cellRangeSelect` 在一次框选完成后触发，并返回范围覆盖的行记录。

框选的范围、边界和单元格值直接由 TanStack Table 的 `cellSelectionFeature` 提供。选择列可以参与框选并同步行选择；展开列、序号列和拖拽句柄等内部列会关闭 `enableCellSelection`。复制阶段仍统一过滤所有内部列，单区间复制的 `columnIds` 只包含业务列，多区间 API 的元数据差异见下文。

如果同时配置了 checkbox 选择列，每次框选完成会切换范围内行的选中状态：未选中变为选中，已选中变为取消选中。radio 模式只能保留一个值，不参与该联动。

实例方法 `getCellRange()` 返回活动范围快照，`getCellRanges()` 返回全部区间，`clearCellRange()` 清空当前范围：

```ts
instance.setCellRange({ startRow: 0, startCol: 0, endRow: 1, endCol: 2 });
instance.addCellRange({ startRow: 3, startCol: 1, endRow: 3, endCol: 1 });
instance.clearCellRange();
```

## 复制框选内容

框选后按 `Ctrl+C`（macOS 为 `Command+C`），组件会按行列顺序生成制表符分隔文本，可直接粘贴到 Excel、WPS 或 Google Sheets。实例方法 `copyCellRange()` 复用相同的序列化逻辑。

<demo vue="../../demos/s-table/cell-range-copy.vue" />

`onCellRangeCopy` 在写入剪贴板前同步调用，它是可取消 **prop callback**，不是 `STableEmits` 中的普通通知。载荷包含 `range`、`text`、`columnIds`、`source` 和原生 `nativeEvent`。`source` 为 `keyboard`、`clipboard` 或 `api`。返回 `false` 会跳过框选写入；原生 `copy` 事件此时不会 `preventDefault()`，浏览器仍可复制用户在单元格内选中的文本。未提供或返回其他值时默认允许，并接管剪贴板。包装组件须直接透传此 prop，或返回回调结果；不要通过 emit 转发。

实例 API 复制多个范围时，`text` 包含所有参与范围，`range` 与 `columnIds` 仍是活动范围的元数据，不是完整文本的边界或全局列映射。当前 `ranges: 'all'` 的 `columnIds` 可能包含内部列 ID，但文本已排除内部列，不应直接按下标配对。

复制文本默认会给以 `= + - @`、制表符或回车开头的字段加上单引号前缀，避免粘贴到 Excel 时触发公式。可通过 `copyCellRange({ preventFormulaInjection: false })` 关闭。翻页后若框选行已不在当前页，范围会被清空。

需要对接自定义剪贴板协议时，在框选配置中提供 `formatRangeCellText`。上下文包含活动范围、值矩阵、列 ID、列标题和复制来源：

```ts
const cellRangeSelection = {
  formatRangeCellText: ({ values, headers }) =>
    [headers.join(','), ...values.map((row) => row.join(','))].join('\n'),
};
```

```vue
<STable
  :columns="columns"
  :data-source="data"
  :cell-range-selection="true"
  :on-cell-range-copy="({ text }) => canCopy(text)"
/>
```

## 原生交互事件

组件已公开行和单元格的点击、双击、右键、悬浮进入/离开事件；开启 `keyboardNavigation` 后还会触发 `cellKeydown`。完整载荷参阅[行与单元格事件](./events)。不要绕过公开事件绑定内部 DOM class，因为虚拟滚动和内部结构调整会使这种做法不稳定。

<demo vue="../../demos/s-table/events.vue" />

## 键盘框选与多区间 API

聚焦单元格后支持 Ctrl/Cmd+A、Shift+方向键、Escape。实例 API 可读取和操作多个区间：

```ts
instance.getCellRanges();
instance.setCellRange({ startRow: 0, startCol: 0, endRow: 1, endCol: 2 });
instance.addCellRange({ startRow: 3, startCol: 1, endRow: 3, endCol: 1 }, { mode: 'include' });
instance.focusCell(0, 1);
instance.clearCellRange();
```

<demo vue="../../demos/s-table/keyboard-range.vue" />
