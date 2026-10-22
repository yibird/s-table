import { computed, type CSSProperties } from 'vue';
import type { Row, RowData, TableFeatures } from '@tanstack/vue-table';
import type { STableEditingState } from '../../types';
import { decodeRowKey } from '../../utils';
import { splitTableAttrs, type SplitTableAttrs } from '../../utils/mergeTableAttrs';
import type { BodyEditingApi, BodyVirtualApi } from '../../types';

// 行状态位掩码：把影响行渲染的四类布尔输入（选中 / 展开 / 拖拽源 / 拖拽目标）
// 预计算为单个数字进入 v-memo，避免 memo 数组里每行做多次函数调用。
export const ROW_FLAG_SELECTED = 1;
export const ROW_FLAG_EXPANDED = 1 << 1;
export const ROW_FLAG_DRAG_SOURCE = 1 << 2;
export const ROW_FLAG_DRAG_TARGET = 1 << 3;
export const ROW_FLAG_GROUPED = 1 << 4;

/** 统一渲染项（虚拟/非虚拟模式） */
export type RenderItem<TData extends RowData> = {
  /** v-for key；virtual-core 的 Key 联合含 bigint，这里统一收敛为字符串（getItemKey 返回 row.id）。 */
  key: string;
  row: Row<TableFeatures, TData>;
  index: number;
  ref: ((el: unknown) => void) | undefined;
  expandedRef: ((el: unknown) => void) | undefined;
  dataIndex?: number;
  publicRowKey: string | number;
  /** 行状态位掩码（选中/展开/拖拽源/拖拽目标），供 v-memo 与 class 纯值比较。 */
  flags: number;
  /** 框选渲染键，仅边界或覆盖列变化的行会更新。 */
  rangeMemoKey: string;
  /** 只有当前编辑行持有编辑快照，输入时其余行保持稳定的 null memo key。 */
  editMemoKey: STableEditingState | null;
  rowClass?: string;
  rowStyle?: CSSProperties;
  /** customRow 拆分后的 class / style / 其余属性。 */
  rowAttrs?: SplitTableAttrs;
  pinnedPosition?: 'top' | 'bottom';
  pinnedStyle?: CSSProperties;
  section: 'top' | 'center' | 'bottom';
  sectionIndex: number;
};

/** 渲染项需要的 props 面（直接传 reactive props，保持依赖追踪）。 */
export type RowRenderItemsProps<TData extends RowData> = {
  topRows?: Row<TableFeatures, TData>[];
  centerRows?: Row<TableFeatures, TData>[];
  bottomRows?: Row<TableFeatures, TData>[];
  virtualApi?: BodyVirtualApi;
  editingApi?: BodyEditingApi;
  rowClassName?: string | ((record: TData, rowIndex: number) => string | undefined);
  rowStyle?: CSSProperties | ((record: TData, rowIndex: number) => CSSProperties | undefined);
  customRow?: (record: TData, rowIndex: number) => Record<string, unknown> | undefined;
  isRowSelected?: (row: Row<TableFeatures, TData>) => boolean;
};

type UseRowRenderItemsOptions<TData extends RowData> = {
  props: RowRenderItemsProps<TData>;
  getDragRowFromIndex: () => number;
  getDragRowOverIndex: () => number;
  /** 多选拖拽时的整块行 id；为空集合时回退到单项索引判断。 */
  getDragSourceRowIds?: () => ReadonlySet<string> | undefined;
  getPinnedStyle: (
    rowId: string,
    pinned: 'top' | 'bottom' | undefined
  ) => CSSProperties | undefined;
  getRowRangeMemoKey: (rowIndex: number, rowId?: string) => string;
  mainElementRef: (el: unknown) => void;
  getExpandedElementRef: (row: Row<TableFeatures, TData>) => (el: unknown) => void;
};

/**
 * 行渲染项纯计算模块：
 * 渲染项对象跨帧原地复用（Hidden Class 稳定），行展示（rowClassName/rowStyle）
 * 每次求值直接执行回调，保证响应式依赖变化立即反映到 DOM。
 */
export const useRowRenderItems = <TData extends RowData>({
  props,
  getDragRowFromIndex,
  getDragRowOverIndex,
  getDragSourceRowIds,
  getPinnedStyle,
  getRowRangeMemoKey,
  mainElementRef,
  getExpandedElementRef,
}: UseRowRenderItemsOptions<TData>) => {
  /** 汇总影响行渲染的状态为单个位掩码，v-memo 数组只做数字比较。 */
  const getRowStateFlags = (row: Row<TableFeatures, TData>, index: number): number => {
    let flags = 0;
    if (props.isRowSelected?.(row) ?? row.getIsSelected()) flags |= ROW_FLAG_SELECTED;
    if (row.getIsExpanded()) flags |= ROW_FLAG_EXPANDED;
    const dragSourceIds = getDragSourceRowIds?.();
    const dragFromIndex = getDragRowFromIndex();
    const isDragSource =
      dragSourceIds && dragSourceIds.size > 0
        ? dragSourceIds.has(row.id)
        : dragFromIndex >= 0 && index === dragFromIndex;
    if (isDragSource) flags |= ROW_FLAG_DRAG_SOURCE;
    // 拖拽块内部成员不显示投放目标，否则多选拖拽时整块会被误标成落点。
    const dragOverIndex = getDragRowOverIndex();
    if (!isDragSource && dragOverIndex >= 0 && index === dragOverIndex) {
      flags |= ROW_FLAG_DRAG_TARGET;
    }
    if (row.getIsGrouped()) flags |= ROW_FLAG_GROUPED;
    return flags;
  };

  // 渲染项按求值创建新对象：memo 失效由 v-memo 的纯值比较负责，
  // 不再跨帧复用/原地改写 item，避免隐式对象身份契约。

  const getRowEditingMemoKey = (rowKey: string | number): STableEditingState | null => {
    const editing = props.editingApi?.state;
    return editing?.rowKey === rowKey ? editing : null;
  };

  const resolveRowClass = (record: TData, index: number) =>
    typeof props.rowClassName === 'function'
      ? props.rowClassName(record, index)
      : props.rowClassName;
  const resolveRowStyle = (record: TData, index: number) =>
    typeof props.rowStyle === 'function' ? props.rowStyle(record, index) : props.rowStyle;

  /** customRow 结果按 Row + index + 回调身份缓存，避免虚拟滚动每帧重建 attrs 使 v-memo 失效。 */
  const rowAttrsCache = new WeakMap<
    object,
    { index: number; fn: typeof props.customRow; attrs: SplitTableAttrs | undefined }
  >();
  const resolveRowAttrs = (
    row: Row<TableFeatures, TData>,
    index: number
  ): SplitTableAttrs | undefined => {
    const fn = props.customRow;
    if (!fn) return undefined;
    const cached = rowAttrsCache.get(row);
    if (cached && cached.index === index && cached.fn === fn) return cached.attrs;
    const attrs = splitTableAttrs(fn(row.original, index));
    rowAttrsCache.set(row, { index, fn, attrs });
    return attrs;
  };

  /** 构建行的渲染项。 */
  const createRenderItem = (
    row: Row<TableFeatures, TData>,
    index: number,
    key: RenderItem<TData>['key'],
    ref: RenderItem<TData>['ref'],
    expandedRef: RenderItem<TData>['expandedRef'],
    dataIndex: number | undefined,
    pinnedPosition: 'top' | 'bottom' | undefined,
    section: RenderItem<TData>['section'],
    sectionIndex: number
  ): RenderItem<TData> => {
    const publicRowKey = decodeRowKey(row.id);
    return {
      key,
      row,
      index,
      ref,
      expandedRef,
      dataIndex,
      publicRowKey,
      flags: getRowStateFlags(row, index),
      rangeMemoKey: getRowRangeMemoKey(index, row.id),
      editMemoKey: getRowEditingMemoKey(publicRowKey),
      rowClass: resolveRowClass(row.original, index),
      rowStyle: resolveRowStyle(row.original, index),
      rowAttrs: resolveRowAttrs(row, index),
      pinnedPosition,
      pinnedStyle: getPinnedStyle(row.id, pinnedPosition),
      section,
      sectionIndex,
    };
  };

  const renderItems = computed<RenderItem<TData>[]>(() => {
    const items: RenderItem<TData>[] = [];
    const topCount = props.topRows?.length ?? 0;
    const centerCount = props.centerRows?.length ?? 0;
    for (let index = 0; index < topCount; index++) {
      const row = props.topRows?.[index];
      if (!row) continue;
      items.push(
        createRenderItem(
          row,
          index,
          `top:${row.id}`,
          undefined,
          undefined,
          undefined,
          'top',
          'top',
          index
        )
      );
    }
    if (props.virtualApi?.enabled) {
      for (const vItem of props.virtualApi.items ?? []) {
        const row = props.centerRows?.[vItem.index];
        // 数据骤减时 virtualizer 可能在同一轮更新里短暂保留旧索引；跳过越界项，
        // 避免模板对 undefined Row 调用选择、展开和单元格 API。
        if (!row) continue;
        items.push(
          createRenderItem(
            row,
            topCount + vItem.index,
            String(vItem.key),
            mainElementRef,
            getExpandedElementRef(row),
            vItem.index,
            undefined,
            'center',
            items.length - topCount
          )
        );
      }
    } else {
      for (let index = 0; index < centerCount; index++) {
        const row = props.centerRows?.[index];
        if (!row) continue;
        items.push(
          createRenderItem(
            row,
            topCount + index,
            row.id,
            undefined,
            undefined,
            index,
            undefined,
            'center',
            index
          )
        );
      }
    }
    const bottomCount = props.bottomRows?.length ?? 0;
    for (let index = 0; index < bottomCount; index++) {
      const row = props.bottomRows?.[index];
      if (!row) continue;
      items.push(
        createRenderItem(
          row,
          topCount + centerCount + index,
          `bottom:${row.id}`,
          undefined,
          undefined,
          undefined,
          'bottom',
          'bottom',
          index
        )
      );
    }
    return items;
  });

  return { renderItems };
};
