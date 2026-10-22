import { inject, type InjectionKey, type Ref } from 'vue';
import type { RowData } from '@tanstack/vue-table';
import type { STableFixedColumnStyle } from '../utils/columnMetrics';
import type { STableColumn } from '../types';
import type { STableCellRange, STableClasses, STableStyles, STableDropPosition } from '../types';

type FilterValue = string | number | boolean;

/** 展示层共享依赖：样式、列查询和固定列布局。 */
export interface TablePresentationContext<TData extends RowData = RowData> {
  styles: Readonly<Ref<STableStyles | undefined>>;
  classes: Readonly<Ref<STableClasses | undefined>>;
  getColumnById: (columnId: string) => STableColumn<TData> | undefined;
  fixedColumnStyles: Readonly<Ref<Map<string, STableFixedColumnStyle>>>;
  /** 解析浮层挂载容器；始终返回有效节点（默认 body）。 */
  getPopupContainer: (triggerNode: HTMLElement) => HTMLElement;
  /** customHeaderCell 解析器。 */
  getCustomHeaderCell?: (column: STableColumn<any>) => Record<string, unknown> | undefined;
  /** 列拖拽自定义预览解析器。 */
  getColumnDragGhost?: (
    column: STableColumn<any>,
    index: number
  ) => import('vue').VNodeChild | HTMLElement | null | undefined;
}

/** 表头只消费排序/筛选和列拖拽状态。 */
export interface TableHeaderContext {
  filterState: Readonly<Ref<Map<string, FilterValue[]>>>;
  searchState: Readonly<Ref<Map<string, string>>>;
  onToggleSort: (columnId: string, multi?: boolean) => void;
  onSetFilter: (columnId: string, values: FilterValue[]) => void;
  onClearFilter: (columnId: string) => void;
  onSetSearch: (columnId: string, value: string) => void;
  onClearSearch: (columnId: string) => void;
  columnOrder: Readonly<Ref<string[]>>;
  dragColumnFromIndex: Readonly<Ref<number | undefined>>;
  dragColumnOverIndex: Readonly<Ref<number | undefined>>;
  onColumnDragStart: (columnIndex: number) => void;
  onColumnDragOver: (columnIndex: number, event: DragEvent) => void;
  onColumnDragEnd: () => void;
  onColumnDrop: () => void | Promise<void>;
  animateColumnDrag: Readonly<Ref<boolean>>;
  /** 列拖拽开始前的权限判断；返回 false 阻止该列拖拽。 */
  canColumnDrag: (column: STableColumn<any>, columnIndex: number) => boolean;
  /** 受控筛选面板打开列集合；undefined 表示由各面板内部维护。 */
  filterDropdownOpenKeys: Readonly<Ref<string[] | undefined>>;
  /** 筛选面板请求切换打开状态（受控与内部模式都会派发）。 */
  onFilterDropdownOpenChange: (columnId: string, open: boolean) => void;
}

/** 表体只消费行拖拽和框选状态。 */
export interface TableBodyContext {
  dragRowFromIndex: Readonly<Ref<number>>;
  dragRowOverIndex: Readonly<Ref<number>>;
  /** 本次拖拽实际移动的行 id（多选时为整块），用于整块高亮。 */
  dragRowSourceIds: Readonly<Ref<ReadonlySet<string>>>;
  dragRowDropPosition: Readonly<Ref<STableDropPosition>>;
  onRowDragOver: (rowIndex: number, event: DragEvent) => void;
  onRowDragEnd: () => void;
  onRowDrop: () => void | Promise<void>;
  cellRange: Readonly<Ref<STableCellRange | null>>;
  isCellRangeDragging: Readonly<Ref<boolean>>;
  onCellRangeMousedown: (rowId: string, columnId: string, event: MouseEvent) => void;
  onCellRangeMouseenter: (rowId: string, columnId: string, event?: MouseEvent) => void;
  /** Ctrl/Cmd+A 全选当前行模型中的可选单元格。 */
  onCellRangeSelectAll: () => void;
  /** Shift+方向键扩展框选。 */
  onCellRangeExtend: (direction: 'up' | 'down' | 'left' | 'right') => void;
  /** Escape 清除框选。 */
  onCellRangeClear: () => void;
  cellRangeMode: Readonly<Ref<'cell' | 'row' | undefined>>;
  /** 当前 TanStack 框选焦点的稳定坐标，仅用于精确失效焦点所在行。 */
  getFocusedCell: () => { rowId: string; columnId: string } | undefined;
}

export const TablePresentationContextKey: InjectionKey<TablePresentationContext<any>> = Symbol(
  'STablePresentationContext'
);
export const TableHeaderContextKey: InjectionKey<TableHeaderContext> =
  Symbol('STableHeaderContext');
export const TableBodyContextKey: InjectionKey<TableBodyContext> = Symbol('STableBodyContext');

const injectRequired = <T>(key: InjectionKey<T>, name: string): T => {
  const context = inject(key);
  if (!context) {
    throw new Error(`[STable] 缺少 ${name}，请确认在 STable 内部使用子组件。`);
  }
  return context;
};

export const injectTablePresentationContext = <TData extends RowData = RowData>() =>
  injectRequired(
    TablePresentationContextKey,
    'TablePresentationContext'
  ) as TablePresentationContext<TData>;

export const injectTableHeaderContext = () =>
  injectRequired(TableHeaderContextKey, 'TableHeaderContext');

export const injectTableBodyContext = () => injectRequired(TableBodyContextKey, 'TableBodyContext');
