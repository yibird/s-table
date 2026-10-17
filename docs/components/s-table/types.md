# TypeScript 类型

包入口显式导出以下公共类型。不要从 `src`、`dist` 或内部 hooks 路径导入类型；只有包入口导出项属于公共契约。

## 泛型约定

- `TData`：一行原始数据的类型。
- `TValue`：某一列通过 `accessorKey` / `accessorFn` 得到的值类型。
- 未提供 `TData` 时默认使用 TanStack `RowData`（`Record<string, any> | any[]`）。这是上游约束，STable 无法在不破坏 `useTable` 兼容性的前提下改成 `object`；**业务代码应显式绑定具体接口**（`<STable<User>>` 或从 `dataSource` 推断），此时 `keyof TData`、`rowKey`、`accessorKey` 均保持精确，不会被 `any` 感染。
- `STableColumnMeta`：列 `meta` 的类型化出口，内置 `align`；可通过模块声明合并扩展自定义字段。

```ts
import type {
  STableColumn,
  STableColumnMeta,
  STableContextMenuSlotContext,
  STableInstance,
  STableProps,
  STableRowSelection,
} from '@zchengfeng/s-table-vue';

interface User {
  id: number;
  name: string;
}

type UserTableProps = STableProps<User>;
type UserTableInstance = STableInstance<User>;
const columns: STableColumn<User>[] = [
  { accessorKey: 'name', meta: { align: 'center' } satisfies STableColumnMeta },
];
const selection: STableRowSelection<User> = {};

// 扩展列元数据（可选）
declare module '@zchengfeng/s-table-vue' {
  interface STableColumnMeta {
    tooltip?: string;
  }
}
```

````

## 核心组件类型

| 类型                           | 泛型      | 作用与使用场景                       |
| ------------------------------ | --------- | ------------------------------------ |
| `STableProps`                  | `<TData>` | 完整组件 Props；封装表格时复用       |
| `STableEmits`                  | `<TData>` | 完整事件元组映射；二次封装时声明事件 |
| `STableSlots`                  | `<TData>` | 插槽签名，保留 `record` / `row` 类型 |
| `STableContextMenuSlotContext` | `<TData>` | 右键菜单 Slot 的作用域类型           |
| `STableCellEditorSlotContext`  | `<TData>` | 自定义单元格编辑器作用域             |
| `STableFilterPanelSlotContext` | `<TData>` | 自定义过滤面板作用域                 |
| `STableInstance`               | `<TData>` | 组件 ref 的公开实例方法              |
| `STableSortItem`               | 无        | 多列排序中的列 ID 与方向             |
| `STableSelectionIntent`        | 无        | 大数据选择的 include/all 意图        |
| `STableEditPatch`              | `<TData>` | patch 编辑提交载荷                  |

## 列定义类型

`STableColumn` 是互斥联合：取值列、展示列和分组列的非法字段组合会被 TypeScript 拒绝。

| 类型                        | 泛型              | 作用                                       |
| --------------------------- | ----------------- | ------------------------------------------ |
| `STableColumn`              | `<TData, TValue>` | 所有公开列形状的联合                       |
| `STableColumnMeta`          | —                 | 列 `meta`；内置 `align`，可声明合并扩展    |
| `STableAccessorColumn`      | `<TData, TValue>` | `accessorKey` 与 `accessorFn` 取值列联合   |
| `STableAccessorKeyColumn`   | `<TData, TValue>` | 通过字段路径取值                           |
| `STableAccessorFnColumn`    | `<TData, TValue>` | 通过函数取值，`id` 必填                    |
| `STableDisplayColumn`       | `<TData, TValue>` | 无 accessor 的展示/操作列，`id` 必填       |
| `STableGroupColumn`         | `<TData, TValue>` | 只包含子列的分组列，`id` 必填              |
| `STableAccessorKey`         | `<TData>`         | TanStack `DeepKeys<TData>` 支持的真实字段路径 |
| `STableCellRender`          | `<TData, TValue>` | 静态 VNode 或单元格渲染函数                |
| `STableHeaderRender`        | `<TData, TValue>` | 静态 VNode 或表头渲染函数                  |
| `STableCellRenderContext`   | `<TData, TValue>` | `row`、`cell`、`column`、`table`、取值函数 |
| `STableHeaderRenderContext` | `<TData, TValue>` | `header`、`column`、`table`                |
| `STableRowRenderModel`      | `<TData>`         | 稳定的只读行模型子集                       |
| `STableColumnRenderModel`   | `<TData, TValue>` | 稳定的只读列模型子集                       |
| `STableCellRenderModel`     | `<TData, TValue>` | 稳定的只读单元格模型子集                   |
| `STableHeaderRenderModel`   | `<TData, TValue>` | 稳定的只读表头模型子集                     |
| `STableRenderModel`         | `<TData>`         | 渲染回调中的只读表格查询子集               |

```ts
const salaryColumn: STableAccessorFnColumn<Employee, number> = {
  id: 'annualSalary',
  accessorFn: (record) => record.monthlySalary * 12,
  header: '年薪',
  cell: ({ getValue }) => getValue().toLocaleString('zh-CN'),
};
````

渲染上下文是底层 TanStack 上下文的稳定子集。需要完整 TanStack API 时，通过组件实例调用 `getTanStackTable()`，不要把内部运行时对象强制断言成未承诺的公开字段。

## 配置类型

| 类型                        | 泛型      | 作用                                 |
| --------------------------- | --------- | ------------------------------------ |
| `STablePaginationProps`     | 无        | 表格分页配置，包含受控/非受控字段    |
| `STableVirtualProps`        | 无        | 横纵轴开关、行列 overscan 与尺寸估值 |
| `STableTree`                | `<TData>` | 树节点读取、不可变写回与缩进         |
| `STableEditConfig`          | `<TData>` | 编辑模式、触发、行权限与异步校验     |
| `STableEditingState`        | 无        | 当前编辑目标与未提交草稿             |
| `STableRowDragConfig`       | `<TData>` | 行动画、多行/树拖拽与 Drop 拦截      |
| `STableColumnDragConfig`    | `<TData>` | 列动画与 Drop 拦截                   |
| `STableCopyOptions`         | 无        | 框选复制分隔符、表头和剪贴板配置     |
| `STableCellRangeCopyEvent`  | 无        | 可取消框选复制事件载荷               |
| `STableExpandable`          | `<TData>` | 展开列行为                           |
| `STableSeq`                 | `<TData>` | 序号列行为与渲染                     |
| `STableCellRange`           | 无        | 起止行列索引组成的矩形范围           |
| `STableCellRangeSelection`  | 无        | `cell` / `row` 框选模式              |
| `STableCellProps`           | 无        | `rowSpan` / `colSpan`                |
| `STableRowSelection`        | `<TData>` | 选择列行为                           |
| `STableSelectionOption`     | `<TData>` | 自定义批量选择项                     |
| `STableSelectionChangeInfo` | 无        | 选择变化来源 `type`                  |
| `STableCheckboxProps`       | 无        | 行/表头选择控件状态、class 和 style  |
| `STableStyles`              | 无        | 8 个语义化样式入口                   |
| `STableClasses`             | 无        | 8 个语义化 class 入口                |

## 值与事件类型

| 类型                           | 定义/作用                                                      |
| ------------------------------ | -------------------------------------------------------------- |
| `STableSize`                   | `'small' \| 'middle' \| 'large'`                               |
| `STableColumnAlign`            | `'left' \| 'center' \| 'right'`                                |
| `STableColumnFixed`            | `'left' \| 'right'`                                            |
| `STableSelectionType`          | `'checkbox' \| 'radio'`                                        |
| `STableSortOrder`              | `'ascend' \| 'descend'`                                        |
| `STableFilterMode`             | `'checkbox' \| 'menu' \| 'custom'`                             |
| `STableRowKey`                 | `string \| number`                                             |
| `STableEditMode`               | `'cell' \| 'row'`                                              |
| `STableDropPosition`           | `'before' \| 'after' \| 'inside'`                              |
| `STableColumnResizeMode`       | TanStack `ColumnResizeMode`，当前常用值为 `onChange` / `onEnd` |
| `STableColumnResizeEvent`      | `<TData>`；列 ID、宽度、边界和列定义                           |
| `STableSelectionIntent`        | `include` 或 `all` 加例外键集合                                |
| `STableEditPatch`              | 行键、修改值、前后记录和 revision                              |
| `STableRowEvent`               | `<TData, TEvent>`；记录、行键、索引和原生事件                  |
| `STableCellEvent`              | `<TData, TEvent>`；在行事件上增加列、列索引和值                |
| `STableRowOrderChangeEvent`    | `<TData>`；多行/树拖拽后的数据与落点                           |
| `STableColumnOrderChangeEvent` | `<TData>`；列顺序和移动索引                                    |
| `STableFilterOption`           | 过滤项的文本、值和可选子项                                     |
| `STableSelectionColumnAlign`   | `'left' \| 'center' \| 'right'`                                |
| `PaginationPlacement`          | 顶部/底部与 Start/Center/End 的六种组合                        |

```ts
function onResizeEnd(payload: STableColumnResizeEvent<User>) {
  widths[payload.columnId] = payload.width;
}
```

## 国际化类型

| 类型                    | 作用                                                         |
| ----------------------- | ------------------------------------------------------------ |
| `STableLocale`          | 完整语言包结构，包含空状态、过滤、搜索、选择、分页和序号文案 |
| `STableLocaleOverrides` | 对每个语言分支做浅层可选覆盖，适合单实例局部文案             |

```ts
const locale: STableLocaleOverrides = {
  empty: { title: '暂无订单' },
  pagination: { itemsPerPage: '条/页' },
};
```

## 类型安全建议

- 不要使用无泛型的 `STableColumn[]`，它会丢失字段名和回调参数检查。
- 同一个表格的 `columns`、`rowSelection`、`expandable` 和实例 ref 应绑定同一个 `TData`。
- 使用 `createSTableColumnHelper<TData>()` 保留单列 `TValue`；`accessorKey` 的嵌套路径和值类型也会复用 TanStack `DeepKeys` / `DeepValue` 推导。
- 事件处理函数优先从公开事件类型中推导，避免手写与组件不一致的 payload。
