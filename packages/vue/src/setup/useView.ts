import { computed, toRef } from 'vue';
import type { RowData } from '@tanstack/vue-table';
import type { ShallowRef } from 'vue';
import { isRowVirtualEnabled } from '../utils';
import { useColumnVirtual, useScroll, useVirtual } from '../hooks';
import type { BodyEditingApi, BodyVirtualApi } from '../types';
import type { useCellRangeBridge } from './useCellRangeBridge';
import type { useDataState } from './useDataState';
import type { useTableModel } from './useTableModel';
import type { STableSetupContext } from './types';

/**
 * 视图运行时：滚动容器、横纵向虚拟化、Body 能力对象、触底检测与固定列阴影。
 *
 * 滚动容器 ref 由组件顶层持有（模板字符串 ref 需要顶层绑定），这里通过 options 注入。
 */
export const useView = <TData extends RowData>(
  context: STableSetupContext<TData>,
  dataState: ReturnType<typeof useDataState<TData>>,
  tableModel: ReturnType<typeof useTableModel<TData>>,
  cellRange: ReturnType<typeof useCellRangeBridge<TData>>,
  options: {
    scrollContainerRef: Readonly<ShallowRef<HTMLElement | null>>;
    scrollBottomSentinelRef: Readonly<ShallowRef<HTMLElement | null>>;
  }
) => {
  const { props, slots, emit, virtual } = context;
  const { editingState, setEditValue, commitEdit, cancelEdit, expandedRowKeys } = dataState;
  const { table, centerRows, fixedColumnStyles, visibleLeafColumnById } = tableModel;
  const { isCellRangeDragging, handleCellMouseEnter } = cellRange;
  const { scrollContainerRef, scrollBottomSentinelRef } = options;

  const hasFixedColumns = computed(() => fixedColumnStyles.value.size > 0);

  // 阴影 overlay 位置和可见性由 useScroll 的固定列阴影段驱动。

  /** Tab 进入滚动区域后把焦点交给首个数据单元格，后续方向键由 Body 统一委托处理。 */
  const focusFirstBodyCell = () => {
    scrollContainerRef.value
      ?.querySelector<HTMLElement>('tbody td.s-table-cell[data-column-id][tabindex]')
      ?.focus();
  };

  const { renderedColumns, scrollToColumn } = useColumnVirtual({
    table,
    virtual,
    visibleColumnById: visibleLeafColumnById,
    scrollElementRef: scrollContainerRef,
  });

  const {
    virtualEnabled,
    virtualItems,
    topSpacerHeight,
    bottomSpacerHeight,
    measureElement,
    measureExpandedElement,
    scrollToIndex,
    scrollToTop,
    scrollToEnd,
  } = useVirtual<TData>({
    virtual,
    rows: centerRows,
    scrollElementRef: scrollContainerRef,
    expandedRowKeys,
  });

  // Body 的虚拟 / 编辑能力按对象传递，减少顶层模板的 props 轰炸。
  const virtualApi = computed<BodyVirtualApi | undefined>(() =>
    virtualEnabled.value
      ? {
          enabled: true,
          items: virtualItems.value,
          topSpacerHeight: topSpacerHeight.value,
          bottomSpacerHeight: bottomSpacerHeight.value,
          measureElement,
          measureExpandedElement,
        }
      : undefined
  );

  const editingApi = computed<BodyEditingApi>(() => ({
    state: editingState.value,
    commitOnBlur: props.editConfig?.commitOnBlur,
    onSetValue: setEditValue,
    onCommit: commitEdit,
    onCancel: cancelEdit,
  }));

  // 滚动触底配置：只有使用触底插槽或显式配置阈值时才挂载哨兵与观察器。
  const scrollToBottomOffset = toRef(() => {
    const v = virtual.value;
    if (isRowVirtualEnabled(v) && typeof v === 'object') return v.scrollToBottomOffset;
    return undefined;
  });

  const scrollToBottomEnabled = computed(
    () => Boolean(slots.scrollToBottom) || scrollToBottomOffset.value !== undefined
  );
  // 统一滚动能力：框选边缘自动滚动、触底检测（IntersectionObserver 哨兵）和固定列阴影。
  const {
    isScrollToBottom,
    hasLeftShadow: hasFixedColumnLeftShadow,
    hasRightShadow: hasFixedColumnRightShadow,
    scrollbarWidth: fixedColumnScrollbarWidth,
  } = useScroll({
    scrollElementRef: scrollContainerRef,
    autoScroll: {
      active: isCellRangeDragging,
      onScrollTick: ({ x, y }) => {
        const ownerDocument = scrollContainerRef.value?.ownerDocument;
        if (!ownerDocument) return;
        const el = ownerDocument.elementFromPoint(x, y);
        const cell = el?.closest<HTMLElement>('td[data-row-id][data-column-id]');
        if (!cell) return;
        const rowId = cell.getAttribute('data-row-id');
        const columnId = cell.getAttribute('data-column-id');
        if (rowId == null || columnId == null) return;
        handleCellMouseEnter(rowId, columnId);
      },
    },
    scrollToBottom: {
      sentinel: scrollBottomSentinelRef,
      enabled: scrollToBottomEnabled,
      offset: scrollToBottomOffset,
      onScrollToBottom: () => emit('scrollToBottom'),
    },
    fixedColumnShadow: {
      enabled: computed(() => !props.bordered && hasFixedColumns.value),
    },
  });

  // 阴影只需要跟随固定区宽度定位，直接复用 TanStack 的固定区总尺寸，避免遍历行或单元格。
  const fixedColumnShadowStyles = computed(() => {
    // 读取固定列样式 Map 建立响应式依赖，列宽或 pinning 改变时同步移动 overlay。
    const fixedColumnCount = fixedColumnStyles.value.size;
    return {
      left: `${fixedColumnCount > 0 ? table.getStartTotalSize() : 0}px`,
      right: `${fixedColumnCount > 0 ? table.getEndTotalSize() + fixedColumnScrollbarWidth.value : 0}px`,
    };
  });

  return {
    scrollContainerRef,
    scrollBottomSentinelRef,
    focusFirstBodyCell,
    renderedColumns,
    scrollToColumn,
    virtualEnabled,
    virtualItems,
    topSpacerHeight,
    bottomSpacerHeight,
    measureElement,
    measureExpandedElement,
    scrollToIndex,
    scrollToTop,
    scrollToEnd,
    virtualApi,
    editingApi,
    scrollToBottomEnabled,
    isScrollToBottom,
    hasFixedColumnLeftShadow,
    hasFixedColumnRightShadow,
    fixedColumnShadowStyles,
  };
};
