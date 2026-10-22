# 框选与右键菜单

STable 提供面向数据工作台的框选和右键菜单能力。两者都依赖当前行模型，动态数据场景应提供稳定 `rowKey`。

## 单元格与行范围选择

`cellRangeSelection.mode` 支持：

- `cell`：拖拽形成矩形单元格范围。
- `row`：单击一行形成整行范围。

<demo vue="../../demos/s-table/cell-range.vue" />

`cellRangeChange` 在范围变化时触发，也可能返回 `null`；`cellRangeSelect` 在一次框选完成后触发，并返回范围覆盖的行记录。

框选的范围、边界和单元格值直接由 TanStack Table 的 `cellSelectionFeature` 提供。选择列、展开列、序号列和拖拽句柄等组件内部列会显式关闭 `enableCellSelection`，因此不会成为业务框选范围的一部分；复制时的 `columnIds` 也只包含可参与框选的业务列。

`selectRowOnClick: true` 只在 `mode: 'row'` 下生效，并要求同时配置 `rowSelection`。它用于把范围选择同步为行选择；普通业务点击请监听 `rowClick`。

下面的示例使用行范围模式，并通过实例方法设置、追加和清空多个区间。

<demo vue="../../demos/s-table/interactions-row-range.vue" />

`cell` 模式下如果同时配置了 checkbox 选择列，每次框选完成会切换范围内行的选中状态：未选中变为选中，已选中变为取消选中。radio 模式只能保留一个值，不参与该联动。

实例方法 `getCellRange()` 返回范围快照，`clearCellRange()` 清空当前范围。

## 复制框选内容

框选后按 `Ctrl+C`（macOS 为 `Command+C`），组件会按行列顺序生成制表符分隔文本，可直接粘贴到 Excel、WPS 或 Google Sheets。实例方法 `copyCellRange()` 复用相同的序列化逻辑。

<demo vue="../../demos/s-table/cell-range-copy.vue" />

`@cell-range-copy` 在写入剪贴板前触发，载荷包含 `range`、`text`、`columnIds`、`source` 和原生 `nativeEvent`。`source` 为 `keyboard`、`clipboard` 或 `api`。监听器返回 `false` 会跳过框选写入；原生 `copy` 事件此时不会 `preventDefault()`，浏览器仍可复制用户在单元格内选中的文本。未监听或返回其他值时默认允许，并接管剪贴板。

复制文本默认会给以 `= + - @`、制表符或回车开头的字段加上单引号前缀，避免粘贴到 Excel 时触发公式。可通过 `copyCellRange({ preventFormulaInjection: false })` 关闭。翻页后若框选行已不在当前页，范围会被清空。

```vue
<STable
  :columns="columns"
  :data-source="data"
  :cell-range-selection="{ mode: 'cell' }"
  @cell-range-copy="({ text }) => canCopy(text)"
/>
```

## 基础右键菜单

提供 `#contextMenu` 后，右键点击数据行会打开菜单。插槽参数包括当前 `row`、`rowIndex` 和关闭函数 `close()`。

<demo vue="../../demos/s-table/context-menu.vue" />

## 动态业务菜单

菜单内容可以根据行状态决定禁用、隐藏或操作文案。执行异步操作前建议先保存行键，再关闭菜单。

<demo vue="../../demos/s-table/context-menu-advanced.vue" />

```vue
<template #contextMenu="{ row, rowIndex, close }">
  <button type="button" class="s-table-context-menu-item" @click="edit(row, close)">
    编辑第 {{ rowIndex + 1 }} 行
  </button>
</template>
```

菜单容器由组件定位并管理关闭行为。`.s-table-context-menu-item` 是内置菜单项样式类；业务复杂时可渲染自己的菜单组件，但仍应调用 `close()` 完成交互闭环。

## 原生交互事件

组件已公开行和单元格的点击、双击、右键、悬浮进入/离开事件；开启 `keyboardNavigation` 后还会触发 `cellKeydown`。完整载荷参阅[行与单元格事件](./events)。不要绕过公开事件绑定内部 DOM class，因为虚拟滚动和内部结构调整会使这种做法不稳定。

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

## 自定义浮层容器

`getPopupContainer` 同时作用于筛选、搜索、选择菜单、表头菜单、Tooltip 与右键菜单：

```vue
<div ref="popupHost">
  <STable :get-popup-container="() => popupHost ?? document.body" />
</div>
```
