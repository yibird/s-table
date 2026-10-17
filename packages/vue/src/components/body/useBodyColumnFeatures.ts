import { computed, type CSSProperties } from 'vue';
import type { RowData } from '@tanstack/vue-table';
import type { STableCellProps, STableColumn } from '../../types';
import { resolveColumnAlignStyle } from '../../utils/column';

const EMPTY_SIMPLE_COLUMN_IDS: ReadonlySet<string> = new Set();

export type BodyColumnFeatures<TData extends RowData> = {
  onCellMap: Map<string, (record: TData, rowIndex: number) => STableCellProps>;
  alignStyleById: Map<string, CSSProperties>;
  simpleColumnIds: ReadonlySet<string>;
};

const sameBodyColumnFeatures = <TData extends RowData>(
  left: BodyColumnFeatures<TData>,
  right: BodyColumnFeatures<TData>
) => {
  if (
    left.onCellMap.size !== right.onCellMap.size ||
    left.alignStyleById.size !== right.alignStyleById.size ||
    left.simpleColumnIds.size !== right.simpleColumnIds.size
  ) {
    return false;
  }
  for (const [id, resolver] of right.onCellMap) {
    if (left.onCellMap.get(id) !== resolver) return false;
  }
  for (const [id, style] of right.alignStyleById) {
    if (left.alignStyleById.get(id)?.textAlign !== style.textAlign) return false;
  }
  for (const id of right.simpleColumnIds) {
    if (!left.simpleColumnIds.has(id)) return false;
  }
  return true;
};

type UseBodyColumnFeaturesOptions<TData extends RowData> = {
  getVisibleColumnIds: () => readonly string[];
  getColumnById: (columnId: string) => STableColumn<TData> | undefined;
};

/**
 * 列能力预编译模块：
 * 把 onCell 解析器、对齐样式与「简单列」集合一次性映射为 O(1) 查找表，
 * 并用引用比较保留旧对象，避免列宽等无关状态变化连带失效行 memo。
 */
export const useBodyColumnFeatures = <TData extends RowData>({
  getVisibleColumnIds,
  getColumnById,
}: UseBodyColumnFeaturesOptions<TData>) => {
  const bodyColumnFeatures = computed<BodyColumnFeatures<TData>>((previous) => {
    const onCellMap = new Map<string, (record: TData, rowIndex: number) => STableCellProps>();
    const alignStyleById = new Map<string, CSSProperties>();
    const simpleColumnIds = new Set<string>();
    let hasBuiltInSpanning = false;
    for (const id of getVisibleColumnIds()) {
      const column = getColumnById(id);
      const onCell = column?.onCell;
      const hasOnCell = typeof onCell === 'function';
      if (hasOnCell) onCellMap.set(id, onCell);
      const alignStyle = resolveColumnAlignStyle(column);
      if (alignStyle) alignStyleById.set(id, alignStyle);
      if (!hasOnCell && !column?.editable) simpleColumnIds.add(id);
      if (column?.spanRows !== undefined || column?.spanColumns !== undefined) {
        hasBuiltInSpanning = true;
      }
    }
    // 任一内置 spanning 都可能覆盖相邻列；此时整表统一经过 BodyCell 才能正确跳过被覆盖 DOM。
    const next: BodyColumnFeatures<TData> = {
      onCellMap,
      alignStyleById,
      simpleColumnIds: hasBuiltInSpanning ? EMPTY_SIMPLE_COLUMN_IDS : simpleColumnIds,
    };
    return previous && sameBodyColumnFeatures(previous, next) ? previous : next;
  });
  const getAlignStyle = (columnId: string) => bodyColumnFeatures.value.alignStyleById.get(columnId);

  /**
   * 判断某列的单元格是否可走「快路径」内联渲染：
   * 无 onCell（无合并需求）且不可编辑。框选类名与事件可直接挂到内联 td，
   * 不需要为所有可见单元格实例化 BodyCell。
   */
  const isSimpleCell = (columnId: string): boolean =>
    bodyColumnFeatures.value.simpleColumnIds.has(columnId);

  return { bodyColumnFeatures, getAlignStyle, isSimpleCell };
};
