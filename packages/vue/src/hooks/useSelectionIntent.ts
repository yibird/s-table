import { computed, type Ref } from 'vue';
import type { RowData, Table, TableFeatures } from '@tanstack/vue-table';
import type {
  STableRowKey,
  STableRowSelection,
  STableSelectionChangeInfo,
  STableSelectionIntent,
} from '../types';
import {
  cloneSelectionIntent,
  EMPTY_SELECTION_INTENT,
  normalizeSelectionIntent,
  updateSelectionIntentRows,
} from '@zchengfeng/s-table-core';
import { encodeRowKey } from '../utils';
import { useModelState } from './useModelState';

export {
  cloneSelectionIntent,
  EMPTY_SELECTION_INTENT,
  sameSelectionIntent,
} from '@zchengfeng/s-table-core';

export const INTENT_ALL_TOKEN = '__s_table_selection_intent_all__';

type UseSelectionIntentOptions<TData extends RowData> = {
  rowSelection: Readonly<Ref<STableRowSelection<TData> | undefined>>;
  controlledSelectionIntent: Readonly<Ref<STableSelectionIntent | undefined>>;
  defaultSelectionIntent: Readonly<Ref<STableSelectionIntent | undefined>>;
  getTable: () => Table<TableFeatures, TData> | undefined;
  onUpdateSelectionIntent: (intent: STableSelectionIntent) => void;
  onSelectionIntentChange: (intent: STableSelectionIntent, info: STableSelectionChangeInfo) => void;
};

/**
 * 「选择意图」子模块：`rowSelection.strategy = 'intent'` 时以
 * all 全选 + excludedRowKeys / include 白名单 表达跨页选择，
 * 避免为全量行物化 RowSelectionState。
 */
export const useSelectionIntent = <TData extends RowData>({
  rowSelection,
  controlledSelectionIntent,
  defaultSelectionIntent,
  getTable,
  onUpdateSelectionIntent,
  onSelectionIntentChange,
}: UseSelectionIntentOptions<TData>) => {
  const {
    state: rawSelectionIntent,
    internal: internalSelectionIntent,
    isControlled: isIntentControlled,
  } = useModelState<STableSelectionIntent>({
    modelValue: controlledSelectionIntent,
    defaultValue: () =>
      cloneSelectionIntent(defaultSelectionIntent.value ?? EMPTY_SELECTION_INTENT),
    toInternalValue: cloneSelectionIntent,
  });
  const intentMode = computed(
    () =>
      rowSelection.value?.strategy === 'intent' ||
      controlledSelectionIntent.value !== undefined ||
      defaultSelectionIntent.value !== undefined
  );
  const selectionIntent = computed<STableSelectionIntent>(() =>
    cloneSelectionIntent(rawSelectionIntent.value)
  );
  const intentIds = computed(() => {
    const intent = selectionIntent.value;
    return new Set(
      (intent.mode === 'all' ? intent.excludedRowKeys : intent.includedRowKeys).map((key) =>
        encodeRowKey(key)
      )
    );
  });
  const isIntentRowSelected = (
    key: STableRowKey,
    row = getTable()?.getCoreRowModel().rowsById[encodeRowKey(key)],
    canSelect = row?.getCanSelect() ?? true
  ) => {
    if (!canSelect) return false;
    const intent = selectionIntent.value;
    const present = intentIds.value.has(encodeRowKey(key));
    return intent.mode === 'all' ? !present : present;
  };

  const normalizeIntent = (intent: STableSelectionIntent): STableSelectionIntent => {
    return normalizeSelectionIntent(intent, rowSelection.value?.type);
  };

  const commitIntent = (
    nextIntent: STableSelectionIntent,
    type: STableSelectionChangeInfo['type']
  ) => {
    const next = normalizeIntent(nextIntent);
    if (!isIntentControlled.value) internalSelectionIntent.value = cloneSelectionIntent(next);
    onUpdateSelectionIntent(cloneSelectionIntent(next));
    onSelectionIntentChange(cloneSelectionIntent(next), { type });
  };

  const setSelectionIntent = (intent: STableSelectionIntent) => {
    if (!intentMode.value) {
      if (import.meta.env?.DEV) {
        console.warn('[STable] `setSelectionIntent` 需要 `rowSelection.strategy = "intent"`。');
      }
      return;
    }
    commitIntent(intent, intent.mode === 'all' ? 'all' : 'multiple');
  };

  const updateIntentRows = (
    keys: readonly STableRowKey[],
    selected: boolean,
    type: STableSelectionChangeInfo['type']
  ) => {
    const current = selectionIntent.value;
    commitIntent(
      updateSelectionIntentRows(current, keys, selected, rowSelection.value?.type),
      type
    );
  };

  return {
    intentMode,
    selectionIntent,
    intentIds,
    isIntentRowSelected,
    setSelectionIntent,
    updateIntentRows,
    commitIntent,
  };
};
