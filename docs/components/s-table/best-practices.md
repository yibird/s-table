# 最佳实践与性能

表格性能主要由数据对象数量、行模型计算、实际 DOM 行数和单元格渲染复杂度决定。压缩构建产物不能替代正确的数据与渲染策略。

## 推荐写法

### 保持列引用稳定

静态列直接声明为常量；依赖权限或语言时使用 `computed`，不要在模板或渲染周期内重复创建。

```ts
const columns = computed<STableColumn<User>[]>(() => [
  { accessorKey: 'name', header: locale.value.name },
  ...(canViewSalary.value
    ? [{ accessorKey: 'salary', header: locale.value.salary } as STableColumn<User>]
    : []),
]);
```

### 大数组使用 shallowRef

只通过替换数组更新数据时，`shallowRef` 避免把每个大对象递归转成深层响应式代理。

```ts
const dataSource = shallowRef<User[]>(initialUsers);

async function refresh() {
  dataSource.value = await api.listUsers();
}
```

如果依赖 `push` / `splice` 触发更新，则使用普通 `ref` 或在修改后替换数组引用。

### 不可变更新行数据

TanStack Table 会缓存 Row Model 和 accessor 值。默认通过替换发生变化的行和数组引用更新数据，既能精确刷新，也不需要深度遍历整个数据集。

```ts
dataSource.value = dataSource.value.map((row) =>
  row.id === changedId ? { ...row, status: 'done' } : row
);
```

### 提供稳定 rowKey

```vue
<STable row-key="id" :columns="columns" :data-source="dataSource" />
```

行键必须唯一且在数据生命周期内不变。索引键在排序、过滤、拖拽或服务端换页后会指向不同记录。

### 状态归属清晰

需要 URL 同步、缓存恢复或跨组件共享时使用受控状态；局部临时交互使用默认非受控状态，避免父组件做无意义的双向同步。

## 不推荐写法

### 在模板中创建数组

```vue
<!-- 不推荐：每次父组件更新都创建新引用 -->
<STable :columns="createColumns()" :data-source="dataSource.filter(canView)" />
```

改为 `computed`，让依赖没有变化时复用结果。

### 深度 watch 整个数据集

```ts
// 不推荐：大数组任意深层字段变化都会遍历和触发副作用
watch(dataSource, saveDraft, { deep: true });
```

应在明确的数据编辑动作中保存，或只 watch 需要持久化的轻量状态。

### 同时从两个分页回调请求

```ts
// 不推荐：pagination.onChange 和 @page-change 都调用 fetchData
```

两者会对应同一次交互。选择一个作为请求入口。

### 无条件一次创建十万条完整对象

虚拟滚动减少 DOM，不会减少 JavaScript 对象、网络传输或 TanStack 行模型的创建成本。优先使用服务端分页、游标加载或按需生成。

## 大数据策略

1. 先减少需要进入浏览器的数据量。
2. 数据必须连续浏览时启用虚拟滚动。
3. 主行等高时设置 `rowHeight`。
4. 保持 `columns` 和配置对象引用稳定；数据变化时不可变替换对应行和 `dataSource`。
5. 控制单元格渲染复杂度，避免每个可见单元格创建昂贵组件。
6. 使用唯一 `rowKey`，避免选择与展开状态扫描和错位。

建议按以下预算选择模式：

| 场景               | 建议                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| 非虚拟完整渲染     | 不超过约 1,000 行；更大数据请显式分页或虚拟化                                                        |
| 本地排序/过滤/分组 | 以 50,000 行作为开发态告警线，必须用目标设备实测                                                     |
| 服务端窗口         | 100,000 行以上只把当前页/窗口传入组件，并开启 `manualPagination`、`manualSorting`、`manualFiltering` |
| 百万级连续滚动     | 使用服务端稀疏窗口/分块缓存；不要把百万条记录交给 TanStack Core Row Model                            |

开发环境会在非虚拟大表、50K+ 本地 Row Model、100K+ 未完整 manual 化数据和 10K+ 受控 key 数组时告警。`allowUnsafeFullRender` 只适合经过实测的特殊场景，它不会改变渲染成本。

全选跨页时使用 `rowSelection.strategy = 'intent'`；单格远程更新使用 `editConfig.updateMode = 'patch'`，避免为一次修改替换完整 dataSource。

## 虚拟滚动参数

- `rowHeight`：固定行高性能最好，但内容换行会导致布局错误。
- `estimateSize`：动态行高的初始估值，越接近真实高度，滚动条修正越小。
- `overscan`：提高可减少快速滚动白屏，但会增加同时渲染的行数。先用默认值，再根据目标设备实测。

## TanStack 行模型

- 排序、过滤和分页会建立派生行模型；服务端已有结果时打开对应 `manual*`，避免重复计算。
- 纯 `search: true` 列直接使用 TanStack 的 `includesString` 过滤器；只有业务语义不同或需要多字段匹配时才提供自定义 `filterFn`。
- 默认排序、过滤、分页、选择、展开、列显隐、列固定和列宽状态均由 TanStack Table 管理；组件只负责把配置映射为 UI 和事件，不要在业务层再次遍历行模型实现同一套规则。
- `getTanStackTable()` 是高级逃生口，不应在每次渲染中反复改写底层状态。
- 不要重复创建表格组件实例来“刷新”数据；替换行对象或 `dataSource` 引用即可。

## 导出

导出会处理排序、过滤后的完整数据。大数据导出虽然按批次让出主线程，仍可能占用显著内存。CSV 走流式 Blob 构建、内存峰值最低；`.xlsx` 需在内存中组装工作簿后压缩，数据量大时开销更高。超大结果集更适合服务端异步生成文件。

## 性能验证

使用生产构建而不是开发模式评估：

```sh
pnpm build
pnpm docs:build
pnpm docs:preview
```

重点记录进入页面主线程长任务、行模型构建时间、滚动帧率和内存峰值，而不只看 gzip 包体。
