# 行列拖拽

拖拽用于调整显示顺序，不会自动持久化业务数据。监听变化事件后，应由业务层保存新顺序。

## 列拖拽

需要拖拽的叶子列设置 `draggable: true`。拖拽结束触发 `columnOrderChange`，载荷包含新列定义、叶子列 ID 顺序和移动前后索引。

<demo vue="../../demos/s-table/column-drag.vue" />

## 列拖拽动画

`columnDrag.animation` 使用 FLIP 动画平滑列位置变化。大量列或复杂单元格下，应实测动画成本。

<demo vue="../../demos/s-table/column-drag-animation.vue" />

## 行拖拽

`rowDrag` 会在最左侧注入拖拽句柄列。传 `true` 使用默认行为，传对象可配置动画、多行拖动、树节点换层和投放拦截。拖拽结束会同时触发 `update:dataSource` 和 `rowOrderChange`：前者适合 `v-model:data-source`，后者携带移动索引、行键和落点，便于业务层持久化顺序。行重排和 FLIP 动画必须提供稳定的 `rowKey`，不能使用默认数组索引。

<demo vue="../../demos/s-table/row-drag.vue" />

```ts
function handleRowOrderChange(payload: { dataSource: User[]; fromIndex: number; toIndex: number }) {
  saveOrder(payload.dataSource.map((row) => row.id));
}
```

使用 `v-model:data-source` 即可让表格立即采用新顺序；`rowOrderChange` 适合把顺序持久化到后端。

`rowDrag.multiple` 会把当前选中行作为有序块移动。树形表格设置 `allowTreeReparent` 后，落点支持 `before`、`after` 和 `inside`；`beforeDrop` 可同步或异步拒绝一次移动。排序激活时组件会禁用手工行重排，避免可见顺序与原始数据顺序错配。

<demo vue="../../demos/s-table/tree-drag.vue" />

## 行拖拽动画

`rowDrag.animation` 在释放时平滑过渡行位置。虚拟滚动、跨页数据和服务端排序场景下，要先明确“当前可见顺序”是否允许作为业务顺序保存。

<demo vue="../../demos/s-table/row-drag-animation.vue" />

## 拖拽权限

`columnDrag.canDrag` 与 `rowDrag.canDrag` 在每次拖拽开始时同步求值，返回 `false` 会取消本次拖拽，不会进入拖拽态，也不会触发顺序变化。适合根据业务状态动态限制拖拽源。

```ts
const columnDrag = {
  canDrag: ({ columnId }: { columnId: string }) => !lockedColumnIds.includes(columnId),
};

const rowDrag = {
  canDrag: ({ record }: { record: User }) => record.status !== 'locked',
};
```

下面的示例同时演示 `canDrag`、异步 `beforeDrop`、自定义拖拽句柄与顺序变化事件。

<demo vue="../../demos/s-table/drag-permissions.vue" />

## 自定义拖拽句柄

`#rowDragHandle` 接收 `{ record, index }`，只替换句柄内容，不改变拖拽逻辑。

```vue
<STable row-drag :columns="columns" :data-source="dataSource">
  <template #rowDragHandle="{ record, index }">
    <span :aria-label="`移动 ${record.name}`">{{ index + 1 }} ⋮⋮</span>
  </template>
</STable>
```

## 命令式列顺序

实例提供 `getColumnOrder()`、`setColumnOrder()`、`resetColumnOrder()`、`swapColumns()`、`moveColumn()` 和 `moveColumnByIndex()`。这些方法只处理用户叶子列，内置拖拽、选择、展开和序号列不包含在返回顺序中。

## 整行拖拽与自定义预览

```ts
const rowDrag = {
  trigger: 'row', // 整行可拖，按钮/输入框等交互控件除外
  canDrag: ({ record }) => record.status !== 'locked',
  ghost: ({ record }) => h('div', { class: 'drag-ghost' }, record.name),
};

const columnDrag = {
  ghost: ({ columnId }) => h('span', { class: 'column-ghost' }, columnId),
};
```

`rowDrag` 也可以直接传函数：`rowDrag: ({ record }) => record.status !== 'locked'`，等价于只配置 `canDrag`。

<demo vue="../../demos/s-table/drag-advanced.vue" />
