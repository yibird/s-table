# 行右键菜单

通过 `#contextMenu` 插槽替换行右键菜单内容。菜单依赖当前行模型，动态数据场景应提供稳定 `rowKey`。

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

## 自定义浮层容器

`getPopupContainer` 同时作用于筛选、搜索、选择菜单、表头菜单、Tooltip 与右键菜单：

```vue
<div ref="popupHost">
  <STable :get-popup-container="() => popupHost ?? document.body" />
</div>
```

适合把菜单渲染到抽屉、弹窗或指定滚动容器内，避免被父级 `overflow: hidden` 裁剪。
