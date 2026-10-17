import { computed, watch, type Ref } from 'vue';
import type {
  Row,
  RowData,
  RowPinningState,
  Table,
  TableFeatures,
  Updater,
} from '@tanstack/vue-table';
import { decodeRowKey, encodeRowKey, sameValues } from '../../utils';
import { useModelState } from '../../hooks/useModelState';
import type { STablePinnedRowKeys, STableRowKey } from '../../types';

type STableTanStackTable<TData extends RowData> = Table<TableFeatures, TData>;

type UseSTableRowPinningOptions<TData extends RowData> = {
  /** 受控固定行（`v-model:pinnedRowKeys`）。 */
  pinnedRowKeys: Readonly<Ref<STablePinnedRowKeys | undefined>>;
  /** 非受控初始固定行。 */
  defaultPinnedRowKeys: Readonly<Ref<STablePinnedRowKeys | undefined>>;
  /** 数据变化后清理非受控状态中已不存在的行。 */
  dataSource: Readonly<Ref<readonly TData[]>>;
  getTable: () => STableTanStackTable<TData> | undefined;
  onUpdatePinnedRowKeys: (keys: Required<STablePinnedRowKeys>) => void;
  onPinnedRowsChange: (keys: Required<STablePinnedRowKeys>) => void;
};

const normalizePinningState = (
  state: RowPinningState,
  rowsById?: Readonly<Record<string, unknown>>
): RowPinningState => {
  const seen = new Set<string>();
  const normalize = (ids: readonly string[]) => {
    const result: string[] = [];
    for (const id of ids) {
      if (seen.has(id) || (rowsById && !rowsById[id])) continue;
      seen.add(id);
      result.push(id);
    }
    return result;
  };
  // 同一行冲突时 top 优先，确保一条记录最多渲染一次。
  return { top: normalize(state.top), bottom: normalize(state.bottom) };
};

const toPinningState = (keys: STablePinnedRowKeys | undefined): RowPinningState =>
  normalizePinningState({
    top: (keys?.top ?? []).map((key) => encodeRowKey(key)),
    bottom: (keys?.bottom ?? []).map((key) => encodeRowKey(key)),
  });

const toPublicKeys = (state: RowPinningState): Required<STablePinnedRowKeys> => ({
  top: state.top.map((id) => decodeRowKey(id)),
  bottom: state.bottom.map((id) => decodeRowKey(id)),
});

/**
 * 行固定（row pinning）feature。
 *
 * 固定行的成员关系、`keepPinnedRows` 语义与三区域行来源（top/center/bottom）
 * 全部由 TanStack `rowPinningFeature` 托管；本模块只做公开 rowKey 与内部
 * row id 的双向映射，以及受控 / 非受控状态桥接。
 */
export const useRowPinning = <TData extends RowData>({
  pinnedRowKeys: controlledKeys,
  defaultPinnedRowKeys,
  dataSource,
  getTable,
  onUpdatePinnedRowKeys,
  onPinnedRowsChange,
}: UseSTableRowPinningOptions<TData>) => {
  // 先在公开 key 边界完成编码，让 useModelState 的 model 与内部状态保持同一类型；
  // 避免 Hook 通过泛型强转掩盖 STablePinnedRowKeys 与 RowPinningState 的结构差异。
  const controlledState = computed<RowPinningState | undefined>(() => {
    const keys = controlledKeys.value;
    return keys === undefined ? undefined : toPinningState(keys);
  });
  const {
    state: rawState,
    internal: internalState,
    isControlled,
  } = useModelState<RowPinningState>({
    modelValue: controlledState,
    defaultValue: () => toPinningState(defaultPinnedRowKeys.value),
  });

  // 内容比较后保留旧引用，避免受控对象每次渲染重建导致 TanStack 误判状态变化。
  let cachedState: RowPinningState = { top: [], bottom: [] };
  const rowPinningState = computed<RowPinningState>(() => {
    const next = rawState.value;
    if (sameValues(next.top, cachedState.top) && sameValues(next.bottom, cachedState.bottom)) {
      return cachedState;
    }
    cachedState = next;
    return next;
  });

  watch(
    [dataSource, () => getTable()],
    () => {
      if (
        isControlled.value ||
        internalState.value.top.length + internalState.value.bottom.length === 0
      ) {
        return;
      }
      const rowsById = getTable()?.getCoreRowModel().rowsById;
      if (!rowsById) return;
      const next = normalizePinningState(internalState.value, rowsById);
      if (
        !sameValues(next.top, internalState.value.top) ||
        !sameValues(next.bottom, internalState.value.bottom)
      ) {
        internalState.value = next;
      }
    },
    { flush: 'post' }
  );

  const pinningActive = computed(
    () => rowPinningState.value.top.length > 0 || rowPinningState.value.bottom.length > 0
  );

  const commitPinning = (next: RowPinningState) => {
    const normalized = normalizePinningState(next);
    if (!isControlled.value) internalState.value = normalized;
    const publicKeys = toPublicKeys(normalized);
    onUpdatePinnedRowKeys(publicKeys);
    onPinnedRowsChange(publicKeys);
  };

  const onRowPinningChange = (updater: Updater<RowPinningState>) => {
    const next = typeof updater === 'function' ? updater(rowPinningState.value) : updater;
    commitPinning(next);
  };

  /** 固定 / 取消固定指定行；`false` 表示取消固定。 */
  const pinRow = (key: STableRowKey, position: 'top' | 'bottom' | false): boolean => {
    const table = getTable();
    const row = table?.getCoreRowModel().rowsById[encodeRowKey(key)];
    if (!row) return false;
    (row as Row<TableFeatures, TData> & { pin: (p: 'top' | 'bottom' | false) => void }).pin(
      position
    );
    return true;
  };

  const getPinnedRowKeys = (): Required<STablePinnedRowKeys> => toPublicKeys(rowPinningState.value);

  return {
    rowPinningState,
    pinningActive,
    onRowPinningChange,
    pinRow,
    getPinnedRowKeys,
  };
};
