# 分页与序号

分页适合将有限数据拆成稳定页面，也适合由服务端按页返回数据。分页可以与虚拟滚动组合：客户端模式虚拟化分页后的当前页，`manualPagination` 模式虚拟化服务端返回的当前页数据。

## 客户端分页

`pagination: true` 使用默认配置；传入对象可配置页大小、快速跳转、总数文案和位置。

<demo vue="../../demos/s-table/pagination.vue" />

### 非受控模式

使用 `defaultCurrent` 和 `defaultPageSize` 设置初始值，后续状态由组件维护。

```ts
const pagination: STablePaginationProps = {
  defaultCurrent: 1,
  defaultPageSize: 20,
  showSizeChanger: true,
};
```

### 受控模式

提供 `current`、`pageSize` 和 `onChange`。回调触发后必须更新外部状态，否则分页会保持原值。

```ts
const pagination = computed<STablePaginationProps>(() => ({
  current: page.value,
  pageSize: pageSize.value,
  onChange(nextPage, nextPageSize) {
    page.value = nextPage;
    pageSize.value = nextPageSize;
  },
}));
```

## 分页位置

`paginationPlacement` 支持顶部/底部和左/中/右组合：`topStart`、`topCenter`、`topEnd`、`bottomStart`、`bottomCenter`、`bottomEnd`。

## 序号列

`seq: true` 插入默认序号列。对象形式可调整标题、宽度、起始值、固定位置与跨页编号方式。

<demo vue="../../demos/s-table/serial-number.vue" />

服务端分页时 `dataSource` 只包含当前页。需要连续序号时保持 `paginate: true`，并确保分页的 `current` 和 `pageSize` 与服务端请求一致。

## 服务端分页

服务端分页设置 `manualPagination`，并提供 `pagination.total` 或 `pagination.pageCount`。组件只展示传入的当前页数据，不再切片。完整示例见[服务端数据](./server-side)。
