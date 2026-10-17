import { computed, type CSSProperties } from 'vue';
import type { Cell, Row, RowData, TableFeatures } from '@tanstack/vue-table';
import { isInternalColumn } from '../../utils/column';
import type { STableRenderedColumn } from '../../types';
import type { STableColumn, STableGroupRowSlotContext } from '../../types';
import { getCachedCell } from '../../utils/cachedCell';

/** 行渲染辅助函数所需的 props 面（传入 props 本体以保持响应式读取）。 */
export type BodyRowRenderingProps<TData extends RowData> = {
  renderedColumns: STableRenderedColumn[];
  visibleColumnIds: string[];
  treeIndentSize?: number;
  treeIndentBasePadding: number;
  cellRenderToken: ReadonlyMap<string, readonly unknown[]>;
  dataSourceToken: readonly TData[];
};

export type BodyColumnSpacer = { type: 'spacer'; id: string; colSpan: number; width: number };
export type BodyCellRenderEntry<TData extends RowData = RowData> =
  | Cell<TableFeatures, TData>
  | BodyColumnSpacer;

/**
 * Body 行渲染纯逻辑：树缩进、列索引、分组行上下文与可见单元格集合。
 *
 * 只读 props / 列上下文的派生计算，不持有自己的状态；模板与事件委托共用同一实现。
 */
export const useBodyRowRendering = <TData extends RowData>(options: {
  props: BodyRowRenderingProps<TData>;
  getColumnById: (columnId: string) => STableColumn<TData> | undefined;
}) => {
  const { props, getColumnById } = options;

  // 树缩进放在首个业务列，而不是固定展开列，避免深层节点把 24px 触发器挤出固定列边界。
  const treeIndentColumnId = computed(() =>
    props.treeIndentSize === undefined
      ? undefined
      : props.visibleColumnIds.find((id) => !isInternalColumn(id))
  );

  const getTreeIndentStyle = (
    cell: Cell<TableFeatures, TData>,
    row: Row<TableFeatures, TData>
  ): CSSProperties | undefined => {
    const indentSize = props.treeIndentSize;
    if (
      indentSize === undefined ||
      row.depth === 0 ||
      cell.column.id !== treeIndentColumnId.value
    ) {
      return undefined;
    }
    return { paddingInlineStart: `${props.treeIndentBasePadding + row.depth * indentSize}px` };
  };

  /**
   * 列 ID → 列索引 的预编译映射（O(1) 查找，替代每格 indexOf 的 O(列) 扫描）。
   * 只有 visibleColumnIds 引用变化时才重建。
   */
  const colIndexMap = computed(() => {
    const map = new Map<string, number>();
    props.visibleColumnIds.forEach((id, i) => map.set(id, i));
    return map;
  });

  /** 通过列 ID 查找列索引（用于框选范围判断），O(1)。 */
  const getColIndex = (columnId: string): number => colIndexMap.value.get(columnId) ?? -1;

  const isColumnSpacer = (entry: BodyCellRenderEntry<TData>): entry is BodyColumnSpacer =>
    'type' in entry && entry.type === 'spacer';

  const groupLeafCountCache = new WeakMap<Row<TableFeatures, TData>, number>();

  const getGroupLeafCount = (row: Row<TableFeatures, TData>): number => {
    const cached = groupLeafCountCache.get(row);
    if (cached !== undefined) return cached;
    let count = 0;
    const stack = [...row.subRows];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      if (current.getIsGrouped()) stack.push(...current.subRows);
      else count++;
    }
    groupLeafCountCache.set(row, count);
    return count;
  };

  const getGroupRowContext = (row: Row<TableFeatures, TData>): STableGroupRowSlotContext<TData> => {
    const columnId = row.groupingColumnId ?? '';
    return {
      groupRowId: row.id,
      columnId,
      column: getColumnById(columnId),
      groupValue: row.groupingValue,
      count: getGroupLeafCount(row),
      depth: row.depth,
      expanded: row.getIsExpanded(),
      toggle: () => row.toggleExpanded(),
    };
  };

  const getRenderedCells = (row: Row<TableFeatures, TData>): BodyCellRenderEntry<TData>[] => {
    if (props.renderedColumns.length === 0) return row.getVisibleCells();
    const result: BodyCellRenderEntry<TData>[] = [];
    for (const entry of props.renderedColumns) {
      if (entry.type === 'spacer') {
        result.push(entry);
        continue;
      }
      const column = row.table.getColumn(entry.id);
      if (!column) continue;
      result.push(getCachedCell(row, column));
    }
    return result;
  };

  return {
    getTreeIndentStyle,
    getColIndex,
    isColumnSpacer,
    getGroupLeafCount,
    getGroupRowContext,
    getRenderedCells,
  };
};
