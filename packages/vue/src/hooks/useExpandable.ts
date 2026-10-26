import { computed, shallowRef, watch, type Ref } from 'vue';
import type {
  ColumnDef,
  ExpandedState,
  Row,
  RowData,
  Table,
  TableFeatures,
  Updater,
} from '@tanstack/vue-table';
import type { STableExpandable, STableRowKey, STableRowKeyField, STableTree } from '../types';
import { decodeRowKey, encodeRowKey, resolveRowStateEntries } from '../utils';
import { createExpandColumn, createTreeExpandColumn } from '../presets/expandColumn';
import { useModelState } from './useModelState';

type STableInstance<TData extends RowData> = Table<TableFeatures, TData>;

const EMPTY_EXPANDABLE_ROW_IDS: ReadonlySet<string> = new Set();

type UseSTableExpandableOptions<TData extends RowData> = {
  expandable: Readonly<Ref<STableExpandable<TData> | undefined>>;
  tree?: Readonly<Ref<STableTree<TData> | undefined>>;
  expandedRowKeys: Readonly<Ref<STableRowKey[] | undefined>>;
  defaultExpandedRowKeys: Readonly<Ref<STableRowKey[] | undefined>>;
  /** 数据和 rowKey 变化后清理非受控状态中已不存在的行键。 */
  dataSource: Readonly<Ref<readonly TData[]>>;
  rowKey: Readonly<Ref<STableRowKeyField<TData> | ((record: TData) => STableRowKey) | undefined>>;
  getTable: () => STableInstance<TData> | undefined;
  onUpdateExpandedRowKeys: (keys: STableRowKey[]) => void;
  onExpandChange: (expanded: boolean, record: TData) => void;
  /** 展开触发器的无障碍文案（来自 locale.accessibility.expandTrigger）。 */
  getExpandAriaLabel: () => string;
};

/**
 * 行展开公开 API 适配层。
 * 展开状态与行能力交给 TanStack，组件只负责公开 key 类型及 expandChange 事件。
 */
export const useExpandable = <TData extends RowData>({
  expandable,
  tree,
  expandedRowKeys: controlledKeys,
  defaultExpandedRowKeys,
  dataSource,
  rowKey,
  getTable,
  onUpdateExpandedRowKeys,
  onExpandChange,
  getExpandAriaLabel,
}: UseSTableExpandableOptions<TData>) => {
  const {
    state: rawExpandedKeys,
    internal: internalKeys,
    isControlled,
  } = useModelState<STableRowKey[]>({
    modelValue: controlledKeys,
    defaultValue: () => [...(defaultExpandedRowKeys.value ?? [])],
    // 切回非受控时继承最后一次受控值，避免意外恢复挂载时的默认展开项。
    toInternalValue: (keys) => [...keys],
  });
  const treeEnabled = computed(() => Boolean(tree?.value));
  const expandableRowIds = shallowRef<ReadonlySet<string>>();
  const expandedRowKeys = computed(() => {
    const keys = rawExpandedKeys.value;
    const validKeys = expandableRowIds.value
      ? keys.filter((key) => expandableRowIds.value!.has(encodeRowKey(key)))
      : keys;
    return expandable.value?.multiple === false && validKeys.length > 1
      ? validKeys.slice(0, 1)
      : validKeys;
  });
  const expandedState = computed<ExpandedState>(() => {
    const state: Record<string, boolean> = Object.create(null) as Record<string, boolean>;
    for (const key of expandedRowKeys.value) state[encodeRowKey(key)] = true;
    return state;
  });

  watch(
    [
      dataSource,
      rowKey,
      () => Boolean(expandable.value),
      treeEnabled,
      () => expandable.value?.isRowExpandable,
      () => tree?.value?.getChildren,
      () => tree?.value?.childrenColumnName,
      () => getTable(),
    ],
    () => {
      const table = getTable();
      if (!table || (!expandable.value && !treeEnabled.value)) {
        // 普通表格没有可展开节点；直接使用空集合，避免数据变化时无意义地扫描 Row Model。
        expandableRowIds.value = EMPTY_EXPANDABLE_ROW_IDS;
        return;
      }

      // 可展开能力只在数据/树配置变化后重新建立；渲染和状态读取直接复用集合，
      // 避免 computed 反向读取 expanded row model 形成响应式递归。
      const nextIds = new Set<string>();
      for (const row of table.getCoreRowModel().flatRows) {
        if (row.getCanExpand()) nextIds.add(row.id);
      }
      expandableRowIds.value = nextIds;
      if (isControlled.value || internalKeys.value.length === 0) return;
      // 清理只遍历现有展开项，不再复制完整 flatRows。
      const existingKeys = internalKeys.value.filter((key) => nextIds.has(encodeRowKey(key)));
      if (existingKeys.length !== internalKeys.value.length) internalKeys.value = existingKeys;
    },
    // useSTable 的同步 options 桥接先把新数据交给 TanStack，再按 rowsById 做 O(展开数) 清理。
    { flush: 'post' }
  );

  /** 将 TanStack 行模型转换为组件公开的行键。 */
  const getPublicKey = (row: Row<TableFeatures, TData>): STableRowKey => decodeRowKey(row.id);

  let pendingRowChange: { expanded: boolean; record: TData } | undefined;

  /** 提交展开状态，并同步受控事件与单行展开事件。 */
  const commitExpanded = (nextState: ExpandedState) => {
    const table = getTable();
    const coreModel = table?.getCoreRowModel();
    const entries: Array<{ key: STableRowKey; row?: Row<TableFeatures, TData> }> = [];

    if (nextState === true) {
      for (const row of coreModel?.flatRows ?? []) {
        if (row.getCanExpand()) entries.push({ key: getPublicKey(row), row });
      }
    } else {
      entries.push(...resolveRowStateEntries(nextState, coreModel, true));
    }
    const nextKeys = entries.map((entry) => entry.key);
    if (!isControlled.value) internalKeys.value = nextKeys;
    onUpdateExpandedRowKeys([...nextKeys]);

    if (pendingRowChange) {
      onExpandChange(pendingRowChange.expanded, pendingRowChange.record);
    }
  };

  /** 接收 TanStack updater，并将结果提交到组件状态。 */
  const onExpandedChange = (updater: Updater<ExpandedState>) => {
    const current = expandedState.value;
    const next = typeof updater === 'function' ? updater(current) : updater;
    commitExpanded(next);
  };

  /** 按公开行键查找 TanStack 核心行模型。 */
  const getRow = (key: STableRowKey) => getTable()?.getCoreRowModel().rowsById[encodeRowKey(key)];

  /** 在记录单行变更上下文的同时执行 TanStack 展开命令。 */
  const runExpandCommand = (
    rowChange: { expanded: boolean; record: TData } | undefined,
    command: (table: STableInstance<TData>) => void
  ) => {
    const table = getTable();
    if (!table || (!expandable.value && !treeEnabled.value)) return;
    pendingRowChange = rowChange;
    try {
      command(table);
    } finally {
      pendingRowChange = undefined;
    }
  };

  /** 切换指定行的展开状态。 */
  const toggleExpand = (key: STableRowKey) => {
    const row = getRow(key);
    if (!row?.getCanExpand()) return;
    const nextExpanded = !row.getIsExpanded();
    runExpandCommand({ expanded: nextExpanded, record: row.original }, (table) => {
      if (nextExpanded && expandable.value?.multiple === false) {
        table.setExpanded({ [row.id]: true });
      } else {
        row.toggleExpanded(nextExpanded);
      }
    });
  };

  /** 展开指定行，并遵守单行展开配置。 */
  const expandRow = (key: STableRowKey) => {
    const row = getRow(key);
    if (!row?.getCanExpand() || row.getIsExpanded()) return;
    runExpandCommand({ expanded: true, record: row.original }, (table) => {
      if (expandable.value?.multiple === false) table.setExpanded({ [row.id]: true });
      else row.toggleExpanded(true);
    });
  };

  /** 收起指定行。 */
  const collapseRow = (key: STableRowKey) => {
    const row = getRow(key);
    if (!row?.getIsExpanded()) return;
    runExpandCommand({ expanded: false, record: row.original }, () => row.toggleExpanded(false));
  };

  /** 展开全部允许展开的行。 */
  const expandAll = () => {
    runExpandCommand(undefined, (table) => {
      const rows = table.getCoreRowModel().flatRows;
      if (expandable.value?.multiple === false) {
        const firstExpandableRow = rows.find((row) => row.getCanExpand());
        table.setExpanded(firstExpandableRow ? { [firstExpandableRow.id]: true } : {});
        return;
      }
      const next: Record<string, boolean> = Object.create(null) as Record<string, boolean>;
      // expanded=true 会让禁用行也处于展开态，因此这里只遍历可展开行并交给内置 setExpanded。
      for (const row of rows) {
        if (row.getCanExpand()) next[row.id] = true;
      }
      table.setExpanded(next);
    });
  };

  /** 收起全部已展开行。 */
  const collapseAll = () =>
    runExpandCommand(undefined, (table) => table.toggleAllRowsExpanded(false));

  const expandColumn = computed<ColumnDef<TableFeatures, TData, unknown> | undefined>(() => {
    const config = expandable.value;
    if (!config) return undefined;
    return createExpandColumn<TData>({
      config,
      getPublicKey,
      onToggle: toggleExpand,
      getAriaLabel: getExpandAriaLabel,
    });
  });

  const treeColumn = computed<ColumnDef<TableFeatures, TData, unknown> | undefined>(() => {
    if (!treeEnabled.value) return undefined;
    return createTreeExpandColumn<TData>({
      getPublicKey,
      onToggle: toggleExpand,
      getAriaLabel: getExpandAriaLabel,
    });
  });

  return {
    expandedRowKeys,
    expandedState,
    onExpandedChange,
    expandColumn,
    treeColumn,
    toggleExpand,
    expandRow,
    collapseRow,
    expandAll,
    collapseAll,
  };
};
