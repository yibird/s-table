import { computed, watch, type Ref } from 'vue';
import { useVirtualizer, type VirtualItem } from '@tanstack/vue-virtual';
import type { Row, RowData, TableFeatures } from '@tanstack/vue-table';
import {
  resolveEstimateSize,
  resolveFixedRowHeight,
  resolveOverscan,
  resolveSpacerHeights,
} from '@zchengfeng/s-table-core';
import type { STableRowKey, STableVirtualProps } from '../types';
import { isRowVirtualEnabled } from '../utils';
import { useExpandedRow } from './useExpandedRow';

/**
 * `useVirtual` 的入参约束。
 */
type UseSTableVirtualOptions<TData extends RowData> = {
  /** 虚拟配置（来自 props.virtual）。 */
  virtual: Readonly<Ref<boolean | STableVirtualProps<TData> | undefined>>;
  /** TanStack Table 全量行（来自 useSTable 返回的 rows）。 */
  rows: Readonly<Ref<Row<TableFeatures, TData>[]>>;
  /** 滚动容器 DOM 引用（绑定到 `.s-table-container`）。 */
  scrollElementRef: Readonly<Ref<HTMLElement | null>>;
  /** 展开行键值（用于把展开内容并入同一逻辑行块测量）。 */
  expandedRowKeys?: Readonly<Ref<STableRowKey[]>>;
  /** 按 row.id 保留已测量高度。 */
  preserveRow?: Readonly<Ref<boolean | undefined>>;
  /** 任一可见列启用 autoHeight 时强制动态测量。 */
  hasAutoHeight?: Readonly<Ref<boolean>>;
};

/**
 * 从 virtual 配置中解析 STableVirtualProps 对象。
 */
function resolveVirtualConfig<TData extends RowData>(
  virtual: boolean | STableVirtualProps<TData> | undefined
): Pick<
  STableVirtualProps<TData>,
  'estimateSize' | 'rowHeight' | 'overscan' | 'scrollToBottomOffset' | 'buffer'
> | null {
  if (virtual === true) return {};
  if (isRowVirtualEnabled(virtual) && typeof virtual === 'object') return virtual;
  return null;
}

/** 计算一个虚拟逻辑行块（主行 + 可选详情兄弟行）的高度。 */
export const measureVirtualRowBlock = (
  element: Element,
  entry: ResizeObserverEntry | undefined,
  fixedRowHeight: number | null
): number => {
  const mainEl = element as HTMLElement;
  const next = mainEl.nextElementSibling as HTMLElement | null;
  const isExpanded = next?.classList.contains('s-table-expanded-row') === true;

  // 固定行高模式不读取主行布局；只有详情兄弟行需要一次真实高度测量。
  if (fixedRowHeight != null) {
    return fixedRowHeight + (isExpanded ? next.offsetHeight : 0);
  }

  const box = entry?.borderBoxSize?.[0];
  const mainHeight = box ? Math.round(box.blockSize) : mainEl.offsetHeight;
  const expandedHeight = isExpanded ? next.offsetHeight : 0;
  return mainHeight + expandedHeight;
};

/**
 * 表格虚拟滚动 hook。
 *
 * 基于 `@tanstack/vue-virtual` 实现，只渲染可视区域内的行，
 * 通过 `<tr>` 占位撑开滚动高度，并支持动态行高测量。
 *
 */
export const useVirtual = <TData extends RowData>({
  virtual,
  rows,
  scrollElementRef,
  expandedRowKeys,
  preserveRow,
  hasAutoHeight,
}: UseSTableVirtualOptions<TData>) => {
  // ==================== 配置解析 ====================

  const virtualConfig = computed(() => resolveVirtualConfig(virtual.value));
  const virtualEnabled = computed(() => virtualConfig.value !== null);

  // overscan 上限 clamp 为 100，防止过大值导致渲染项爆炸；buffer 优先于旧字段。
  const overscan = computed(() => {
    const buffer = virtualConfig.value?.buffer;
    return resolveOverscan(
      typeof buffer === 'number' ? buffer : (buffer?.y ?? virtualConfig.value?.overscan)
    );
  });

  // 固定行高（用户显式配置）。设置后进入「固定行高」快路径。
  const fixedRowHeight = computed(() => {
    if (hasAutoHeight?.value) return null;
    const configured = virtualConfig.value?.rowHeight;
    return typeof configured === 'number' ? resolveFixedRowHeight(configured) : null;
  });

  // estimateSize：固定行高模式返回精确值（未测量的行即为该高度）；否则用预估值。
  const estimateSize = computed(() =>
    resolveEstimateSize(virtualConfig.value?.estimateSize, fixedRowHeight.value)
  );

  /**
   * 测量单个虚拟项（= 一个「逻辑行块」）的高度。
   *
   * 主行 `<tr data-index>` 被 ResizeObserver 观测；展开行是紧随其后的兄弟 `<tr>`，
   * 不带 data-index、不单独测量。这里把「主行 + 其展开兄弟行」的高度相加，
   * 使 virtualizer 的每个 item 覆盖整个逻辑行块，避免展开内容不计入总高度 /
   * 导致滚动定位失准。
   *
   * 说明：ResizeObserver 提供 borderBoxSize 时优先用它（仅覆盖主行），再补加展开行；
   * 否则回退 offsetHeight。
   */
  // ==================== Virtualizer ====================

  // 函数型 option 必须保持引用稳定。TanStack 把 getItemKey 引用纳入测量 memo；若用
  // getter 每次返回新闭包，仅修改 overscan 也会误触发一次 O(rows) 布局重算。
  const getScrollElement = () => (virtualEnabled.value ? scrollElementRef.value : null);
  /** preserveRow 模式下按 row.id 缓存实测高度，数据刷新后仍可作为估算值。 */
  const PRESERVED_HEIGHT_LIMIT = 5000;
  const preservedHeights = new Map<string, number>();
  watch(preserveRow ?? (() => undefined), (enabled) => {
    if (!enabled) preservedHeights.clear();
  });
  /** 函数式 rowHeight 结果缓存：虚拟器会反复估算未测量行，避免重复执行用户回调。 */
  const rowHeightCache = new Map<string, number | undefined>();
  watch([virtualConfig, rows], () => rowHeightCache.clear());
  const estimateItemSize = (index: number) => {
    const row = rows.value[index];
    if (preserveRow?.value) {
      const cached = row ? preservedHeights.get(row.id) : undefined;
      if (cached !== undefined) return cached;
    }
    const configured = virtualConfig.value?.rowHeight;
    if (typeof configured === 'function' && row) {
      if (rowHeightCache.has(row.id)) {
        const cached = rowHeightCache.get(row.id);
        return cached ?? estimateSize.value;
      }
      const height = configured(row.original, index);
      const valid =
        typeof height === 'number' && Number.isFinite(height) && height > 0 ? height : undefined;
      rowHeightCache.set(row.id, valid);
      return valid ?? estimateSize.value;
    }
    return estimateSize.value;
  };
  // 逻辑行块高度：主行 + 展开兄弟行。与返回给 Body 的 measureElement（DOM 注册入口）不同。
  const measureElementBlock = (element: Element, entry: ResizeObserverEntry | undefined) => {
    const height = measureVirtualRowBlock(element, entry, fixedRowHeight.value);
    if (preserveRow?.value) {
      const index = Number(element.getAttribute('data-index'));
      const row = Number.isFinite(index) ? rows.value[index] : undefined;
      if (row) {
        if (!preservedHeights.has(row.id) && preservedHeights.size >= PRESERVED_HEIGHT_LIMIT) {
          // Map 按插入序迭代：淘汰最早写入的 key，避免长生命周期表格无限增长。
          const oldest = preservedHeights.keys().next().value;
          if (oldest !== undefined) preservedHeights.delete(oldest);
        }
        preservedHeights.set(row.id, height);
      }
    }
    return height;
  };
  const getItemKey = (index: number) => {
    const row = rows.value[index];
    if (!row) return index;
    return row.id;
  };

  const virtualizerOptions = computed(() => ({
    // 使用 TanStack 内置 enabled 生命周期：关闭时释放监听并清空测量缓存，
    // 避免再次开启后复用关闭前的旧行高。
    enabled: virtualEnabled.value,
    count: virtualEnabled.value ? rows.value.length : 0,
    getScrollElement,
    estimateSize: estimateItemSize,
    overscan: overscan.value,
    // TanStack Virtual 官方已提供观察器合帧；开启后测量与虚拟器布局更新都在下一帧执行，
    // 避免 ResizeObserver 回调内同步 resizeItem 触发浏览器的 loop 警告。
    useAnimationFrameWithResizeObserver: true,
    // 直接复用 TanStack 已解析的 row.id，避免虚拟热路径再次执行用户 rowKey 函数，
    // 并确保选择、展开、定位与虚拟测量使用完全相同的行身份。
    getItemKey,
    // 逻辑行块测量：主行 + 展开兄弟行。普通固定行不会进入此回调。
    measureElement: measureElementBlock,
  }));

  const virtualizer = useVirtualizer(virtualizerOptions);

  // ==================== 派生计算属性 ====================

  const virtualItems = computed<VirtualItem[]>(() => {
    if (!virtualEnabled.value) return [];
    return virtualizer.value.getVirtualItems();
  });

  const totalSize = computed<number>(() => {
    if (!virtualEnabled.value) return 0;
    return virtualizer.value.getTotalSize();
  });

  const spacerHeights = computed(() => resolveSpacerHeights(virtualItems.value, totalSize.value));
  const topSpacerHeight = computed(() => spacerHeights.value.top);
  const bottomSpacerHeight = computed(() => spacerHeights.value.bottom);

  // ==================== 行块测量（主行 + 展开兄弟行） ====================

  const { measureElement, measureExpandedElement, scheduleRenderedRowsMeasurement } =
    useExpandedRow({
      virtualizer,
      virtualEnabled,
      fixedRowHeight,
      scrollElementRef,
      expandedRowKeys,
    });

  // estimateSize / fixedRowHeight 变化时丢弃实测缓存并重测当前窗口。
  watch([estimateSize, fixedRowHeight], ([nextEstimate, nextFixed], [prevEstimate, prevFixed]) => {
    if (!virtualEnabled.value || (nextEstimate === prevEstimate && nextFixed === prevFixed)) {
      return;
    }
    // TanStack Virtual 不会因 estimateSize 函数返回值变化自动丢弃实测缓存。
    // 复用其 measure() 完整失效布局，再只同步当前虚拟窗口，避免遍历全部 DOM / 数据。
    virtualizer.value.measure();
    scheduleRenderedRowsMeasurement();
  });

  // ==================== 方法 ====================

  /** 普通表格按 DOM 行定位；公开滚动 API 不应因未启用虚拟化而静默失效。 */
  const scrollNativeRowToTop = (index: number) => {
    const scrollElement = scrollElementRef.value;
    if (!scrollElement) return;
    const row = scrollElement.querySelector<HTMLElement>(`.s-table-row[data-index="${index}"]`);
    if (!row) return;
    const offset =
      row.getBoundingClientRect().top -
      scrollElement.getBoundingClientRect().top +
      scrollElement.scrollTop;
    scrollElement.scrollTop = Math.max(0, offset);
  };

  /** 将指定索引的行滚动到可视区域顶部。 */
  const scrollToIndex = (index: number) => {
    if (virtualEnabled.value) {
      virtualizer.value.scrollToIndex(index, { align: 'start' });
      return;
    }
    scrollNativeRowToTop(index);
  };

  /** 滚动到列表顶部。 */
  const scrollToTop = () => {
    if (virtualEnabled.value) {
      virtualizer.value.scrollToOffset(0);
      return;
    }
    const scrollElement = scrollElementRef.value;
    if (scrollElement) scrollElement.scrollTop = 0;
  };

  /** 滚动到列表末尾。 */
  const scrollToEnd = () => {
    if (virtualEnabled.value) {
      virtualizer.value.scrollToEnd();
      return;
    }
    const scrollElement = scrollElementRef.value;
    if (scrollElement) {
      scrollElement.scrollTop = Math.max(
        0,
        scrollElement.scrollHeight - scrollElement.clientHeight
      );
    }
  };

  return {
    virtualEnabled,
    virtualItems,
    totalSize,
    topSpacerHeight,
    bottomSpacerHeight,
    measureElement,
    measureExpandedElement,
    scrollToIndex,
    scrollToTop,
    scrollToEnd,
  };
};
