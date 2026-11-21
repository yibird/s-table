import { onBeforeUnmount, onMounted, shallowRef, type Ref, type VNodeChild } from 'vue';
import type { Row, RowData, TableFeatures } from '@tanstack/vue-table';
import type { STableColumn } from '../../types';

/** 一份 tbody 事件委托与浮层状态；滚动和卸载时释放目标及监听器。 */
export const useBodyTooltip = <TData extends RowData>(options: {
  tbodyRef: Readonly<Ref<HTMLTableSectionElement | null>>;
  props: {
    rows: Row<TableFeatures, TData>[];
    topRows: Row<TableFeatures, TData>[];
    centerRows: Row<TableFeatures, TData>[];
    bottomRows: Row<TableFeatures, TData>[];
  };
  getColumnById: (columnId: string) => STableColumn<TData> | undefined;
}) => {
  const { tbodyRef, props, getColumnById } = options;
  const tooltipTarget = shallowRef<HTMLElement | null>(null);
  const tooltipContent = shallowRef<VNodeChild>(undefined);
  const tooltipOpen = shallowRef(false);

  const hideTooltip = () => {
    tooltipOpen.value = false;
    tooltipTarget.value = null;
    tooltipContent.value = undefined;
  };

  /** 优先按可见索引 O(1) 命中，避免每次 hover 合并/复制整份行数组。 */
  const findRowForTooltip = (rowId: string | undefined, rowIndex: number) => {
    const direct = props.rows[rowIndex];
    if (direct && (!rowId || direct.id === rowId)) return direct;
    if (!rowId) return undefined;
    for (const pool of [props.topRows, props.centerRows, props.bottomRows]) {
      const row = pool.find((candidate) => candidate.id === rowId);
      if (row) return row;
    }
    return undefined;
  };

  const handleTooltipOver = (event: MouseEvent | FocusEvent) => {
    const cell = (event.target as Element | null)?.closest<HTMLElement>('td[data-column-id]');
    if (!cell) {
      hideTooltip();
      return;
    }
    if (tooltipOpen.value && cell === tooltipTarget.value) return;
    const columnId = cell.dataset.columnId!;
    const column = getColumnById(columnId);
    if (!column?.tooltip || cell.scrollWidth <= cell.clientWidth + 1) {
      hideTooltip();
      return;
    }
    const rowElement = cell.closest('tr');
    const rowIndex = Number(rowElement?.getAttribute('data-row-index') ?? 0);
    const row = findRowForTooltip(rowElement?.getAttribute('data-row-id') ?? undefined, rowIndex);
    const tooltip = column.tooltip;
    tooltipContent.value =
      typeof tooltip === 'function'
        ? tooltip({ record: row?.original as TData, rowIndex, columnId })
        : tooltip === true
          ? (cell.textContent ?? '')
          : tooltip;
    tooltipTarget.value = cell;
    tooltipOpen.value = tooltipContent.value !== undefined;
  };

  const handleTooltipOut = (event: MouseEvent | FocusEvent) => {
    const cell = (event.target as Element | null)?.closest<HTMLElement>('td[data-column-id]');
    if (!cell || cell !== tooltipTarget.value) return;
    const related = event.relatedTarget as Node | null;
    if (related && cell.contains(related)) return;
    hideTooltip();
  };

  // 滚动后单元格可能被虚拟化复用或移出视口，旧浮层不能继续指向它。
  let tooltipScrollContainer: HTMLElement | null = null;
  let tooltipScrollWindow: Window | null = null;
  const handleTooltipScroll = () => {
    if (tooltipOpen.value) hideTooltip();
  };

  onMounted(() => {
    const body = tbodyRef.value;
    tooltipScrollContainer = body?.closest<HTMLElement>('.s-table-container') ?? null;
    tooltipScrollWindow = body?.ownerDocument.defaultView ?? null;
    tooltipScrollContainer?.addEventListener('scroll', handleTooltipScroll, { passive: true });
    tooltipScrollWindow?.addEventListener('scroll', handleTooltipScroll, { passive: true });
  });

  onBeforeUnmount(() => {
    tooltipScrollContainer?.removeEventListener('scroll', handleTooltipScroll);
    tooltipScrollWindow?.removeEventListener('scroll', handleTooltipScroll);
    tooltipScrollContainer = null;
    tooltipScrollWindow = null;
  });

  return { tooltipTarget, tooltipContent, tooltipOpen, handleTooltipOver, handleTooltipOut };
};
