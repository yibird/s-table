import { computed, shallowRef, watch, type Ref } from 'vue';
import type {
  ColumnDef,
  Row,
  RowData,
  RowSelectionState,
  Table,
  TableFeatures,
  Updater,
} from '@tanstack/vue-table';
import type {
  STableCheckboxProps,
  STableRowKey,
  STableRowKeyField,
  STableRowSelection,
  STableSelectionIntent,
  STableSelectionChangeInfo,
} from '../types';
import { decodeRowKey, encodeRowKey, resolveRowKey, resolveRowStateEntries } from '../utils';
import { createSelectionColumn } from '../presets/selectionColumn';
import { useModelState } from './useModelState';
import {
  cloneSelectionIntent,
  sameSelectionIntent,
  useSelectionIntent,
  INTENT_ALL_TOKEN,
  EMPTY_SELECTION_INTENT,
} from './useSelectionIntent';

type STableInstance<TData extends RowData> = Table<TableFeatures, TData>;

type UseSTableRowSelectionOptions<TData extends RowData> = {
  rowSelection: Readonly<Ref<STableRowSelection<TData> | undefined>>;
  selectedRowKeys: Readonly<Ref<STableRowKey[] | undefined>>;
  defaultSelectedRowKeys: Readonly<Ref<STableRowKey[] | undefined>>;
  selectionIntent: Readonly<Ref<STableSelectionIntent | undefined>>;
  defaultSelectionIntent: Readonly<Ref<STableSelectionIntent | undefined>>;
  dataSource: Readonly<Ref<readonly TData[]>>;
  paginationEnabled: Readonly<Ref<boolean>>;
  rowKey?: Readonly<Ref<STableRowKeyField<TData> | ((record: TData) => STableRowKey) | undefined>>;
  /** hook 创建早于 table，通过惰性 getter 在交互时取得实例。 */
  getTable: () => STableInstance<TData> | undefined;
  onUpdateSelectedRowKeys: (keys: STableRowKey[]) => void;
  onSelectChange: (keys: STableRowKey[], rows: TData[], info: STableSelectionChangeInfo) => void;
  onUpdateSelectionIntent: (intent: STableSelectionIntent) => void;
  onSelectionIntentChange: (intent: STableSelectionIntent, info: STableSelectionChangeInfo) => void;
};

/**
 * 行选择公开 API 适配层。
 * TanStack 的 RowSelectionState 是内部唯一模型，本 hook 只负责 key 类型恢复和事件桥接。
 */
export const useRowSelection = <TData extends RowData>({
  rowSelection,
  selectedRowKeys: controlledKeys,
  defaultSelectedRowKeys,
  selectionIntent: controlledSelectionIntent,
  defaultSelectionIntent,
  dataSource,
  paginationEnabled,
  rowKey: rowKeyConfig,
  getTable,
  onUpdateSelectedRowKeys,
  onSelectChange,
  onUpdateSelectionIntent,
  onSelectionIntentChange,
}: UseSTableRowSelectionOptions<TData>) => {
  // 内部选择由当前 TanStack Row 产生时天然有效；记录其数据/rowKey 版本，避免每次点击后
  // 再为“清理已删除 key”扫描完整数据源。数据或 rowKey 变化后会自动失效并重新校验。
  let validatedInternalDataSource: readonly TData[] | undefined;
  let validatedInternalRowKey: string | ((record: TData) => STableRowKey) | undefined;
  const {
    state: rawKeys,
    internal: internalKeys,
    isControlled,
  } = useModelState<STableRowKey[]>({
    modelValue: controlledKeys,
    defaultValue: () => [...(defaultSelectedRowKeys.value ?? [])],
    // 记住最后一次受控值，受控切回非受控时继续当前选择，而不是恢复默认值。
    toInternalValue: (keys) => [...keys],
    onSync: () => {
      validatedInternalDataSource = undefined;
      validatedInternalRowKey = undefined;
    },
  });
  const {
    intentMode,
    selectionIntent,
    isIntentRowSelected,
    setSelectionIntent,
    updateIntentRows,
    commitIntent,
  } = useSelectionIntent<TData>({
    rowSelection,
    controlledSelectionIntent,
    defaultSelectionIntent,
    getTable,
    onUpdateSelectionIntent,
    onSelectionIntentChange,
  });
  /** 直接解析复选框属性：record 修改后每次调用都拿到新鲜结果。 */
  const resolveCheckboxProps = (
    row: Row<TableFeatures, TData>,
    resolver = rowSelection.value?.getCheckboxProps
  ): STableCheckboxProps => resolver?.(row.original) ?? {};
  const isRowSelected = (row: Row<TableFeatures, TData>) => {
    if (!intentMode.value) return row.getIsSelected();
    const resolver = rowSelection.value?.getCheckboxProps;
    const checkboxProps = resolveCheckboxProps(row, resolver);
    return isIntentRowSelected(decodeRowKey(row.id), row, checkboxProps.disabled !== true);
  };
  const existingSelectedRowIds = computed(() => {
    const keys = rawKeys.value;
    if (rowSelection.value?.preserveSelectedRowKeys === true || keys.length === 0) return undefined;

    const records = dataSource.value;
    const currentRowKey = rowKeyConfig?.value;
    if (
      !isControlled.value &&
      validatedInternalDataSource === records &&
      validatedInternalRowKey === currentRowKey
    ) {
      return undefined;
    }

    const table = getTable();
    // Vue adapter 同步完成后直接复用 TanStack 核心行索引：复杂度从扫描全部数据的
    // O(n) 降为 O(选中数)，同时 rowsById 天然包含树形子行。
    if (table?.options.data === records) {
      const rowsById = table.getCoreRowModel().rowsById;
      const existingIds = new Set<string>();
      for (const key of keys) {
        const id = encodeRowKey(key);
        if (rowsById[id]) existingIds.add(id);
      }
      return existingIds;
    }

    // table 尚未创建，或 adapter 仍在同步新 data 引用时使用准确的顶层兜底。
    const pendingIds = new Set<string>();
    for (const key of keys) pendingIds.add(encodeRowKey(key));
    const existingIds = new Set<string>();
    for (let index = 0; index < records.length && pendingIds.size > 0; index++) {
      const record = records[index];
      if (!record) continue;
      const id = encodeRowKey(resolveRowKey(record, index, currentRowKey));
      if (!pendingIds.delete(id)) continue;
      existingIds.add(id);
    }
    return existingIds;
  });
  const selectedRowKeys = computed(() => {
    if (intentMode.value) {
      const intent = selectionIntent.value;
      return intent.mode === 'include' ? intent.includedRowKeys : [];
    }
    const keys = rawKeys.value;
    const existingIds = existingSelectedRowIds.value;
    const existingKeys =
      existingIds === undefined ? keys : keys.filter((key) => existingIds.has(encodeRowKey(key)));
    // Radio 模式始终只允许一个键；即使受控输入或默认值误传多个，也不渲染多个选中态。
    return rowSelection.value?.type === 'radio' && existingKeys.length > 1
      ? existingKeys.slice(0, 1)
      : existingKeys;
  });
  watch(
    selectedRowKeys,
    (keys) => {
      if (!isControlled.value) {
        validatedInternalDataSource = dataSource.value;
        validatedInternalRowKey = rowKeyConfig?.value;
        if (keys.length !== internalKeys.value.length) internalKeys.value = [...keys];
      }
    },
    { flush: 'sync' }
  );

  /** 将公开的 number|string key 映射为 TanStack 使用的字符串 row id。 */
  // keys 引用变化但内容未变时（如 dataSource 刷新导致重算），复用旧 state 对象，
  // 避免 TanStack 把引用变化当作状态更新而重建行模型。
  let cachedStateIds: string[] | undefined;
  let cachedStateObject: RowSelectionState | undefined;
  let cachedIntent: STableSelectionIntent | undefined;
  let cachedIntentState: RowSelectionState | undefined;
  const rowSelectionState = computed<RowSelectionState>(() => {
    if (intentMode.value) {
      const intent = selectionIntent.value;
      if (cachedIntentState && sameSelectionIntent(cachedIntent, intent)) {
        return cachedIntentState;
      }
      cachedIntent = cloneSelectionIntent(intent);
      if (intent.mode === 'include') {
        const state: RowSelectionState = Object.create(null) as RowSelectionState;
        for (const key of intent.includedRowKeys) state[encodeRowKey(key)] = true;
        cachedIntentState = state;
        return state;
      }
      const excludedIds = new Set(intent.excludedRowKeys.map((key) => encodeRowKey(key)));
      const target = Object.create(null) as RowSelectionState;
      target[INTENT_ALL_TOKEN] = true;
      cachedIntentState = new Proxy(target, {
        get(object, property, receiver) {
          if (typeof property === 'string' && property !== INTENT_ALL_TOKEN) {
            return !excludedIds.has(property);
          }
          return Reflect.get(object, property, receiver);
        },
      });
      return cachedIntentState;
    }
    const keys = selectedRowKeys.value;
    const ids: string[] = [];
    let cacheMatches = cachedStateIds?.length === keys.length;
    for (let index = 0; index < keys.length; index++) {
      const id = encodeRowKey(keys[index]!);
      ids.push(id);
      if (cacheMatches && id !== cachedStateIds![index]) cacheMatches = false;
    }
    if (cacheMatches && cachedStateObject) return cachedStateObject;

    const state: RowSelectionState = Object.create(null) as RowSelectionState;
    for (const id of ids) state[id] = true;
    cachedStateIds = ids;
    cachedStateObject = state;
    return state;
  });

  /** 将 TanStack 行模型转换为组件公开的行键。 */
  const getPublicKey = (row: Row<TableFeatures, TData>): STableRowKey => decodeRowKey(row.id);

  const immediateSelectedRowsSnapshot = shallowRef<
    { source: readonly TData[]; ids: string[]; rows: TData[] } | undefined
  >();

  // 受控 state 通过 Vue watch 同步到 table atom。TanStack 的 selected row model
  // 已按 core row model 记忆化，并正确处理树形子行；这里只做公开数据类型的投影，
  // 不再维护一份基于 rowsById 的重复缓存和排序扫描。
  const selectedRows = computed(() => {
    if (intentMode.value) {
      const rows = getTable()?.getCoreRowModel().flatRows ?? [];
      return rows
        .filter((row) => isIntentRowSelected(getPublicKey(row), row))
        .map((row) => row.original);
    }
    const snapshot = immediateSelectedRowsSnapshot.value;
    if (snapshot?.source === dataSource.value) {
      const keys = selectedRowKeys.value;
      let matches = snapshot.ids.length === keys.length;
      for (let index = 0; matches && index < keys.length; index++) {
        matches = snapshot.ids[index] === encodeRowKey(keys[index]!);
      }
      if (matches) return snapshot.rows;
    }

    const table = getTable();
    const selectedModel = table?.getSelectedRowModel();
    if (selectedModel) return selectedModel.flatRows.map((row) => row.original);

    // hook 初始化早于 table，保留一个只在此窗口使用的兜底路径。
    return resolveRowStateEntries(
      rowSelectionState.value,
      getTable()?.getCoreRowModel(),
      false
    ).flatMap((entry) => (entry.row ? [entry.row.original] : []));
  });

  let pendingType: STableSelectionChangeInfo['type'] = 'single';

  /** 提交选择状态，并同步键、行数据及变更类型事件。 */
  const commitSelection = (
    nextState: RowSelectionState,
    type: STableSelectionChangeInfo['type']
  ) => {
    // 公开回调沿用数据源顺序；缺失行 key 仅在 preserveSelectedRowKeys 下保留。
    const entries = resolveRowStateEntries(
      nextState,
      getTable()?.getCoreRowModel(),
      rowSelection.value?.preserveSelectedRowKeys === true
    );
    const nextKeys: STableRowKey[] = [];
    const nextRows: TData[] = [];
    for (const entry of entries) {
      nextKeys.push(entry.key);
      if (entry.row) nextRows.push(entry.row.original);
    }

    // TanStack 的受控 atom 会在回调返回后才收到新的 state；缓存本次 updater 的
    // 公开行快照，保证非受控实例方法和同一事件内的业务回调不会读到旧模型。
    const snapshot = {
      source: dataSource.value,
      ids: nextKeys.map((key) => encodeRowKey(key)),
      rows: nextRows,
    };
    immediateSelectedRowsSnapshot.value = snapshot;
    queueMicrotask(() => {
      if (immediateSelectedRowsSnapshot.value === snapshot) {
        immediateSelectedRowsSnapshot.value = undefined;
      }
    });

    if (!isControlled.value) {
      // nextKeys 来自当前 core row model（缺失项仅在 preserve 模式保留），无需再次扫描 dataSource。
      validatedInternalDataSource = dataSource.value;
      validatedInternalRowKey = rowKeyConfig?.value;
      internalKeys.value = nextKeys;
    }
    onUpdateSelectedRowKeys([...nextKeys]);
    onSelectChange([...nextKeys], nextRows, { type });
  };

  /** 接收 TanStack updater，并提交解析后的选择状态。 */
  const onRowSelectionChange = (updater: Updater<RowSelectionState>) => {
    if (intentMode.value) return;
    const current = rowSelectionState.value;
    const next = typeof updater === 'function' ? updater(current) : updater;
    commitSelection(next, pendingType);
  };

  /** 在记录选择操作类型的同时执行 TanStack 选择命令。 */
  const runSelectionCommand = (
    type: STableSelectionChangeInfo['type'],
    command: (table: STableInstance<TData>) => void
  ) => {
    const table = getTable();
    if (!table || !rowSelection.value) return;
    pendingType = type;
    try {
      command(table);
    } finally {
      pendingType = 'single';
    }
  };

  /** 按公开行键查找 TanStack 核心行模型。 */
  const getRow = (key: STableRowKey) => getTable()?.getCoreRowModel().rowsById[encodeRowKey(key)];

  /** 切换指定行的选中状态。 */
  const toggleRow = (key: STableRowKey) => {
    const row = getRow(key);
    if (!row?.getCanSelect()) return;
    if (intentMode.value) {
      updateIntentRows([key], !isIntentRowSelected(key, row), 'single');
      return;
    }
    runSelectionCommand('single', () => row.toggleSelected());
  };

  /** 选中指定行。 */
  const selectRow = (key: STableRowKey) => {
    const row = getRow(key);
    if (!row?.getCanSelect()) return;
    if (intentMode.value) {
      if (!isIntentRowSelected(key, row)) updateIntentRows([key], true, 'single');
      return;
    }
    if (row.getIsSelected()) return;
    runSelectionCommand('single', () => row.toggleSelected(true));
  };

  /** 取消选中指定行。 */
  const deselectRow = (key: STableRowKey) => {
    const row = getRow(key);
    if (!row) return;
    if (intentMode.value) {
      if (isIntentRowSelected(key, row)) updateIntentRows([key], false, 'single');
      return;
    }
    if (!row.getIsSelected()) return;
    runSelectionCommand('single', () => row.toggleSelected(false));
  };

  /** 选中全部可选行。 */
  const selectAll = () => {
    if (intentMode.value) {
      commitIntent({ mode: 'all', excludedRowKeys: [] }, 'all');
      return;
    }
    runSelectionCommand('all', (table) => table.toggleAllRowsSelected(true));
  };

  /** 清空全部选择，包括需要保留的缺失行键。 */
  const clearSelection = () => {
    if (intentMode.value) {
      commitIntent(cloneSelectionIntent(EMPTY_SELECTION_INTENT), 'none');
      return;
    }
    runSelectionCommand('none', (table) =>
      table.toggleAllRowsSelected(false, { deselectAll: true })
    );
  };

  /** 按当前排序、过滤后的行序选择指定奇偶位置。 */
  const selectByParity = (parity: 0 | 1) => {
    if (intentMode.value) {
      const rows = getTable()?.getSortedRowModel().rows ?? [];
      const keys: STableRowKey[] = [];
      for (let index = parity; index < rows.length; index += 2) {
        const row = rows[index];
        if (row?.getCanSelect()) keys.push(getPublicKey(row));
      }
      commitIntent({ mode: 'include', includedRowKeys: keys }, 'multiple');
      return;
    }
    runSelectionCommand('multiple', (table) => {
      const next: RowSelectionState = Object.create(null) as RowSelectionState;
      // 用 sortedRowModel：奇偶行按「用户可见的排序 / 过滤后顺序」判定，
      // 而非原始数据顺序，符合“选中第 1、3、5… 行”的直觉。
      const rows = table.getSortedRowModel().rows;
      for (let index = parity; index < rows.length; index += 2) {
        const row = rows[index];
        if (row?.getCanSelect()) next[row.id] = true;
      }
      table.setRowSelection(next);
    });
  };

  /** 选中当前可见顺序中的奇数行。 */
  const selectOddRows = () => selectByParity(0);
  /** 选中当前可见顺序中的偶数行。 */
  const selectEvenRows = () => selectByParity(1);
  /** 选中当前分页内的全部可选行。 */
  const selectCurrentPage = () => {
    if (intentMode.value) {
      const table = getTable();
      const rows = paginationEnabled.value
        ? (table?.getPaginatedRowModel().rows ?? [])
        : (table?.getRowModel().rows ?? []);
      updateIntentRows(
        rows.filter((row) => row.getCanSelect()).map(getPublicKey),
        true,
        'multiple'
      );
      return;
    }
    runSelectionCommand('multiple', (table) => {
      if (paginationEnabled.value) table.toggleAllPageRowsSelected(true);
      else table.toggleAllRowsSelected(true);
    });
  };

  const selectionColumn = computed<ColumnDef<TableFeatures, TData, unknown> | undefined>(() => {
    const config = rowSelection.value;
    if (!config) return undefined;
    const getCheckboxProps = config.getCheckboxProps;
    const customSelectionMap = new Map<string, NonNullable<typeof config.selections>[number]>();
    for (const option of config.selections ?? []) customSelectionMap.set(option.key, option);
    return createSelectionColumn<TData>({
      config,
      getHeaderProps: () => {
        const table = getTable();
        const titleProps = config.getTitleCheckboxProps?.() ?? {};
        const currentIntent = selectionIntent.value;
        const allChecked = intentMode.value
          ? currentIntent.mode === 'all' && currentIntent.excludedRowKeys.length === 0
          : (table?.getIsAllRowsSelected() ?? false);
        const checked = titleProps.checked ?? allChecked;
        const someSelected = intentMode.value
          ? currentIntent.mode === 'all' || currentIntent.includedRowKeys.length > 0
          : (table?.getIsSomeRowsSelected() ?? false);
        return {
          ...titleProps,
          checked,
          indeterminate: titleProps.indeterminate ?? (!checked && someSelected && !allChecked),
        };
      },
      getRowPresentation: (row) => {
        const key = getPublicKey(row);
        const checkboxProps = resolveCheckboxProps(row, getCheckboxProps);
        return {
          key,
          checkboxProps,
          selected: intentMode.value
            ? isIntentRowSelected(key, row, checkboxProps.disabled !== true)
            : row.getIsSelected(),
          row,
        };
      },
      onSelectAll: selectAll,
      onClearAll: clearSelection,
      onSelectOdd: selectOddRows,
      onSelectEven: selectEvenRows,
      onSelectCurrentPage: selectCurrentPage,
      onCustomSelect: (key) => {
        customSelectionMap
          .get(key)
          ?.onSelect?.([...selectedRowKeys.value], [...selectedRows.value]);
      },
      onRadioChange: toggleRow,
      onCheckboxChange: ({ key, row }, checked, event) => {
        const type = event.shiftKey ? 'multiple' : 'single';
        if (intentMode.value) {
          updateIntentRows([key], checked, type);
          return;
        }
        runSelectionCommand(type, () => {
          row.getToggleSelectedHandler()({
            target: { checked },
            shiftKey: event.shiftKey,
            nativeEvent: event,
          });
        });
      },
    });
  });

  return {
    selectedRowKeys,
    selectedRows,
    selectionIntent,
    rowSelectionState,
    onRowSelectionChange,
    selectionColumn,
    selectRow,
    deselectRow,
    toggleRow,
    selectAll,
    clearSelection,
    setSelectionIntent,
    isRowSelected,
  };
};
