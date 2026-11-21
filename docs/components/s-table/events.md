# 行与单元格事件

行和单元格的点击、双击、右键、悬浮进入/离开事件均已通过组件 emit 暴露。事件采用单一对象载荷，包含原始记录、稳定行键、可见索引和原生 DOM 事件。

<demo vue="../../demos/s-table/events.vue" />

## 可取消回调与通知事件

普通通知使用 `STableEmits`。`onCellRangeCopy` 则是 `STableProps` 上需要返回值的同步回调，**不是普通 emit**：返回 `false` 会取消 STable 写入且不阻止浏览器原生复制；实例 `copyCellRange()` 返回空串。包装组件应原样透传 `:on-cell-range-copy="props.onCellRangeCopy"`，或 `return props.onCellRangeCopy?.(payload)`；不要用 `$emit('cellRangeCopy', payload)` 转发，emit 不会传回取消结果。编辑 `commit` / `cancel` 等需要返回值的操作同样保留 callback 合同。

通过实例 API 复制多个范围时，`range` 和 `columnIds` 描述活动范围，`text` 是所有参与范围的完整序列化文本；不能把活动范围元数据当成整个文本的边界或全局列映射。内部选择/序号列不进入文本；当前 `ranges: 'all'` 载荷的活动 `columnIds` 仍可能含内部列 ID，因此也不能把它直接与文本逐列配对。

分页的 `pagination.onChange` 和 `pageChange` 都会触发：前者推荐用于请求与回填，后者用于观察，详见[分页](./pagination)。

## 事件清单

| 模板事件                              | 载荷                                    | 说明                                   |
| ------------------------------------- | --------------------------------------- | -------------------------------------- |
| `row-click` / `row-double-click`      | `STableRowEvent<TData, MouseEvent>`     | 行点击、双击                           |
| `row-context-menu`                    | `STableRowEvent<TData, MouseEvent>`     | 行右键                                 |
| `row-mouseenter` / `row-mouseleave`   | `STableRowEvent<TData, MouseEvent>`     | 行悬浮边界                             |
| `cell-click` / `cell-double-click`    | `STableCellEvent<TData, MouseEvent>`    | 单元格点击、双击                       |
| `cell-context-menu`                   | `STableCellEvent<TData, MouseEvent>`    | 单元格右键                             |
| `cell-mouseenter` / `cell-mouseleave` | `STableCellEvent<TData, MouseEvent>`    | 单元格悬浮边界                         |
| `cell-keydown`                        | `STableCellEvent<TData, KeyboardEvent>` | 开启 `keyboardNavigation` 后的键盘事件 |

`STableRowEvent` 包含 `record`、`rowKey`、`rowIndex`、`event`；`STableCellEvent` 额外包含 `columnId`、`columnIndex` 和 `value`。

右键事件默认不阻止浏览器菜单。业务需要自定义菜单时，可以在监听器中调用 `payload.event.preventDefault()`，或使用 `#contextMenu` 内置浮层。事件委托在表体容器统一处理，即使启用行/列虚拟化也不会给每个单元格重复绑定监听器。
