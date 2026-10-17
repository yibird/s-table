# 单元格与整行编辑

编辑状态由 `STableEditingState` 表示，包含模式、行键、当前列和未提交草稿。默认提交模式通过 `update:dataSource` 返回不可变的新数组，因此可以直接使用 `v-model:data-source`。大数据或远程行 store 可将 `editConfig.updateMode` 设为 `patch`，只接收 `editPatch`，不替换完整 `dataSource`。

<demo vue="../../demos/s-table/editing.vue" />

## 编辑列

列设置 `editable: true` 后才可编辑；函数形式可按行控制。`editableTrigger` 可覆盖表格级 `editConfig.trigger`，支持 `click`、`dblclick` 和 `manual`。内置编辑器包含 `text`、`number`、`checkbox`，复杂控件使用 `#cellEditor`。

```ts
const columns: STableColumn<Order>[] = [
  {
    accessorKey: 'amount',
    editable: true,
    editor: 'number',
    valueParser: (value) => Number(value),
  },
];
```

`valueParser` 在值进入草稿时转换类型；`valueSetter` 用于 `accessorFn` 或特殊数据结构的不可变写回。行模式会一次收集该行所有可编辑列。

## 校验与生命周期

`editConfig.validate(values, record, rowIndex)` 可返回布尔值、错误文本或 Promise。失败时草稿保留并触发 `editValidateError`。完整事件为 `editStart`、`editChange`、`editCommit`、`editCancel`、`editValidateError`。

## 受控状态和实例方法

使用 `v-model:editing` 可把草稿交给表单或状态库管理。实例方法包括 `startCellEdit`、`startRowEdit`、`setEditValue`、`commitEdit` 和 `cancelEdit`。

## Patch 提交

```ts
const editConfig: STableEditConfig<Invoice> = {
  updateMode: 'patch',
  trigger: 'dblclick',
};

function handleEditPatch(patch: STableEditPatch<Invoice>) {
  // 以 rowKey + revision 更新远程 store；dataSource 不会被组件替换。
  invoiceStore.applyPatch(patch.rowKey, patch.values, patch.revision);
}
```

`editPatch` 包含 `rowKey`、本次修改的 `values`、`previousRecord`、`nextRecord` 和递增的 `revision`。校验失败不会派发 patch，草稿会保留在当前编辑状态中。

虚拟滚动场景应先调用 `scrollToRow(rowKey)`，再在下一帧调用 `startCellEdit` 或 `startRowEdit`；目标行不存在时 `scrollToRow` 返回 `false`。
