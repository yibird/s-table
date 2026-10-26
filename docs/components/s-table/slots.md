# 插槽

STable 的插槽用于替换状态内容或扩展特定区域。列头和单元格不使用命名插槽，而是在列定义中通过 `header` / `cell` 渲染函数完成。

## 插槽总览

| Slot                | 参数                          | 类型                                                  | 描述                       |
| ------------------- | ----------------------------- | ----------------------------------------------------- | -------------------------- |
| `empty`             | 无                            | `() => VNodeChild`                                    | 替换整个空状态             |
| `emptyAction`       | 无                            | `() => VNodeChild`                                    | 在默认空状态说明后追加操作 |
| `loading`           | 无                            | `() => VNodeChild`                                    | 替换加载指示器             |
| `expandedRowRender` | `record`, `index`, `expanded` | `{ record: TData; index: number; expanded: boolean }` | 展开行内容                 |
| `contextMenu`       | `row`, `rowIndex`, `close`    | `STableContextMenuSlotContext<TData>`                 | 行右键菜单                 |
| `scrollToBottom`    | 无                            | `() => VNodeChild`                                    | 触底状态内容               |
| `rowDragHandle`     | `record`, `index`             | `{ record: TData; index: number }`                    | 替换行拖拽句柄内容         |
| `cellEditor`        | 编辑目标、草稿值和提交操作    | `STableCellEditorSlotContext<TData>`                  | 自定义单元格编辑器         |
| `filterPanel`       | 列、选择值和面板操作          | `STableFilterPanelSlotContext<TData>`                 | 自定义列过滤面板           |
| `groupRow`          | 分组值、数量和展开操作        | `STableGroupRowSlotContext<TData>`                    | 自定义整行分组内容         |
| `summary`           | 无                            | `() => VNodeChild`                                    | 表格 `<tfoot>` 汇总区域    |
| `footer`            | 无                            | `() => VNodeChild`                                    | 表格下方通用页脚           |

## 类型安全

`STableSlots<TData>` 是组件公开 Slot 的唯一类型合同。通常 Vue 能从 `columns` 和
`dataSource` 推导 `TData`；当页面存在多个候选类型或模板推导不稳定时，可用
`@vue-generic` 显式锁定行类型。此后 `record`、`row` 和拖拽句柄参数都会获得准确提示，
错误字段会在 `vue-tsc` 阶段被拒绝，无需 `as` 断言。

<demo vue="../../demos/s-table/type-safe-slots.vue" />

## empty

```vue
<STable :columns="columns" :data-source="[]">
  <template #empty>
    <div>暂无符合条件的数据</div>
  </template>
</STable>
```

## emptyAction

```vue
<STable :columns="columns" :data-source="[]">
  <template #emptyAction>
    <button type="button" @click="createRecord">新增数据</button>
  </template>
</STable>
```

完整示例(同时演示 `empty` 与 `emptyAction`):

<demo vue="../../demos/s-table/empty.vue" />

## loading

```vue
<STable loading :columns="columns" :data-source="dataSource">
  <template #loading>
    <span>正在同步订单...</span>
  </template>
</STable>
```

## expandedRowRender

必须同时提供 `expandable`。`expanded` 表示当前展开状态，`record` 保留 `TData` 类型。

```vue
<STable row-key="id" :expandable="{}" :columns="columns" :data-source="dataSource">
  <template #expandedRowRender="{ record, index, expanded }">
    <section v-if="expanded">
      第 {{ index + 1 }} 行：{{ record.description }}
    </section>
  </template>
</STable>
```

## contextMenu

```vue
<STable :columns="columns" :data-source="dataSource">
  <template #contextMenu="{ row, rowIndex, close }">
    <button type="button" @click="openDetail(row, rowIndex, close)">查看详情</button>
  </template>
</STable>
```

操作结束后调用 `close()`。右键点击空状态或表头不会提供数据行。

## scrollToBottom

```vue
<STable
  :virtual="{ y: true, x: false, scrollToBottomOffset: 80 }"
  :columns="columns"
  :data-source="dataSource"
  @scroll-to-bottom="loadMore"
>
  <template #scrollToBottom>
    <span v-if="loadingMore">加载更多...</span>
  </template>
</STable>
```

## rowDragHandle

```vue
<STable row-drag :columns="columns" :data-source="dataSource">
  <template #rowDragHandle="{ record, index }">
    <span :title="`移动 ${record.name}`">{{ index + 1 }} ⋮⋮</span>
  </template>
</STable>
```

## cellEditor

插槽收到 `record`、`rowKey`、`rowIndex`、`column`、`columnId`、`value`、`setValue`、`commit` 和 `cancel`。它只替换编辑控件，草稿、校验和提交仍由表格管理。可运行示例见[自定义编辑器](./editing#自定义编辑器)。

```vue
<template #cellEditor="{ value, setValue, commit, cancel }">
  <MyDatePicker
    :model-value="value"
    @update:model-value="setValue"
    @confirm="commit"
    @cancel="cancel"
  />
</template>
```

## filterPanel

列设置 `filterMode: 'custom'` 后使用该插槽。`setSelectedKeys` 更新面板草稿，`confirm` 应用过滤，`reset` 清空草稿，`close` 只关闭浮层。可运行示例见[自定义过滤面板](./sorting-filtering#自定义过滤面板)。

```vue
<template #filterPanel="{ selectedKeys, setSelectedKeys, confirm, reset }">
  <StatusPicker :model-value="selectedKeys" @update:model-value="setSelectedKeys" />
  <button type="button" @click="reset">重置</button>
  <button type="button" @click="confirm">确定</button>
</template>
```

## groupRow

行分组激活后，可用该插槽替换默认分组行。作用域包含 `groupRowId`、`columnId`、`groupValue`、`count`、`depth`、`expanded` 和 `toggle()`。`groupRowId` 可传给实例方法 `toggleGroup`。

```vue
<template #groupRow="{ groupValue, count, expanded, toggle }">
  <button type="button" @click="toggle">
    {{ expanded ? '▾' : '▸' }} {{ groupValue }}（{{ count }}）
  </button>
</template>
```

## summary

<demo vue="../../demos/s-table/summary.vue" />

```vue
<script setup lang="ts">
import { SummaryCell, SummaryRow } from '@zchengfeng/s-table-vue';
</script>

<template>
  <STable :columns="columns" :data-source="dataSource">
    <template #summary>
      <SummaryRow>
        <SummaryCell :index="0" :col-span="2">合计</SummaryCell>
        <SummaryCell :index="2" align="right">{{ total }}</SummaryCell>
      </SummaryRow>
    </template>
  </STable>
</template>
```

## footer

提供 `#footer` 插槽或 `footer` 属性即可渲染 Footer 容器，无需额外开关。

```vue
<STable :columns="columns" :data-source="dataSource">
  <template #footer>
    <div>共 {{ dataSource.length }} 条记录</div>
  </template>
</STable>
```

<demo vue="../../demos/s-table/footer.vue" />
