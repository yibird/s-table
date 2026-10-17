import type { ColumnDef, Row, RowData, TableFeatures } from '@tanstack/vue-table';
import type { STableColumnMeta } from '../types/column';

/**
 * 内部列定义的最小结构接口。
 *
 * 用于组件内部注入的功能列（展开、选择、序号、拖拽等），
 * 只包含实际设置的字段，避免 `as unknown as ColumnDef` 散布于各 hook。
 */
interface InternalColumnInit<TData extends RowData> {
  /** 列唯一标识。 */
  id: string;
  /** 表头渲染函数。 */
  header: () => unknown;
  /** 单元格渲染函数。 */
  cell: (context: { row: Row<TableFeatures, TData> }) => unknown;
  /** 列宽（px）。 */
  size: number;
  /** 最小列宽（px）。 */
  minSize: number;
  /** 最大列宽（px）。 */
  maxSize: number;
  /** 禁止列宽拖拽。 */
  enableResizing: false;
  /** 自定义元数据（对齐方式等）。 */
  meta: STableColumnMeta;
  /** 列固定位置（可选）。 */
  fixed?: 'left' | 'right';
}

/**
 * 将内部列初始化对象转换为 TanStack `ColumnDef`。
 *
 * 这是全仓唯一的类型断言收敛点：TanStack v9 的 `ColumnDef` 是包含所有 feature
 * 字段（排序、过滤、分组、钉列……）的宽泛联合类型，内部注入列仅设置核心字段，
 * 因此需要一个显式断言桥接。注意该断言不校验字段完整性——上游增删 `ColumnDef`
 * 字段时不会在此编译报错，维护时需人工对照上游类型。
 */
export const toColumnDef = <TData extends RowData>(
  init: InternalColumnInit<TData>
): ColumnDef<TableFeatures, TData, unknown> => init as ColumnDef<TableFeatures, TData, unknown>;
