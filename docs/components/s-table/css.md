# 样式与主题

主题定制优先使用 CSS Variables；局部结构调整使用 `styles` / `classes`。内部 DOM class 不是稳定 API，不建议作为业务选择器依赖。

## CSS Variables

主题变量会作用于表格实例内部的控件；筛选、搜索、表头选择、Select 和右键菜单等 Teleport 浮层打开时，也会同步触发节点上的 `--s-*` 变量，因此实例级主题不会退回到根级默认值。未列出的 `--s-*` 自定义变量同样会被同步。

主色 hover / active、框选边框和 loading 颜色在未显式配置时会从当前实例的 `--s-primary-color` 派生；只覆盖主色即可保持交互状态一致，显式配置对应变量时仍以配置值优先。

变量在 `:root` 提供默认值，并由 `.s-table` 实例作用域继承和消费。放在某个表格外层或直接放在表格 class 上即可局部覆盖。

### 主题与背景

| CSS Variable                      | 默认值                   | 描述               |
| --------------------------------- | ------------------------ | ------------------ |
| `--s-primary-color`               | `#1677ff`                | 主色               |
| `--s-primary-color-hover`         | `color-mix(...)`         | 主色 hover 状态色  |
| `--s-primary-color-active`        | `color-mix(...)`         | 主色 active 状态色 |
| `--s-color-bg-header`             | `#fafafa`                | 表头背景           |
| `--s-color-bg-cell`               | `#fff`                   | 表体单元格背景     |
| `--s-color-bg-row-hover`          | `#f7f7f7`                | 行 hover 背景      |
| `--s-color-bg-row-selected`       | `#e6f4ff`                | 选中行背景         |
| `--s-color-bg-row-selected-hover` | `#bae0ff`                | 选中行 hover 背景  |
| `--s-color-bg-row-striped`        | `#fafafa`                | 斑马纹偶数行背景   |
| `--s-color-bg-row-striped-hover`  | `#f0f0f0`                | 斑马纹 hover 背景  |
| `--s-color-bg-row-expanded`       | `#fafafa`                | 展开行背景         |
| `--s-color-bg-footer`             | `#f2f2f2`                | Footer 背景        |
| `--s-color-bg-summary`            | `#fafafa`                | Summary 背景       |
| `--s-color-bg-drag-source`        | `#e6f4ff`                | 行拖拽源背景       |
| `--s-color-bg-column-drag-source` | `#e6f4ff`                | 列拖拽源表头背景   |
| `--s-color-bg-cell-range`         | `#f0f7ff`                | 框选范围背景       |
| `--s-color-bg-cell-range-active`  | `#d6ebff`                | 框选锚点背景       |
| `--s-color-bg-disabled`           | `#f5f5f5`                | 禁用控件背景       |
| `--s-color-bg-loading`            | `rgba(255,255,255,.72)`  | 加载遮罩背景       |
| `--s-color-loading-track`         | `color-mix(...)`         | 加载环轨道色       |
| `--s-color-loading-active`        | `var(--s-primary-color)` | 加载活动色         |

### 边框、文本与交互

| CSS Variable                  | 默认值                   | 描述             |
| ----------------------------- | ------------------------ | ---------------- |
| `--s-color-border-cell-range` | `var(--s-primary-color)` | 框选边框         |
| `--s-color-border`            | `#f0f0f0`                | 通用分割线       |
| `--s-color-border-control`    | `#d9d9d9`                | 控件边框         |
| `--s-color-text`              | `rgba(0,0,0,.88)`        | 主文本           |
| `--s-color-text-secondary`    | `rgba(0,0,0,.65)`        | 次文本           |
| `--s-color-text-tertiary`     | `rgba(0,0,0,.45)`        | 辅助文本         |
| `--s-color-text-quaternary`   | `rgba(0,0,0,.45)`        | 占位/禁用文本    |
| `--s-color-text-icon`         | `#bfbfbf`                | 默认图标色       |
| `--s-color-bg-hover`          | `rgba(0,0,0,.04)`        | 控件 hover 背景  |
| `--s-color-bg-active`         | `rgba(0,0,0,.08)`        | 控件 active 背景 |

### 阴影、圆角、动效与层级

| CSS Variable             | 默认值                       | 描述                   |
| ------------------------ | ---------------------------- | ---------------------- |
| `--s-color-shadow-fixed` | `rgba(5,5,5,.12)`            | 固定列阴影色           |
| `--s-shadow-dropdown`    | `0 6px 16px rgba(0,0,0,.08)` | 下拉面板阴影           |
| `--s-shadow-menu`        | 两层阴影                     | 右键菜单阴影           |
| `--s-radius-sm`          | `4px`                        | 小圆角                 |
| `--s-radius-md`          | `6px`                        | 中圆角                 |
| `--s-radius-lg`          | `8px`                        | 大圆角                 |
| `--s-duration-fast`      | `0.1s`                       | 微交互动效             |
| `--s-duration-normal`    | `0.2s`                       | 面板动效               |
| `--s-duration-slow`      | `0.3s`                       | 长动效                 |
| `--s-z-index-cell-fixed` | `2`                          | 固定列单元格           |
| `--s-z-index-header`     | `10`                         | 固定表头               |
| `--s-z-index-resizer`    | `15`                         | 列宽拖拽手柄           |
| `--s-z-index-dropdown`   | `1050`                       | 过滤、搜索、选择下拉层 |

## 局部主题

```vue
<template>
  <STable class="finance-table" :columns="columns" :data-source="dataSource" />
</template>

<style scoped>
.finance-table {
  --s-primary-color: #0f766e;
  --s-color-bg-header: #f0fdfa;
  --s-color-bg-row-selected: #ccfbf1;
  --s-color-border: #99f6e4;
}
</style>
```

组件内置 `[data-theme='dark']` 和 `.dark` 暗色变量。应用切换暗色模式时，将其中一个标记放到表格祖先节点。

下面的示例在单个表格祖先节点覆盖主题变量，并使用 `styles` / `classes` 调整语义化单元格位置，不会影响文档中的其他表格。

<demo vue="../../demos/s-table/theme.vue" />

### 多实例主题隔离

CSS Variables 可以声明在任意表格祖先节点。不同祖先作用域下的实例独立继承变量，适合在同一页面呈现多个业务主题。

<demo vue="../../demos/s-table/theme-isolation.vue" />

### 主题预设

通过切换祖先节点 class，可以一次替换主色、背景、边框、圆角和浮层阴影等整组 Token。

<demo vue="../../demos/s-table/theme-presets.vue" />

### 浮层主题继承

下面的表格同时启用了列搜索、列筛选、批量选择、分页 Select 和右键菜单。打开这些浮层时，Teleport 节点会继续使用当前实例的红色主题变量。

<demo vue="../../demos/s-table/theme-overlays.vue" />

### 主题模式

通过表格祖先节点的 data-theme="dark" 或 .dark 标记切换暗色变量。主题变量会作用于该祖先节点下的所有 STable 实例。

<demo vue="../../demos/s-table/theme-mode.vue" />

## 语义化 Styles 与 Classes

`styles` 与 `classes` 提供相同的 8 个语义位置，是稳定的结构定制入口。

| Key               | 目标元素            | 推荐用途       |
| ----------------- | ------------------- | -------------- |
| `header`          | `<thead>`           | 整体表头样式   |
| `body`            | `<tbody>`           | 整体表体样式   |
| `footer`          | Footer 容器         | 通用页脚布局   |
| `summary`         | `<tfoot>`           | 汇总区域样式   |
| `headerCell`      | 每个 `<th>`         | 表头单元格     |
| `headerCellTitle` | 表头标题容器        | 标题文本与布局 |
| `bodyCell`        | 每个数据 `<td>`     | 表体单元格     |
| `summaryCell`     | 每个 Summary `<td>` | 汇总单元格     |

```ts
const classes: STableClasses = {
  header: 'report-header',
  bodyCell: 'report-cell',
};

const styles: STableStyles = {
  headerCell: { fontWeight: 600 },
  bodyCell: { fontVariantNumeric: 'tabular-nums' },
};
```

<demo vue="../../demos/s-table/styles-classes.vue" />

## CSS Class 稳定性

| Class / 入口                          | 稳定性             | 用途                               |
| ------------------------------------- | ------------------ | ---------------------------------- |
| `.s-table`                            | 稳定根 class       | 局部变量覆盖和实例级布局           |
| `.s-table-context-menu-item`          | 文档化菜单项 class | 让自定义右键菜单项匹配内置菜单外观 |
| `classes.*` 注入的用户 class          | 稳定 API           | 语义化结构定制                     |
| 其他 `.s-table-*` / `.s-pagination-*` | 内部实现           | 不保证跨版本结构与命名稳定         |

## 修改范围建议

- 品牌色、背景、边框和暗色适配使用变量，推荐修改。
- 字号、行高等结构尺寸当前没有全部抽象为变量，可通过语义化 styles/classes 调整并进行回归测试。
- 不要用 `!important` 覆盖固定列定位、虚拟行 transform 或拖拽状态，这些样式参与组件行为。
