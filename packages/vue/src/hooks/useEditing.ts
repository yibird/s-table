import { type Ref } from 'vue';
import type { Row, RowData, Table, TableFeatures } from '@tanstack/vue-table';
import type {
  STableCellEvent,
  STableColumn,
  STableEditConfig,
  STableEditPatch,
  STableEditingState,
  STableRowKey,
  STableTree,
} from '../types';
import {
  applyEditingValues,
  cloneEditingState,
  isColumnEditable,
  replaceRecordInTree,
  sameEditingState,
} from '@zchengfeng/s-table-core';
import { getRowVisibleIndex } from '../adapter/tableDisplayOrder';
import { encodeRowKey } from '../utils';
import { useModelState } from './useModelState';

type UseSTableEditingOptions<TData extends RowData> = {
  editConfig: Readonly<Ref<STableEditConfig<TData> | undefined>>;
  editing: Readonly<Ref<STableEditingState | null | undefined>>;
  defaultEditing: Readonly<Ref<STableEditingState | null | undefined>>;
  columnMap: Readonly<Ref<ReadonlyMap<string, STableColumn<TData>>>>;
  dataSource: Readonly<Ref<TData[]>>;
  tree: Readonly<Ref<STableTree<TData> | undefined>>;
  getTable: () => Table<TableFeatures, TData> | undefined;
  onUpdateEditing: (editing: STableEditingState | null) => void;
  onUpdateDataSource: (dataSource: TData[]) => void;
  onStart: (editing: STableEditingState, record: TData) => void;
  onChange: (editing: STableEditingState, record: TData) => void;
  onCommit: (editing: STableEditingState, record: TData, nextRecord: TData) => void;
  onPatch: (patch: STableEditPatch<TData>) => void;
  onCancel: (editing: STableEditingState, record: TData) => void;
  onValidateError: (
    message: string | undefined,
    editing: STableEditingState,
    record: TData
  ) => void;
};

const cloneEditing = cloneEditingState;

export const useEditing = <TData extends RowData>({
  editConfig,
  editing: controlledEditing,
  defaultEditing,
  columnMap,
  dataSource,
  tree,
  getTable,
  onUpdateEditing,
  onUpdateDataSource,
  onStart,
  onChange,
  onCommit,
  onPatch,
  onCancel,
  onValidateError,
}: UseSTableEditingOptions<TData>) => {
  let editingRevision = 0;
  let latestCommit = 0;
  let patchRevision = 0;

  const {
    state: editingState,
    internal: internalEditing,
    isControlled,
  } = useModelState<STableEditingState | null>({
    modelValue: controlledEditing,
    defaultValue: () => cloneEditing(defaultEditing.value ?? null),
    toInternalValue: (value) => cloneEditing(value),
    // 受控草稿以不可变替换为准（shallow 同步）；外部替换受控草稿时推进 revision，
    // 原地修改由提交完成前的快照比较兜底。
    onSync: () => {
      editingRevision++;
    },
  });

  const getRow = (key: STableRowKey): Row<TableFeatures, TData> | undefined =>
    getTable()?.getCoreRowModel().rowsById[encodeRowKey(key)];

  const publishEditing = (next: STableEditingState | null) => {
    editingRevision++;
    const snapshot = cloneEditing(next);
    if (!isControlled.value) internalEditing.value = snapshot;
    onUpdateEditing(cloneEditing(snapshot));
  };

  const startEdit = (
    rowKey: STableRowKey,
    columnId?: string,
    mode = editConfig.value?.mode ?? 'cell'
  ) => {
    const row = getRow(rowKey);
    if (!row) return false;
    const rowIndex = getRowVisibleIndex(row);
    if (editConfig.value?.getRowEditable?.(row.original, rowIndex) === false) return false;

    const values: Record<string, unknown> = {};
    if (mode === 'cell') {
      if (!columnId || !isColumnEditable(columnMap.value.get(columnId), row.original, rowIndex)) {
        return false;
      }
      values[columnId] = row.getValue(columnId);
    } else {
      for (const [id, column] of columnMap.value) {
        if (isColumnEditable(column, row.original, rowIndex)) values[id] = row.getValue(id);
      }
      if (Object.keys(values).length === 0) return false;
    }

    const next: STableEditingState = { mode, rowKey, columnId, values };
    publishEditing(next);
    onStart(cloneEditing(next)!, row.original);
    return true;
  };

  const startCellEdit = (rowKey: STableRowKey, columnId: string) =>
    startEdit(rowKey, columnId, 'cell');
  const startRowEdit = (rowKey: STableRowKey) => startEdit(rowKey, undefined, 'row');

  const setEditValue = (columnId: string, value: unknown) => {
    const current = editingState.value;
    if (!current || !(columnId in current.values)) return;
    const row = getRow(current.rowKey);
    if (!row) return;
    const column = columnMap.value.get(columnId);
    let nextValue = value;
    if (column?.valueParser) {
      nextValue = column.valueParser(value, row.original, getRowVisibleIndex(row));
    }
    if (Object.is(current.values[columnId], nextValue)) return;
    const next = { ...current, values: { ...current.values, [columnId]: nextValue } };
    publishEditing(next);
    onChange(cloneEditing(next)!, row.original);
  };

  const commitEdit = async (): Promise<boolean> => {
    const current = editingState.value;
    if (!current) return false;
    const row = getRow(current.rowKey);
    if (!row) return false;
    const snapshot = cloneEditing(current)!;
    const revision = editingRevision;
    const commitId = ++latestCommit;
    let validation: boolean | string | undefined;
    try {
      validation = await editConfig.value?.validate?.(
        snapshot.values,
        row.original,
        getRowVisibleIndex(row)
      );
    } catch (cause) {
      // 校验器异常与显式校验失败都属于编辑生命周期的一部分，且只为仍然有效的事务派发事件。
      if (
        commitId !== latestCommit ||
        revision !== editingRevision ||
        !sameEditingState(editingState.value, snapshot)
      ) {
        return false;
      }
      onValidateError(
        cause instanceof Error ? cause.message : String(cause),
        snapshot,
        row.original
      );
      return false;
    }
    // 异步校验返回时编辑值或目标可能已经变化；旧事务不能覆盖新草稿，也不能关闭新编辑器。
    if (
      commitId !== latestCommit ||
      revision !== editingRevision ||
      !sameEditingState(editingState.value, snapshot)
    ) {
      return false;
    }
    if (validation === false || typeof validation === 'string') {
      onValidateError(
        typeof validation === 'string' ? validation : undefined,
        snapshot,
        row.original
      );
      return false;
    }

    const nextRecord = applyEditingValues(row.original, snapshot.values, (columnId) =>
      columnMap.value.get(columnId)
    );
    if (editConfig.value?.updateMode === 'patch') {
      onPatch({
        rowKey: snapshot.rowKey,
        values: { ...snapshot.values },
        previousRecord: row.original,
        nextRecord,
        revision: ++patchRevision,
      });
    } else {
      const replaced = replaceRecordInTree(dataSource.value, row.original, nextRecord, tree.value);
      if (!replaced.found) return false;
      onUpdateDataSource(replaced.data);
    }
    onCommit(snapshot, row.original, nextRecord);
    publishEditing(null);
    return true;
  };

  const cancelEdit = () => {
    const current = editingState.value;
    if (!current) return;
    const row = getRow(current.rowKey);
    if (row) onCancel(cloneEditing(current)!, row.original);
    publishEditing(null);
  };

  const handleEditTrigger = (
    payload: STableCellEvent<TData, MouseEvent>,
    trigger: 'click' | 'dblclick'
  ) => {
    const columnTrigger = columnMap.value.get(payload.columnId)?.editableTrigger;
    if ((columnTrigger ?? editConfig.value?.trigger ?? 'dblclick') !== trigger) return;
    startEdit(payload.rowKey, payload.columnId);
  };

  return {
    editingState,
    startCellEdit,
    startRowEdit,
    setEditValue,
    commitEdit,
    cancelEdit,
    handleEditTrigger,
  };
};
