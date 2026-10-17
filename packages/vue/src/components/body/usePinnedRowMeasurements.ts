import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  watch,
  type CSSProperties,
  type Ref,
} from 'vue';
import { scheduleAnimationFrame } from '../../utils';
import type { ScheduledAnimationFrame } from '../../utils';

type UsePinnedRowMeasurementsOptions = {
  tbodyRef: Readonly<Ref<HTMLTableSectionElement | null>>;
  topRows: Readonly<Ref<readonly unknown[]>>;
  bottomRows: Readonly<Ref<readonly unknown[]>>;
  fixedHeader: Readonly<Ref<boolean>>;
  /** 没有固定行时不创建 observer，也不读取表格布局。 */
  enabled?: Readonly<Ref<boolean>>;
};

const sameOffsetMap = (left: ReadonlyMap<string, number>, right: ReadonlyMap<string, number>) => {
  if (left.size !== right.size) return false;
  for (const [key, value] of left) if (right.get(key) !== value) return false;
  return true;
};

/** 测量固定行堆叠偏移，并将 DOM 观察与渲染组件生命周期隔离。 */
export const usePinnedRowMeasurements = ({
  tbodyRef,
  topRows,
  bottomRows,
  fixedHeader,
  enabled,
}: UsePinnedRowMeasurementsOptions) => {
  const offsets = shallowRef(new Map<string, number>());
  const styleCache = new Map<string, CSSProperties>();
  let resizeObserver: ResizeObserver | null = null;
  let measurementFrame: ScheduledAnimationFrame | null = null;

  const getPinnedStyle = (
    rowId: string,
    position: 'top' | 'bottom' | undefined
  ): CSSProperties | undefined => {
    if (!position) return undefined;
    const offset = offsets.value.get(rowId) ?? 0;
    const cacheKey = `${position}:${offset}`;
    const cached = styleCache.get(cacheKey);
    if (cached) return cached;
    const style = {
      position: 'sticky',
      [position]: `${offset}px`,
      // 固定行位于表体固定格之上，与固定表头同层。
      zIndex: 'calc(var(--s-z-index-cell-fixed) + 1)',
    } satisfies CSSProperties;
    styleCache.set(cacheKey, style);
    return style;
  };

  const syncOffsets = () => {
    const body = tbodyRef.value;
    if (!body) return;
    const next = new Map<string, number>();
    const header = body.closest('table')?.querySelector<HTMLElement>('.s-table-header');
    let topOffset = fixedHeader.value ? (header?.offsetHeight ?? 0) : 0;
    for (const row of body.querySelectorAll<HTMLElement>('.s-table-row-pinned-top[data-row-id]')) {
      const id = row.dataset.rowId;
      if (!id) continue;
      next.set(id, topOffset);
      topOffset += row.offsetHeight;
    }

    let bottomOffset = 0;
    const pinnedBottomRows = body.querySelectorAll<HTMLElement>(
      '.s-table-row-pinned-bottom[data-row-id]'
    );
    for (let index = pinnedBottomRows.length - 1; index >= 0; index--) {
      const row = pinnedBottomRows[index];
      const id = row?.dataset.rowId;
      if (!row || !id) continue;
      next.set(id, bottomOffset);
      bottomOffset += row.offsetHeight;
    }

    if (!sameOffsetMap(offsets.value, next)) {
      styleCache.clear();
      offsets.value = next;
    }
  };

  const scheduleOffsetSync = () => {
    if (measurementFrame) return;
    measurementFrame = scheduleAnimationFrame(() => {
      measurementFrame = null;
      if (enabled?.value !== false) syncOffsets();
    });
  };

  const refreshMeasurements = () => {
    const body = tbodyRef.value;
    measurementFrame?.cancel();
    measurementFrame = null;
    resizeObserver?.disconnect();
    if (!body || enabled?.value === false) {
      if (offsets.value.size > 0) {
        styleCache.clear();
        offsets.value = new Map();
      }
      return;
    }
    syncOffsets();
    if (typeof ResizeObserver === 'undefined') return;
    resizeObserver ??= new ResizeObserver(scheduleOffsetSync);
    const header = body.closest('table')?.querySelector<HTMLElement>('.s-table-header');
    if (fixedHeader.value && header) resizeObserver.observe(header);
    body
      .querySelectorAll<HTMLElement>('.s-table-row-pinned')
      .forEach((row) => resizeObserver?.observe(row));
  };

  onMounted(refreshMeasurements);
  watch(
    [topRows, bottomRows, fixedHeader, () => enabled?.value ?? true],
    () => nextTick(refreshMeasurements),
    { flush: 'post' }
  );
  onBeforeUnmount(() => {
    measurementFrame?.cancel();
    resizeObserver?.disconnect();
  });

  return { getPinnedStyle };
};
