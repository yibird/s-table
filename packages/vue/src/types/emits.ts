import type { RowData } from '@tanstack/table-core';
import type {
  STablePinnedRowKeys,
  STableRowKey,
  STableSelectionIntent,
} from '@zchengfeng/s-table-core';
import type {
  STableCellEvent,
  STableCellRange,
  STableColumnOrderChangeEvent,
  STableColumnResizeEvent,
  STableEditPatch,
  STableEditingState,
  STableRowEvent,
  STableRowOrderChangeEvent,
  STableSelectionChangeInfo,
  STableSortItem,
  STableSortOrder,
} from './features';

export type STableEmits<TData extends RowData = RowData> = {
  // ==================== v-model 状态更新 ====================
  /** 编辑、导入或行拖拽完成后的不可变数据源更新。 */
  'update:dataSource': [dataSource: TData[]];
  /** `v-model:selectedRowKeys` 更新事件。 */
  'update:selectedRowKeys': [keys: STableRowKey[]];
  /** `v-model:selectionIntent` 更新事件。 */
  'update:selectionIntent': [intent: STableSelectionIntent];
  /** 选择意图变化事件；不会物化全量 keys/rows。 */
  selectionIntentChange: [intent: STableSelectionIntent, info: STableSelectionChangeInfo];
  /** 选中变化事件（含选中行数据与变化类型）。 */
  selectChange: [keys: STableRowKey[], rows: TData[], info: STableSelectionChangeInfo];
  /** `v-model:expandedRowKeys` 更新事件。 */
  'update:expandedRowKeys': [keys: STableRowKey[]];
  /** `v-model:groupBy` 更新事件。 */
  'update:groupBy': [groupBy: string[]];
  /** 分组列变化事件。 */
  groupByChange: [groupBy: string[]];
  /** `v-model:pinnedRowKeys` 更新事件。 */
  'update:pinnedRowKeys': [keys: Required<STablePinnedRowKeys>];
  /** 固定行变化事件。 */
  pinnedRowsChange: [keys: Required<STablePinnedRowKeys>];
  /** `v-model:sorting` 更新事件。 */
  'update:sorting': [sorting: STableSortItem[]];
  /** `v-model:editing` 更新事件。 */
  'update:editing': [editing: STableEditingState | null];
  /** 展开/收起单行事件。 */
  expandChange: [expanded: boolean, record: TData];
  /** 列宽拖拽开始事件。 */
  columnResizeStart: [payload: STableColumnResizeEvent<TData>];
  /** 列宽拖拽结束事件。 */
  columnResizeEnd: [payload: STableColumnResizeEvent<TData>];
  /** 单元格框选范围变化事件。 */
  cellRangeChange: [range: STableCellRange | null];
  /** 单元格框选完成事件，包含框选范围和对应数据。 */
  cellRangeSelect: [range: STableCellRange, records: TData[]];
  /** 滚动触底事件。当滚动容器底部距离可视区域小于 `scrollToBottomOffset` 时触发。 */
  scrollToBottom: [];
  /** 列拖拽排序完成事件。 */
  columnOrderChange: [payload: STableColumnOrderChangeEvent<TData>];
  /** 行拖拽排序完成事件。 */
  rowOrderChange: [payload: STableRowOrderChangeEvent<TData>];
  /**
   * 排序变化事件（服务端排序模式下用于请求后端排序数据）。
   * 无排序时 `columnId` / `order` 为 `null`。
   * `reason` 标识变化来源：`user` 为用户交互，`column-removed` 为排序列被移除后的被动清除。
   */
  sortChange: [
    payload: {
      columnId: string | null;
      order: STableSortOrder | null;
      sorting: STableSortItem[];
      reason: 'user' | 'column-removed';
    },
  ];
  /**
   * 过滤变化事件（服务端过滤模式下用于请求后端过滤数据）。
   * `filters` 为 `列 id → 选中过滤值数组`，`searches` 为 `列 id → 搜索词`；
   * 两者均为空对象时表示没有过滤条件。
   */
  filterChange: [
    payload: {
      filters: Record<string, (string | number | boolean)[]>;
      searches: Record<string, string>;
    },
  ];
  /** 筛选面板打开状态变化事件。 */
  filterDropdownOpenChange: [columnId: string, open: boolean];
  /** 分页变化事件（服务端分页模式下用于请求后端分页数据）。 */
  pageChange: [payload: { page: number; pageSize: number }];
  /** 行/单元格原生交互事件。 */
  rowClick: [payload: STableRowEvent<TData, MouseEvent>];
  rowDoubleClick: [payload: STableRowEvent<TData, MouseEvent>];
  rowContextMenu: [payload: STableRowEvent<TData, MouseEvent>];
  rowMouseenter: [payload: STableRowEvent<TData, MouseEvent>];
  rowMouseleave: [payload: STableRowEvent<TData, MouseEvent>];
  cellClick: [payload: STableCellEvent<TData, MouseEvent>];
  cellDoubleClick: [payload: STableCellEvent<TData, MouseEvent>];
  cellContextMenu: [payload: STableCellEvent<TData, MouseEvent>];
  cellMouseenter: [payload: STableCellEvent<TData, MouseEvent>];
  cellMouseleave: [payload: STableCellEvent<TData, MouseEvent>];
  /** 编辑生命周期。 */
  editStart: [editing: STableEditingState, record: TData];
  editChange: [editing: STableEditingState, record: TData];
  editCommit: [editing: STableEditingState, record: TData, nextRecord: TData];
  /** 增量编辑提交；不会替换 dataSource 根引用。 */
  editPatch: [patch: STableEditPatch<TData>];
  editCancel: [editing: STableEditingState, record: TData];
  editValidateError: [message: string | undefined, editing: STableEditingState, record: TData];
  /** 单元格键盘事件。 */
  cellKeydown: [payload: STableCellEvent<TData, KeyboardEvent>];
};
