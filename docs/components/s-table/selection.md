# 行选择

提供 `rowSelection` 后，表格会注入选择列。多选使用 Checkbox，单选使用 Radio。涉及跨页、数据替换或虚拟滚动时必须提供稳定 `rowKey`。

## 多选、单选与禁用行

示例覆盖非受控多选、`v-model:selectedRowKeys` 受控多选、Radio 单选，以及通过 `getCheckboxProps` 禁用指定行。

<demo vue="../../demos/s-table/row-selection.vue" />

## 受控状态

```vue
<script setup lang="ts">
import { ref } from 'vue';
import type { STableRowKey, STableRowSelection } from '@zchengfeng/s-table-vue';

interface User {
  id: number;
  name: string;
}

const selectedRowKeys = ref<STableRowKey[]>([]);
const rowSelection: STableRowSelection<User> = { type: 'checkbox' };
</script>

<template>
  <STable
    v-model:selected-row-keys="selectedRowKeys"
    row-key="id"
    :row-selection="rowSelection"
    :columns="columns"
    :data-source="dataSource"
  />
</template>
```

`selectChange(keys, rows, info)` 在选择变化后触发。`info.type` 是 `all`、`none`、`invert`、`single` 或 `multiple`，可用于区分全选、清空和单行操作。

## 自定义批量选择

`rowSelection.selections` 在表头批量选择菜单后追加业务操作。回调接收当前 `selectedRowKeys` 和 `selectedRows` 快照。

```ts
const rowSelection: STableRowSelection<User> = {
  selections: [
    {
      key: 'active',
      text: '处理已选用户',
      onSelect(keys, rows) {
        submitUsers(rows.map((row) => row.id));
      },
    },
  ],
};
```

实际页面通常还会在表格上方提供受控选择状态和批量操作工具栏。锁定行可通过 `getCheckboxProps` 禁止选择，批量处理结束后由业务层清空 `selectedRowKeys`。

<demo vue="../../demos/s-table/selection-actions.vue" />

## 自定义选择单元格

`renderCell(checked, record, index, originNode)` 可以在默认 Checkbox/Radio 外包裹提示或业务标记。应保留 `originNode`，否则会丢失内置选择交互。

<demo vue="../../demos/s-table/selection-custom-cell.vue" />

## 数据更新与跨页保留

- 默认情况下，已从 `dataSource` 移除的键会从选择状态中清理。
- `preserveSelectedRowKeys: true` 会保留不在当前数据集中的键，适合服务端跨页选择。
- `getSelectedRows()` 只能返回当前表格能够解析到的行；仅保留了键但当前页没有该行时，不会凭空恢复行对象。
- Radio 模式最多保留一个键。

## 大数据选择意图

当选择范围可能跨越服务端分页或远程数据窗口时，使用 `rowSelection.strategy = 'intent'`，或直接传入 `selectionIntent` / `defaultSelectionIntent`（二者都会开启意图模式），不要把全部行键物化到 `selectedRowKeys`。选择意图只有两种形式：

```ts
type STableSelectionIntent =
  | { mode: 'all'; excludedRowKeys: STableRowKey[] }
  | { mode: 'include'; includedRowKeys: STableRowKey[] };

const rowSelection: STableRowSelection<User> = { strategy: 'intent' };
const selectionIntent = ref<STableSelectionIntent>({
  mode: 'all',
  excludedRowKeys: [],
});
```

`mode: 'all'` 表示当前查询结果全部选中，`excludedRowKeys` 只记录用户取消的行；`mode: 'include'` 只记录显式选中的键。使用 `v-model:selection-intent` 或 `selectionIntentChange` 接收变化，并通过实例的 `getSelectionIntent()` / `setSelectionIntent()` 读写快照。

意图模式不会触发 legacy `selectedRowKeys` 的百万键更新，也不会为了生成 `selectedRows` 扫描远程数据。提交给服务端时应传递查询条件、意图和例外键，由服务端解释全选范围。

`getSelectedRowKeys()` 在 `mode: 'all'` 时返回 `[]`（未物化全量键）。`selectChange` 和 `v-model:selectedRowKeys` 在 intent 策略下不会更新；请使用 `v-model:selection-intent` 或 `selectionIntentChange`。

<demo vue="../../demos/s-table/selection-intent.vue" />

## 实例方法

`selectAll()`、`clearSelection()`、`toggleRowSelection()` 可处理命令式操作。`keys` 策略下一般业务状态仍建议优先使用 `v-model:selectedRowKeys`；intent 策略下应使用 `v-model:selection-intent`。

## 选择细节

```ts
const rowSelection = {
  type: 'checkbox',
  checkStrictly: false, // 树形父子级联
  allowCancelRadio: true, // 单选可再次点击取消
  hideDefaultSelections: true, // 隐藏内置批量动作
  columnTitle: ({ allSelected }) => (allSelected ? '已全选' : '选择'),
  selections: [{ key: 'tech', text: '选择技术部' }],
};
```

<demo vue="../../demos/s-table/selection-expand-advanced.vue" />
