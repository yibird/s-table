# 服务端数据

当后端只返回当前页，或排序、过滤必须参与数据库查询时，使用手动数据模式。组件继续管理交互 UI，但不再在浏览器内执行对应的数据变换。

## 完整示例

示例用本地数组模拟接口延迟和后端分页/排序；真实项目中只需将 `fetchData()` 替换为请求函数。

<demo vue="../../demos/s-table/server-side.vue" />

## 三个手动开关

| Prop               | 组件停止执行的工作                   | 监听事件       |
| ------------------ | ------------------------------------ | -------------- |
| `manualPagination` | 不再对 `dataSource` 分页切片         | `pageChange`   |
| `manualSorting`    | 不再对 `dataSource` 排序             | `sortChange`   |
| `manualFiltering`  | 不再对 `dataSource` 应用列过滤与搜索 | `filterChange` |

这些开关互相独立，可只启用其中一项。

## 请求状态模型

```ts
interface TableQuery {
  page: number;
  pageSize: number;
  sortField: string | null;
  sortOrder: STableSortOrder | null;
  filters: Record<string, (string | number | boolean)[]>;
  searches: Record<string, string>;
}
```

事件只通知查询条件变化，不会请求接口。请求完成后需要更新 `dataSource`、`pagination.total`，并在受控分页中同步 `pagination.current/pageSize`。

## 服务端过滤

列仍需配置 `filters` 或 `search`，用于显示交互入口。启用 `manualFiltering` 后，组件通过一个事件同时返回全部过滤和搜索条件。

```vue
<script setup lang="ts">
const handleFilterChange = ({
  filters,
  searches,
}: {
  filters: Record<string, (string | number | boolean)[]>;
  searches: Record<string, string>;
}) => {
  query.filters = filters;
  query.searches = searches;
  query.page = 1;
  fetchData();
};
</script>

<template>
  <STable
    manual-filtering
    :columns="columns"
    :data-source="dataSource"
    @filter-change="handleFilterChange"
  />
</template>
```

## 并发请求

频繁排序、过滤时可能出现旧请求覆盖新结果。业务层应使用 `AbortController`、请求序号或查询库取消过期请求。

```ts
let requestId = 0;

async function fetchData() {
  const currentRequest = ++requestId;
  const result = await api.list(query);
  if (currentRequest !== requestId) return;
  dataSource.value = result.items;
  total.value = result.total;
}
```

## 事件重复

分页对象的 `onChange` 和组件的 `pageChange` 会针对同一次分页交互分别调用。选择一个作为请求入口，另一个只用于观测，避免重复请求。
