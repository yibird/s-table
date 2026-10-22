import { computed, type Ref } from 'vue';
import { useVirtualizer } from '@tanstack/vue-virtual';
import type { RowData, Table, TableFeatures } from '@tanstack/vue-table';
import type { STableRenderedColumn, STableVirtualProps } from '../types';
import { isColumnVirtualEnabled, type STableVirtualValue } from '../utils';

export type { STableRenderedColumn } from '../types';

type VisibleColumn = { id: string; size: number; hasExplicitWidth: boolean };

type UseSTableColumnVirtualOptions<TData extends RowData> = {
  table: Table<TableFeatures, TData>;
  virtual: Readonly<Ref<STableVirtualValue>>;
  /** 列模型阶段已按 ID 建立的尺寸快照，避免横向虚拟化再次遍历完整列数组。 */
  visibleColumnById: Readonly<Ref<ReadonlyMap<string, VisibleColumn>>>;
  scrollElementRef: Readonly<Ref<HTMLElement | null>>;
};

const resolveConfig = (value: STableVirtualValue): STableVirtualProps | null =>
  isColumnVirtualEnabled(value) && typeof value === 'object' ? (value as STableVirtualProps) : null;

type VirtualColumnItem = { index: number; start: number; end: number };

/** 仅按虚拟窗口读取中心列，避免横向滚动时重新扫描完整列集。 */
export const buildRenderedColumnWindow = (
  centerColumns: readonly VisibleColumn[],
  virtualItems: readonly VirtualColumnItem[],
  fallbackCount: number,
  startColumns: readonly { id: string }[],
  endColumns: readonly { id: string }[],
  paddingStart: number,
  paddingEnd: number,
  totalSize: number
): STableRenderedColumn[] => {
  const result: STableRenderedColumn[] = [];
  for (const column of startColumns) result.push({ type: 'column', id: column.id });

  let firstItem: VirtualColumnItem | undefined;
  let lastItem: VirtualColumnItem | undefined;
  for (const item of virtualItems) {
    if (!centerColumns[item.index]) continue;
    firstItem ??= item;
    lastItem = item;
  }

  const firstIndex = firstItem?.index ?? 0;
  if (firstIndex > 0) {
    result.push({
      type: 'spacer',
      id: '__s_table_column_virtual_before__',
      colSpan: firstIndex,
      width: Math.max(0, firstItem!.start - paddingStart),
    });
  }

  let lastIndex = -1;
  let lastEnd = paddingStart;
  if (firstItem) {
    for (const item of virtualItems) {
      const column = centerColumns[item.index];
      if (!column) continue;
      result.push({ type: 'column', id: column.id });
    }
    lastIndex = lastItem!.index;
    lastEnd = lastItem!.end;
  } else {
    const count = Math.min(centerColumns.length, fallbackCount);
    for (let index = 0; index < count; index++) {
      const column = centerColumns[index]!;
      result.push({ type: 'column', id: column.id });
      lastEnd += column.size;
    }
    lastIndex = count - 1;
  }

  const afterCount = centerColumns.length - lastIndex - 1;
  if (afterCount > 0) {
    result.push({
      type: 'spacer',
      id: '__s_table_column_virtual_after__',
      colSpan: afterCount,
      width: Math.max(0, totalSize - paddingEnd - lastEnd),
    });
  }
  for (const column of endColumns) result.push({ type: 'column', id: column.id });
  return result;
};

/** 仅虚拟化未固定的中心列，左右 sticky 列始终进入渲染窗口。 */
export const useColumnVirtual = <TData extends RowData>({
  table,
  virtual,
  visibleColumnById,
  scrollElementRef,
}: UseSTableColumnVirtualOptions<TData>) => {
  const config = computed(() => resolveConfig(virtual.value));
  const enabled = computed(() => config.value !== null);
  const overscan = computed(() => {
    const buffer = config.value?.buffer;
    const value =
      typeof buffer === 'number' ? buffer : (buffer?.x ?? config.value?.columnOverscan ?? 3);
    return Math.max(0, Math.min(20, Math.trunc(value)));
  });
  const centerColumns = computed<VisibleColumn[]>((previous) => {
    // 直接读取 TanStack 的中心区域，固定列、隐藏列和列顺序已由内置 pinning/
    // visibility/ordering feature 统一处理；组件只补充渲染层需要的尺寸标记。
    const tanStackColumns = table.getCenterVisibleLeafColumns();
    const columnById = visibleColumnById.value;

    // 列宽或列模型被其他响应式状态带动重新求值时，只有真实的 ID/尺寸变化才替换数组。
    // 这样不会让虚拟器在无关状态更新时重建测量窗口，同时不会复用过期宽度。
    if (previous?.length === tanStackColumns.length) {
      let unchanged = true;
      for (let index = 0; index < tanStackColumns.length; index++) {
        const tanStackColumn = tanStackColumns[index]!;
        const metadata = columnById.get(tanStackColumn.id);
        const size = metadata?.size ?? tanStackColumn.getSize();
        const hasExplicitWidth = metadata?.hasExplicitWidth ?? false;
        const previousColumn = previous[index]!;
        if (
          previousColumn.id !== tanStackColumn.id ||
          previousColumn.size !== size ||
          previousColumn.hasExplicitWidth !== hasExplicitWidth
        ) {
          unchanged = false;
          break;
        }
      }
      if (unchanged) return previous;
    }

    const next: VisibleColumn[] = [];
    for (const tanStackColumn of tanStackColumns) {
      const metadata = columnById.get(tanStackColumn.id);
      next.push(
        metadata ?? {
          id: tanStackColumn.id,
          size: tanStackColumn.getSize(),
          hasExplicitWidth: false,
        }
      );
    }
    return next;
  });
  const estimateSize = (index: number) =>
    centerColumns.value[index]?.size ?? config.value?.columnEstimateSize ?? 150;
  const getScrollElement = () => (enabled.value ? scrollElementRef.value : null);
  const getItemKey = (index: number) => centerColumns.value[index]?.id ?? index;
  const options = computed(() => {
    const isEnabled = enabled.value;
    // 固定列仍占据真实滚动宽度；复用 TanStack 尺寸模型统一两套坐标系。
    const paddingStart = isEnabled ? table.getStartTotalSize() : 0;
    const paddingEnd = isEnabled ? table.getEndTotalSize() : 0;
    return {
      enabled: isEnabled,
      horizontal: true,
      count: isEnabled ? centerColumns.value.length : 0,
      getScrollElement,
      getItemKey,
      estimateSize,
      overscan: overscan.value,
      // 横向虚拟器同样使用 TanStack Virtual 的官方观察器合帧，避免列测量在
      // ResizeObserver 回调内同步触发布局重算，双向虚拟化保持同一调度策略。
      useAnimationFrameWithResizeObserver: true,
      paddingStart,
      paddingEnd,
      scrollPaddingStart: paddingStart,
      scrollPaddingEnd: paddingEnd,
    };
  });
  const virtualizer = useVirtualizer(options);

  const renderedColumns = computed<STableRenderedColumn[]>(() => {
    // 空数组表示直接使用 TanStack 原生 header/cell 顺序，普通表格不进入虚拟列重组路径。
    if (!enabled.value) return [];
    const virtualItems = virtualizer.value.getVirtualItems();
    const paddingStart = table.getStartTotalSize();
    const paddingEnd = table.getEndTotalSize();
    return buildRenderedColumnWindow(
      centerColumns.value,
      virtualItems,
      Math.max(1, overscan.value),
      table.getStartVisibleLeafColumns(),
      table.getEndVisibleLeafColumns(),
      paddingStart,
      paddingEnd,
      virtualizer.value.getTotalSize()
    );
  });

  const scrollToColumn = (columnId: string): boolean => {
    const column = table.getColumn(columnId);
    if (!column) return false;
    if (column.getIsPinned() && column.getIsVisible()) return true;
    // TanStack columnOrderingFeature 维护按 pinning 区域索引的记忆化映射，
    // 避免每次公开定位 API 都在线性扫描中心列集合。
    const index = table.getColumnIndexes().center[columnId];
    if (!Number.isInteger(index) || index < 0) return false;
    if (enabled.value) {
      virtualizer.value.scrollToIndex(index, { align: 'auto' });
      return true;
    }
    const element = scrollElementRef.value;
    const header = Array.from(
      element?.querySelectorAll<HTMLElement>('th[data-column-id]') ?? []
    ).find((item) => item.dataset.columnId === columnId);
    header?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return Boolean(header);
  };

  return { renderedColumns, scrollToColumn };
};
