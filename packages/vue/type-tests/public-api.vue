<script setup lang="ts">
import STable, {
  createSTableColumnHelper,
  type STableColumn,
  type STableColumns,
  type STableCellRangeCopyEvent,
  type STableContextMenuSlotContext,
  type STableEmits,
  type STableInstance,
  type STableProps,
  type STableRowRenderModel,
  type STableSlots,
} from '../src';

interface User {
  id: number;
  name: string;
  score: number;
  profile: { department: string };
}

const users: User[] = [{ id: 1, name: 'Ada', score: 100, profile: { department: 'Engineering' } }];
const column = createSTableColumnHelper<User>();
const columns = [
  column.accessor('name', { header: '姓名' }),
  column.accessor('score', {
    header: '分数',
    cell: ({ getValue }) => getValue().toFixed(1),
  }),
] satisfies STableColumns<User>;

const propsContract = { dataSource: users, columns, rowKey: 'id' } satisfies STableProps<User>;
const handleCellRangeCopy = (payload: STableCellRangeCopyEvent) =>
  payload.text.length < 0 && payload.range.startRow < 0;
type SortChangePayload = STableEmits<User>['sortChange'][0];
const sortChangePayload: SortChangePayload = {
  columnId: 'score',
  order: 'ascend',
  sorting: [{ columnId: 'score', order: 'ascend' }],
  reason: 'user',
};
// @ts-expect-error sortChange 始终携带变化原因，避免服务端处理器依赖隐含默认值。
const incompleteSortChangePayload: SortChangePayload = { columnId: null, order: null };
// @ts-expect-error rowKey 必须是 User 的真实字段或返回有效 key 的函数。
const invalidRowKey: STableProps<User>['rowKey'] = 'missing';
// @ts-expect-error rowKey 字段本身必须是 string 或 number。
const invalidObjectPropKey: STableProps<User>['rowKey'] = 'profile';
// @ts-expect-error rowKey 函数必须返回 string 或 number，不能返回对象。
const invalidRowKeyFn: STableProps<User>['rowKey'] = () => ({ key: 'invalid' });
// @ts-expect-error accessorKey 必须以 User 的真实字段开头。
const invalidColumn: STableColumn<User> = { accessorKey: 'missing' };
// @ts-expect-error accessorFn 无法推导稳定列 ID，因此 id 必填。
const invalidAccessorFn: STableColumn<User, number> = { accessorFn: (row) => row.score };
// @ts-expect-error accessorKey 与 accessorFn 是互斥取值方式。
const invalidMixedAccessor: STableColumn<User, number> = {
  accessorKey: 'score',
  accessorFn: (row: User) => row.score,
};
const slotsContract = {
  expandedRowRender: ({ record }) => record.name,
  contextMenu: ({ row, rowIndex, close }) => `${row.name}:${rowIndex}:${typeof close}`,
  rowDragHandle: ({ record, index }) => `${record.id}:${index}`,
  cellEditor: ({ record, rowKey, columnId, value, setValue, commit, cancel }) => {
    setValue(value);
    cancel();
    return `${record.name}:${String(rowKey)}:${columnId}:${typeof commit}`;
  },
  filterPanel: ({ columnId, selectedKeys, setSelectedKeys, confirm, reset, close }) => {
    setSelectedKeys(selectedKeys);
    confirm();
    reset();
    close();
    return columnId;
  },
  groupRow: ({ column, count, depth, expanded, toggle }) => {
    toggle();
    return `${String(column?.id)}:${count}:${depth}:${expanded}`;
  },
} satisfies STableSlots<User>;

const readDynamicValue = (row: STableRowRenderModel<User>) => {
  const value = row.getValue('score');
  // @ts-expect-error 动态 columnId 无法证明值类型，应从精确 Cell context 读取当前列值。
  const score: number = value;
  return score;
};
const contextMenuScope: STableContextMenuSlotContext<User> = {
  row: users[0]!,
  rowIndex: 0,
  close: () => {},
};
type HasTableFeaturesProp = 'tableFeatures' extends keyof STableProps<User> ? true : false;
const hasTableFeaturesProp: HasTableFeaturesProp = false;
type HasLegacyProps = Extract<
  'childrenColumnName' | 'indentSize' | 'rowDraggable' | 'rowDragAnimation',
  keyof STableProps<User>
>;
const removedLegacyProps: HasLegacyProps extends never ? true : false = true;
type HasLegacyMethods = Extract<
  'clearAllSelection' | 'copySelectedRange' | 'openEditor' | 'ensureRowVisible',
  keyof STableInstance<User>
>;
const removedLegacyMethods: HasLegacyMethods extends never ? true : false = true;
type RangeCompatibilityMethod = 'getSelectedRange' | 'clearAllSelectedRange';
type HasRangeCompatibilityMethods = RangeCompatibilityMethod extends keyof STableInstance<User>
  ? true
  : false;
const hasRangeCompatibilityMethods: HasRangeCompatibilityMethods = true;
// 全局 Plugin API 已删除；若未来误加回 `use`，此赋值会在编译期失败。
type HasPluginUse = 'use' extends keyof typeof STable ? true : false;
const removedPluginApi: HasPluginUse = false;
const invalidMetaAlign: STableColumn<User> = {
  accessorKey: 'name',
  // @ts-expect-error meta.align 只接受 left / center / right。
  meta: { align: 'justify' },
};
const validMeta: STableColumn<User> = {
  accessorKey: 'name',
  meta: { align: 'center' },
};
// 绑定具体 TData 后，accessor 值类型保持精确，不受 TanStack RowData 的 any 索引感染。
const scoreCell = column.accessor('score', {
  cell: ({ getValue }) => {
    const value: number = getValue();
    return value.toFixed(1);
  },
});
const departmentCell = column.accessor('profile.department', {
  cell: ({ getValue }) => {
    const value: string = getValue();
    return value.toUpperCase();
  },
});
// @ts-expect-error nested accessor paths must exist on User.
const invalidNestedColumn = column.accessor('profile.missing', { header: 'Missing' });

defineExpose({
  propsContract,
  sortChangePayload,
  incompleteSortChangePayload,
  invalidRowKey,
  invalidObjectPropKey,
  invalidRowKeyFn,
  invalidColumn,
  invalidAccessorFn,
  invalidMixedAccessor,
  invalidMetaAlign,
  validMeta,
  scoreCell,
  departmentCell,
  invalidNestedColumn,
  slotsContract,
  readDynamicValue,
  contextMenuScope,
  hasTableFeaturesProp,
  removedLegacyProps,
  removedLegacyMethods,
  hasRangeCompatibilityMethods,
  removedPluginApi,
});

const acceptUser = (user: User) => user.name;
const acceptNumber = (value: number) => value;
const acceptBoolean = (value: boolean) => value;
</script>

<template>
  <STable
    :columns="columns"
    :data-source="users"
    row-key="id"
    row-drag
    @cell-range-copy="handleCellRangeCopy"
  >
    <template #expandedRowRender="{ record, index, expanded }">
      {{ acceptUser(record) }} {{ acceptNumber(index) }} {{ acceptBoolean(expanded) }}
    </template>
    <template #contextMenu="{ row, rowIndex, close }">
      <button type="button" @click="close">
        {{ acceptUser(row) }} {{ acceptNumber(rowIndex) }}
      </button>
    </template>
    <template #rowDragHandle="{ record, index }">
      {{ acceptUser(record) }} {{ acceptNumber(index) }}
    </template>
  </STable>

  <STable :columns="columns" :data-source="users" row-key="id" :expandable="{}">
    <template #expandedRowRender="{ record }">
      {{ acceptUser(record) }}
    </template>
  </STable>
</template>
