import { computed, type CSSProperties, type Ref, type ShallowRef } from 'vue';
import type { ColumnSizingState, RowData, Table, TableFeatures } from '@tanstack/vue-table';
import { isColumnVirtualEnabled, type STableVirtualValue } from '../utils';
import { useRafValue } from './useRafValue';
import { useFixedColumnModel } from './useFixedColumnModel';

/**
 * 未声明宽度的列在空间不足时的最小宽度。
 *
 * `table-layout: fixed` 会把剩余宽度分给自动列；当固定/注入列已经占满容器时，
 * 自动列会被压到接近 0，文字逐字竖排。保留一个可读下限，让表格改为内部横向滚动。
 */
const MIN_AUTO_COLUMN_WIDTH = 100;

/** 可见叶子列的布局度量。 */
export type STableVisibleLeafColumn = {
  id: string;
  size: number;
  hasExplicitWidth: boolean;
};

/**
 * 可见叶子列度量：宽度、固定宽度标记、sticky CSS 变量与表格根样式。
 *
 * 列宽变化只更新 table 根节点样式，单元格持有稳定的 `var(...)` 引用，
 * 因此不会让每个可见行的 v-memo 失效。
 */
export const useColumnMetrics = <TData extends RowData>(options: {
  table: Table<TableFeatures, TData>;
  columnSizing: Readonly<Ref<ColumnSizingState>>;
  explicitWidthIds: Readonly<Ref<ReadonlySet<string>>>;
  explicitMinWidth: Readonly<Ref<number>>;
  getVirtual: () => STableVirtualValue;
  shouldRafSyncSizing: Readonly<Ref<boolean>>;
}) => {
  const {
    table,
    columnSizing,
    explicitWidthIds,
    explicitMinWidth,
    getVirtual,
    shouldRafSyncSizing,
  } = options;

  /** 计算可见叶子列的宽度及其固定宽度标记。 */
  const calculateVisibleLeafColumnModel = () => {
    const sizing = columnSizing.value;
    const widthIds = explicitWidthIds.value;
    // getVisibleLeafColumns() 不包含 pinning 重排；组合官方三区域 API，确保 colgroup、Body
    // 和 cellSelectionFeature 使用完全相同的实际视觉列顺序。
    const columns: STableVisibleLeafColumn[] = [];
    const byId = new Map<string, STableVisibleLeafColumn>();
    let totalSize = 0;
    const appendColumns = (entries: ReturnType<typeof table.getVisibleLeafColumns>) => {
      for (const column of entries) {
        const size = column.getSize();
        totalSize += size;
        // 是否需要固定 <col> 宽度：显式设宽的列，或被用户拖拽调整过宽度（存在于 columnSizing）的列。
        // 未设宽且未调整的列留空，由 table-layout:fixed 平分容器剩余宽度。
        const item: STableVisibleLeafColumn = {
          id: column.id,
          size,
          hasExplicitWidth: widthIds.has(column.id) || column.id in sizing,
        };
        columns.push(item);
        byId.set(item.id, item);
      }
    };
    appendColumns(table.getStartVisibleLeafColumns());
    appendColumns(table.getCenterVisibleLeafColumns());
    appendColumns(table.getEndVisibleLeafColumns());
    return { columns, byId, totalSize };
  };

  // watch 自动追踪 getter 内的全部依赖，避免手动依赖清单漏报导致值陈旧。
  const visibleLeafColumnModel = useRafValue(calculateVisibleLeafColumnModel, {
    enabled: shouldRafSyncSizing,
  }) as ShallowRef<ReturnType<typeof calculateVisibleLeafColumnModel>>;
  const visibleLeafColumns = computed(() => visibleLeafColumnModel.value.columns);
  const visibleLeafColumnById = computed(() => visibleLeafColumnModel.value.byId);

  // sticky 偏移放在 table 根节点的 CSS 变量中；单元格只持有稳定的 var(...) 样式。
  const { fixedColumnModel, fixedColumnStyles } = useFixedColumnModel<TData>({
    table,
    shouldRafSyncSizing,
  });

  const tableStyle = computed<CSSProperties>(() => {
    const columnVirtual = isColumnVirtualEnabled(getVirtual());
    const virtualWidth = columnVirtual ? visibleLeafColumnModel.value.totalSize : 0;
    // 横向虚拟化时总宽度已包含自动列；普通模式下需要为自动列保留最小可读宽度。
    const autoColumnCount = columnVirtual
      ? 0
      : visibleLeafColumnModel.value.columns.reduce(
          (count, column) => count + (column.hasExplicitWidth ? 0 : 1),
          0
        );
    const autoMinWidth = autoColumnCount * MIN_AUTO_COLUMN_WIDTH;
    return {
      width: virtualWidth > 0 ? `${virtualWidth}px` : '100%',
      minWidth: `${Math.max(explicitMinWidth.value + autoMinWidth, virtualWidth)}px`,
      ...fixedColumnModel.value.variables,
    } as CSSProperties;
  });

  return { visibleLeafColumns, visibleLeafColumnById, tableStyle, fixedColumnStyles };
};
