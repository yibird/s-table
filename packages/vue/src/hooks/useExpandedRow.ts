import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue';
import type { Virtualizer } from '@tanstack/vue-virtual';
import type { STableRowKey } from '../types';
import { encodeRowKey, escapeCssAttributeValue, scheduleAnimationFrame } from '../utils';
import type { ScheduledAnimationFrame } from '../utils';

type UseExpandedRowMeasurementOptions = {
  /** 行虚拟器实例（computed 包装，保持引用稳定）。 */
  virtualizer: Readonly<Ref<Virtualizer<HTMLElement, Element>>>;
  /** 是否启用虚拟滚动；关闭时释放测量缓存与观察器。 */
  virtualEnabled: Readonly<Ref<boolean>>;
  /** 固定行高（配置了 rowHeight 时进入快路径）。 */
  fixedRowHeight: Readonly<Ref<number | null>>;
  /** 滚动容器 DOM 引用。 */
  scrollElementRef: Readonly<Ref<HTMLElement | null>>;
  /** 展开行键值（用于把展开内容并入同一逻辑行块测量）。 */
  expandedRowKeys?: Readonly<Ref<STableRowKey[]>>;
};

/**
 * 虚拟行的逻辑行块测量：
 * 主行 + 可选详情兄弟行 合为一个虚拟项高度，并处理展开 / 收起后的重测调度。
 *
 * TanStack Virtual 只观察传给 measureElement 的主行。详情是兄弟 <tr>，其图片或异步
 * 内容变高不会触发主行 ResizeObserver，因此额外观察详情并回测对应主行逻辑块。
 */
export const useExpandedRow = ({
  virtualizer,
  virtualEnabled,
  fixedRowHeight,
  scrollElementRef,
  expandedRowKeys,
}: UseExpandedRowMeasurementOptions) => {
  /** 同步主行及其展开兄弟行的虚拟高度缓存。 */
  const syncElementMeasurement = (el: Element | null) => {
    if (!el) {
      // Vue 在虚拟行离屏时以 null 调用函数 ref。必须继续交给 TanStack，
      // 由其清除 elementsCache / ResizeObserver 中已断开的节点，避免长距离滚动后持有旧 DOM。
      virtualizer.value.measureElement(null);
      return;
    }
    if (!virtualEnabled.value) return;
    const element = el as HTMLElement;
    const next = element.nextElementSibling;
    const isExpanded = next?.classList.contains('s-table-expanded-row') === true;

    if (fixedRowHeight.value != null && !isExpanded) {
      // resizeItem 同尺寸时是 O(1) 空操作，同时可清除离屏展开行收起后遗留的动态高度。
      const index = Number(element.dataset.index);
      if (Number.isInteger(index)) virtualizer.value.resizeItem(index, fixedRowHeight.value);
      return;
    }

    virtualizer.value.measureElement(element);
  };

  let renderedRowsMeasurementScheduled = false;
  let pendingDirtyRowIds: Set<string> | null = new Set();
  // nextTick 回调无法取消：卸载后回调仍会执行，需要显式短路。
  let disposed = false;

  /** DOM 更新后合并重测请求，只访问虚拟窗口内已经渲染的行。 */
  const scheduleRenderedRowsMeasurement = (dirtyRowIds?: Iterable<string>) => {
    if (disposed || !virtualEnabled.value) return;
    if (dirtyRowIds === undefined) {
      pendingDirtyRowIds = null;
    } else if (pendingDirtyRowIds) {
      for (const id of dirtyRowIds) pendingDirtyRowIds.add(id);
    }
    if (renderedRowsMeasurementScheduled) return;
    renderedRowsMeasurementScheduled = true;
    nextTick(() => {
      renderedRowsMeasurementScheduled = false;
      if (disposed || !virtualEnabled.value) return;
      const scrollEl = scrollElementRef.value;
      if (!scrollEl) return;
      const dirtyIds = pendingDirtyRowIds;
      pendingDirtyRowIds = new Set();
      if (dirtyIds && dirtyIds.size === 0) return;
      if (dirtyIds && dirtyIds.size === 1) {
        const [id] = dirtyIds;
        const row = scrollEl.querySelector<HTMLElement>(
          `.s-table-row[data-index][data-row-id="${escapeCssAttributeValue(id!)}"]`
        );
        if (row) syncElementMeasurement(row);
        return;
      }
      // 多脏行 / 全量重测共走一条路径：一次 DOM 遍历后按 data-row-id 命中，
      // 避免逐行 querySelector 反复遍历子树。
      scrollEl.querySelectorAll<HTMLElement>('.s-table-row[data-index]').forEach((el) => {
        const id = el.getAttribute('data-row-id');
        if (!dirtyIds || id === null || dirtyIds.has(id)) syncElementMeasurement(el);
      });
    });
  };

  const expandedElements = new Map<string, Element>();
  let expandedResizeObserver: ResizeObserver | null = null;
  let expandedMeasurementFrame: ScheduledAnimationFrame | null = null;
  const pendingMainRows = new Set<Element>();

  const flushExpandedMeasurements = () => {
    expandedMeasurementFrame = null;
    const rows = [...pendingMainRows];
    pendingMainRows.clear();
    for (const mainRow of rows) {
      if (mainRow.classList.contains('s-table-row')) syncElementMeasurement(mainRow);
    }
  };

  const scheduleExpandedMeasurements = (entries: readonly ResizeObserverEntry[]) => {
    for (const entry of entries) {
      const mainRow = entry.target.previousElementSibling;
      if (mainRow?.classList.contains('s-table-row')) pendingMainRows.add(mainRow);
    }
    if (pendingMainRows.size > 0 && !expandedMeasurementFrame) {
      expandedMeasurementFrame = scheduleAnimationFrame(() => flushExpandedMeasurements());
    }
  };

  const getExpandedResizeObserver = (): ResizeObserver | null => {
    if (expandedResizeObserver) return expandedResizeObserver;
    if (typeof ResizeObserver === 'undefined') return null;
    expandedResizeObserver = new ResizeObserver(scheduleExpandedMeasurements);
    return expandedResizeObserver;
  };

  /** 注册或注销详情行；同一 rowId 替换 DOM 时先解除旧节点，避免观察器持有离屏节点。 */
  const measureExpandedElement = (rowId: string, el: Element | null) => {
    const previous = expandedElements.get(rowId);
    if (previous === el) return;
    if (previous) {
      expandedResizeObserver?.unobserve(previous);
      expandedElements.delete(rowId);
    }
    if (!virtualEnabled.value || !el) return;

    expandedElements.set(rowId, el);
    getExpandedResizeObserver()?.observe(el);
    const mainRow = el.previousElementSibling;
    if (mainRow?.classList.contains('s-table-row')) syncElementMeasurement(mainRow);
  };

  // 展开 / 收起时，主行自身 border-box 高度不变，ResizeObserver 不会触发，
  // 因此这里在展开集合变化、DOM 更新后主动重测当前渲染的所有主行（含展开兄弟行），
  // 修正逻辑行块高度与后续滚动偏移。
  if (expandedRowKeys) {
    let previousExpandedIds = new Set(expandedRowKeys.value.map((key) => encodeRowKey(key)));
    watch(
      // 受控数组以不可变替换同步（shallow）；避免 `() => keys.map(...)` 式 source
      // 每次求值都产生新数组引用导致误触发重测。
      expandedRowKeys,
      // flush:'post' 确保展开行 DOM 已移除后再重测，避免收起时把残留兄弟行高度计入逻辑行块。
      (keys) => {
        const nextExpandedIds = new Set(keys.map((key) => encodeRowKey(key)));
        const dirtyIds = new Set<string>();
        for (const id of previousExpandedIds) {
          if (!nextExpandedIds.has(id)) dirtyIds.add(id);
        }
        for (const id of nextExpandedIds) {
          if (!previousExpandedIds.has(id)) dirtyIds.add(id);
        }
        previousExpandedIds = nextExpandedIds;
        scheduleRenderedRowsMeasurement(dirtyIds);
      },
      { flush: 'post' }
    );
  }

  watch(virtualEnabled, (enabled) => {
    if (enabled) return;
    expandedMeasurementFrame?.cancel();
    expandedMeasurementFrame = null;
    pendingMainRows.clear();
    expandedResizeObserver?.disconnect();
    expandedResizeObserver = null;
    expandedElements.clear();
  });

  onBeforeUnmount(() => {
    disposed = true;
    pendingDirtyRowIds = null;
    expandedMeasurementFrame?.cancel();
    pendingMainRows.clear();
    expandedResizeObserver?.disconnect();
    expandedElements.clear();
  });

  return {
    measureElement: syncElementMeasurement,
    measureExpandedElement,
    scheduleRenderedRowsMeasurement,
  };
};
