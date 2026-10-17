# 列与单元格

`STableColumn<TData, TValue>` 是与 TanStack 内部类型隔离的公开列定义。列分为取值列、展示列和分组列三种形状。

## 取值方式

### accessorKey

直接读取字段时优先使用 `accessorKey`。绑定 `TData` 后，顶层字段会受到 TypeScript 校验；嵌套路径也受支持。

```ts
interface User {
  id: number;
  profile: { name: string };
}

const columns: STableColumn<User>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'profile.name', header: '姓名' },
];
```

嵌套路径生成列 ID 时会将 `.` 替换为 `_`。例如 `profile.name` 的运行时列 ID 是 `profile_name`。

### accessorFn

派生值使用 `accessorFn`。函数无法稳定推导 ID，因此 `id` 必填。

```ts
const columns: STableColumn<User>[] = [
  {
    id: 'displayName',
    accessorFn: (record) => record.profile.name.toUpperCase(),
    header: '显示名称',
  },
];
```

### 展示列

操作列等不读取字段的列只设置 `id`、`header` 和 `cell`，不要同时设置 `accessorKey`。

## 类型安全的列 Helper

`createSTableColumnHelper<TData>()` 提供 `accessor`、`display` 和 `group` 三个构造器，尤其适合需要保留单列 `TValue` 推断的项目。

```ts
import { createSTableColumnHelper } from '@zchengfeng/s-table-vue';

interface User {
  id: number;
  name: string;
  score: number;
}

const column = createSTableColumnHelper<User>();
const columns = [
  column.accessor('name', { header: '姓名' }),
  column.accessor((record) => record.score / 10, {
    id: 'rating',
    header: '评级',
    cell: ({ getValue }) => getValue().toFixed(1),
  }),
  column.display({ id: 'action', header: '操作', cell: '查看' }),
];
```

下面的完整示例同时展示嵌套 `accessorKey`、类型推导的 `accessorFn` 和不读取字段的展示列。派生列仍需显式提供稳定 `id`。

<demo vue="../../demos/s-table/column-accessors.vue" />

## 自定义 Header 与 Cell

`header` 和 `cell` 都可以接收 VNode 或渲染函数。单元格上下文提供 `row.original`、`getValue()`、`column`、`cell` 和只读表格查询能力。

<demo vue="../../demos/s-table/custom-render.vue" />

## Meta 扩展

`meta` 用于附加业务侧列元数据，并可从渲染上下文的 `column.columnDef.meta` 读取。STable 不解释用户自定义字段。

```ts
const scoreColumn: STableColumn<User, number> = {
  accessorKey: 'score',
  header: '分数',
  meta: { unit: '分', permission: 'score:read' },
  cell: ({ getValue, column }) => {
    const unit = String(column.columnDef.meta?.unit ?? '');
    return `${getValue()} ${unit}`;
  },
};
```

## 分组表头与单元格合并

分组列通过 `columns` 嵌套。`onCell` 可返回 `rowSpan` / `colSpan`；返回 `0` 表示该单元格被相邻单元格覆盖。`spanRows` 和 `spanColumns` 则使用 TanStack 的相邻单元格合并能力。

<demo vue="../../demos/s-table/group-header.vue" />

::: warning
手工合并依赖当前行索引。排序、过滤或分页后，应确保 `onCell` 的合并算法仍与当前行顺序一致。虚拟列表中使用跨行合并前也需要验证滚动布局。
:::

## 行分组与聚合

嵌套 `columns` 只生成分组表头。按字段把数据行聚合成分组行，使用 `groupBy` / `v-model:groupBy`，并且参与分组的列必须设置 `groupable: true`。可选 `getGroupingValue` 自定义分组键，`aggregation` / `aggregatedCell` 控制分组行上的汇总单元格。

```ts
const columns: STableColumn<Order>[] = [
  { accessorKey: 'department', header: '部门', groupable: true },
  { accessorKey: 'amount', header: '金额', aggregation: 'sum' },
];
```

```vue
<STable row-key="id" :columns="columns" :data-source="orders" v-model:group-by="groupBy" />
```

`tree` 与行分组互斥：同时传入时树形优先。分组展开不走 `expandedRowKeys`，请使用 `expandAllGroups`、`collapseAllGroups`、`toggleGroup` 或 `#groupRow`。

## 固定列

`fixed: 'left' | 'right'` 会使用 sticky 定位。固定列必须配置明确的 `width`，并确保表格总宽度大于容器宽度以产生横向滚动。

<demo vue="../../demos/s-table/fixed-columns.vue" />

## 调整列宽

列设置 `resizable: true` 后可拖拽调整宽度。`minWidth` / `maxWidth` 限制范围，`columnResizeMode` 控制更新发生在拖拽过程还是结束时。

<demo vue="../../demos/s-table/resizable.vue" />

## 隐藏列

`hidden: true` 用于隐藏列。运行时列显示控制可以通过响应式列定义更新 `hidden`，也可以通过 `getTanStackTable()` 使用底层列可见性 API。组件当前不内置列设置面板，工具栏由业务页面自行组织。

<demo vue="../../demos/s-table/column-visibility.vue" />
