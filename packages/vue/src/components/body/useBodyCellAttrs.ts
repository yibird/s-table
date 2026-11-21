import { computed, type ComputedRef, type CSSProperties } from 'vue';
import type { Cell, RowData, TableFeatures } from '@tanstack/vue-table';
import type { STableColumn } from '../../types';
import { splitTableAttrs, type SplitTableAttrs } from '../../utils/mergeTableAttrs';

/** Body 级属性派生：每轮响应式求值只调用一次可见单元格的 customCell。 */
export const useBodyCellAttrs = <TData extends RowData>(options: {
  getCustomCell: () =>
    | ((
        record: TData,
        rowIndex: number,
        column: STableColumn<TData>
      ) => Record<string, unknown> | undefined)
    | undefined;
  getColumnById: (columnId: string) => STableColumn<TData> | undefined;
  getBodyCellClass: () => string | undefined;
  getBodyCellStyle: () => CSSProperties | undefined;
}) => {
  const bodyCellClass = computed(options.getBodyCellClass);
  const bodyCellStyle = computed<CSSProperties | undefined>(() => {
    const style = options.getBodyCellStyle();
    // 浅快照让原地修改的样式仍有可供 DOM patch 比较的前值。
    return style !== undefined ? { ...style } : undefined;
  });

  const customCellAttrs = new WeakMap<
    Cell<TableFeatures, TData>,
    { rowIndex: number; attrs: ComputedRef<SplitTableAttrs | undefined> }
  >();
  const getCustomCellAttrs = (cell: Cell<TableFeatures, TData>, rowIndex: number) => {
    if (!options.getCustomCell()) return undefined;
    let entry = customCellAttrs.get(cell);
    if (!entry || entry.rowIndex !== rowIndex) {
      entry = {
        rowIndex,
        // 缓存派生而非结果，回调身份和闭包中的 ref 在每次求值时持续追踪。
        attrs: computed(() => {
          const customCell = options.getCustomCell();
          const column = options.getColumnById(cell.column.id);
          return customCell && column
            ? splitTableAttrs(customCell(cell.row.original, rowIndex, column))
            : undefined;
        }),
      };
      customCellAttrs.set(cell, entry);
    }
    return entry.attrs.value;
  };

  return { bodyCellClass, bodyCellStyle, getCustomCellAttrs };
};
