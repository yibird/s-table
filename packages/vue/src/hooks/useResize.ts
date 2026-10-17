import { computed, shallowRef, watch, type Ref } from 'vue';
import type { RowData } from '@tanstack/vue-table';
import type { STableColumn, STableColumnResizeEvent } from '../types';

type UseSTableResizeOptions<TData extends RowData, TValue> = {
  /** 列宽拖拽开始回调。 */
  onResizeStart: (payload: STableColumnResizeEvent<TData>) => void;
  /** 列宽拖拽结束回调。 */
  onResizeEnd: (payload: STableColumnResizeEvent<TData>) => void;
  /** 当前 hook 依赖的最小 table 能力集合。 */
  table: {
    getColumn: (
      columnId: string
    ) => { getSize(): number; columnDef: { minSize?: number; maxSize?: number } } | undefined;
  };
  /** 当前列宽拖拽状态。 */
  columnResizingState: Readonly<
    Ref<{
      isResizingColumn: false | string;
      startSize: null | number;
      deltaOffset: null | number;
    } | null>
  >;
  /** 根据列 id 获取原始列配置的方法。 */
  getColumnById: (columnId: string) => STableColumn<TData, TValue> | undefined;
};

/** 将 TanStack resize atom 的状态边界转换为一次 start/end 事件。 */
export const useResize = <TData extends RowData, TValue = unknown>({
  onResizeStart,
  onResizeEnd,
  table,
  columnResizingState,
  getColumnById,
}: UseSTableResizeOptions<TData, TValue>) => {
  const getResizePayload = (columnId: string): STableColumnResizeEvent<TData> => {
    const column = getColumnById(columnId) as STableColumn<TData> | undefined;
    const currentColumn = table.getColumn(columnId);
    return {
      columnId,
      width: currentColumn?.getSize() ?? column?.width ?? column?.minWidth ?? 0,
      minWidth: column?.minWidth ?? currentColumn?.columnDef.minSize,
      maxWidth: column?.maxWidth ?? currentColumn?.columnDef.maxSize,
      column,
    };
  };

  const isColumnResizing = computed(() => Boolean(columnResizingState.value?.isResizingColumn));

  const previousResizingColumnId = shallowRef<string | null>(null);

  watch(
    () => columnResizingState.value?.isResizingColumn ?? false,
    (currentColumnId) => {
      const nextColumnId = typeof currentColumnId === 'string' ? currentColumnId : null;
      if (previousResizingColumnId.value && previousResizingColumnId.value !== nextColumnId) {
        onResizeEnd(getResizePayload(previousResizingColumnId.value));
      }
      if (nextColumnId && previousResizingColumnId.value !== nextColumnId) {
        onResizeStart(getResizePayload(nextColumnId));
      }
      previousResizingColumnId.value = nextColumnId;
    }
  );

  return {
    isColumnResizing,
  };
};
