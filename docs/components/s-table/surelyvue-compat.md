# SurelyVue 迁移

STable 已具备替换 SurelyVue Table 的主要业务能力，但不是同名 API 的无改动克隆。迁移目标应定义为“功能平替”：保留页面行为和数据契约，并在组件边界做一次属性、事件和实例方法适配。

## 能力矩阵

| 能力                                      | STable 状态 | 迁移说明                                                       |
| ----------------------------------------- | ----------- | -------------------------------------------------------------- |
| 基础展示、固定头/列、分组表头、合并单元格 | 完整        | 固定列使用 `fixed`，合并使用 `onCell`/`spanRows`/`spanColumns` |
| 单/多列排序、服务端排序                   | 完整        | `sorting` 数组保留优先级，`manualSorting` 接后端               |
| 内置/自定义/受控过滤                      | 完整        | `filterPanel` 插槽与列 `filteredValue`                         |
| 单选、多选、全选、反选、禁用行            | 完整        | 通过 `rowSelection` 和受控键集合                               |
| 树形、详情展开、嵌套内容                  | 完整        | 统一使用 `expandedRowKeys`；子表格放在 `expandedRowRender`     |
| 单元格/整行编辑                           | 完整        | 不可变提交、受控草稿、异步校验；编辑器插槽 API 不同            |
| 行/列虚拟化、动态行高                     | 完整        | 固定列始终渲染，中心列虚拟化                                   |
| 行/列/树拖拽                              | 完整        | 支持多行、跨层级和异步 `beforeDrop`                            |
| 框选、复制、右键、键盘                    | 完整        | 当前维护一个矩形范围                                           |
| 图表、打印                                | 未内置      | SurelyVue 官方能力表同样标记为开发中；建议与图表/打印库组合    |

## 常用映射

| SurelyVue                                  | STable                                                      |
| ------------------------------------------ | ----------------------------------------------------------- |
| `xVirtual`                                 | `virtual: { y: false, x: true }`                            |
| `childrenColumnName` / `indentSize`        | `tree: { childrenColumnName, indentSize }`                  |
| `rowDrag` / `columnDrag`                   | `rowDrag` / `columnDrag` Feature Config                     |
| `rowDragEnd` / `columnDragEnd`             | `rowOrderChange` / `columnOrderChange`                      |
| `openEditor` / `closeEditor`               | `startCellEdit`、`startRowEdit`、`commitEdit`、`cancelEdit` |
| `ensureRowVisible` / `ensureColumnVisible` | `scrollToRow` / `scrollToColumn`                            |

## 需要改造的地方

STable 不在核心组件中长期维护另一套同义 API。事件也不是参数位置兼容：SurelyVue 的 `cellClick(event, params)` 在 STable 中是 `cellClick(payload)`，原生事件位于 `payload.event`。编辑器、过滤面板和选区对象的结构也不同。迁移时建议在项目内封装一个 `SurelyTableAdapter.vue`，集中转换旧属性和事件，而不是在每个页面散落兼容代码。

## 验收基线

对替换页面至少验证：稳定 `rowKey`、受控状态回填、服务端查询参数、固定列横向滚动、虚拟滚动定位、编辑校验、树拖拽落点和右键菜单。性能结论应使用真实列渲染器和目标数据量测量，不能只以空单元格基准代替。
