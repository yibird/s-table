# 排序、过滤与搜索

排序、过滤和搜索默认在客户端执行，适合已加载到浏览器中的中小数据集。服务端数据请参阅[服务端数据](./server-side)。

## 排序

`sorter: true` 使用默认比较，传入函数可定义业务排序。`sortDirections` 限制允许方向，`defaultSortOrder` 设置初始状态。

适用于：

- 后台列表按时间、金额或状态排序。
- 数据分析页面在有限数据集内快速比较。
- 需要自定义中文、版本号或业务优先级比较的列。

<demo vue="../../demos/s-table/sort.vue" />

默认点击新列会替换当前排序；设置 `multiSort` 后，按住 Ctrl/Meta/Shift 点击可累积多列排序。`sorting`/`v-model:sorting` 是受控入口，数组顺序就是排序优先级；列级 `sortOrder` 适合由列配置驱动的场景，设置为 `null` 表示受控且不排序。用户操作只派发 `update:sorting` / `sortChange`，父层需要同步更新列配置；同时提供顶层 `sorting` 时，以顶层状态为准。

<demo vue="../../demos/s-table/sort-filter-advanced.vue" />

需要命令式控制时使用 `getSorting()`、`setSorting()` 和 `clearSort()`；服务端模式监听 `sortChange`，其中 `sorting` 包含完整的多列状态。

## 过滤

配置 `filters` 后表头显示过滤入口，`onFilter(value, record)` 决定行是否保留。`filterMode` 支持 `checkbox` 和 `custom`；`filterMultiple` 控制是否多选。`menu` 模式已废弃，请使用 `filterMode: 'checkbox'` + `filterMultiple: false`。单选列表再次点击已选项或点击底部「重置」都会清空该列过滤。

<demo vue="../../demos/s-table/filter.vue" />

过滤值应使用可序列化的 `string | number | boolean`。默认值通过 `defaultFilteredValues` 提供；列级 `filteredValue` 可由外部完全控制。`filterMode: 'custom'` 配合 `#filterPanel` 可渲染业务筛选面板，插槽会收到 `selectedKeys`、`setSelectedKeys`、`confirm`、`reset` 和 `close`。

### 自定义过滤面板

`filterMode: 'custom'` 不要求提供 `filters` 选项：面板自行渲染输入控件，把草稿写入 `selectedKeys`，确定后由 `onFilter` 判断行是否保留。适合关键字搜索、价格区间、级联选择等无法用固定选项表达的条件。

<demo vue="../../demos/s-table/filter-custom-panel.vue" />

下面的示例同时受控 `sorting` 与列级 `filteredValue`，便于接入外部查询状态。

<demo vue="../../demos/s-table/filtering-controlled.vue" />

## 列搜索

`search: true` 使用文本包含匹配；函数形式可处理拼音、编号规范化或多字段检索。

<demo vue="../../demos/s-table/search.vue" />

搜索与过滤会同时作用于行模型。清空搜索调用 `clearSearch()`，不会清除过滤条件。

## 命令式清理状态

查询工具栏需要提供“重置”操作时，可通过 `STableInstance` 调用 `clearSort()`、`clearFilter()` 和 `clearSearch()`。三种状态相互独立，业务可以按需清理或一次全部恢复。

<demo vue="../../demos/s-table/instance-actions.vue" />

## 选择客户端还是服务端

| 数据形态                        | 建议                                             |
| ------------------------------- | ------------------------------------------------ |
| 已完整加载，通常少于几千行      | 使用客户端排序、过滤和分页                       |
| 后端只返回当前页                | 启用 `manualPagination`                          |
| 排序/过滤条件必须参与数据库查询 | 启用 `manualSorting` / `manualFiltering`         |
| 大量数据但需要浏览器内滚动      | 使用虚拟滚动；是否客户端处理取决于内存与计算成本 |
