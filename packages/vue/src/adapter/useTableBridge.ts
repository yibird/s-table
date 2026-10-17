/**
 * TanStack Table ↔ Vue 响应式桥接层。
 *
 * 将所有 `table.atoms.*` 访问收敛到此模块，使业务代码统一消费
 * TanStack v9 稳定版公开的只读 atom API。
 */
import { computed } from 'vue';
import type {
  CellSelectionState,
  ColumnSizingState,
  Table,
  TableFeatures,
  RowData,
} from '@tanstack/vue-table';

// 模块级空值常量：computed 回退时复用同一引用，避免每次求值分配新对象，
// 把「未变化」伪装成引用变化传播给下游。
const EMPTY_CELL_SELECTION = [] as unknown as CellSelectionState;
const EMPTY_COLUMN_SIZING = {} as ColumnSizingState;

/**
 * 为 TanStack Table 实例创建 Vue 响应式桥接层。
 *
 * 所有 `table.atoms.*.get()` 调用收敛于此；业务代码只消费返回的 ComputedRef。
 *
 * @param table TanStack Table 实例。
 * @returns 类型安全的 computed refs 集合。
 */
export const useTableAtoms = <TData extends RowData>(table: Table<TableFeatures, TData>) => {
  // v9 稳定版将只读派生 atoms 作为公开类型暴露；业务层不穿透 baseAtoms 或私有字段。
  const atoms = table.atoms;

  return {
    cellSelection: computed(() => atoms?.cellSelection?.get() ?? EMPTY_CELL_SELECTION),
    columnSizing: computed(() => atoms?.columnSizing?.get() ?? EMPTY_COLUMN_SIZING),
    columnResizing: computed(() => atoms?.columnResizing?.get() ?? null),
  };
};
