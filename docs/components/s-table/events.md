# 行与单元格事件

行和单元格的点击、双击、右键、悬浮进入/离开事件均已通过组件 emit 暴露。事件采用单一对象载荷，包含原始记录、稳定行键、可见索引和原生 DOM 事件。

<demo vue="../../demos/s-table/events.vue" />

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
