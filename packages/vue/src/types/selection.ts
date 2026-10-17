import type { RowData } from '@tanstack/table-core';
import type { CSSProperties, VNodeChild } from 'vue';
import type { STableRowKey, STableSelectionType } from '@zchengfeng/s-table-core';

// 自定义选择项配置
export interface STableSelectionOption<TData extends RowData = RowData> {
  /**
   * @description 自定义选择项的唯一标识。
   */
  key: string;
  /**
   * @description 自定义选择项的显示文本。
   */
  text: VNodeChild;
  /**
   * @description 点击自定义选择项时的回调。
   */
  onSelect?: (selectedRowKeys: STableRowKey[], selectedRows: TData[]) => void;
}

// 选择列对齐方式
export type STableSelectionColumnAlign = 'left' | 'center' | 'right';

// 选择变化信息
export interface STableSelectionChangeInfo {
  /**
   * @description 触发选择变化的类型。
   */
  type: 'all' | 'none' | 'invert' | 'single' | 'multiple';
}

// 选择框属性
export interface STableCheckboxProps {
  /**
   * @description 是否禁用。
   */
  disabled?: boolean;
  /**
   * @description 是否选中。
   */
  checked?: boolean;
  /**
   * @description 是否为半选状态。
   */
  indeterminate?: boolean;
  /**
   * @description 自定义类名。
   */
  class?: string;
  /**
   * @description 自定义内联样式。
   */
  style?: CSSProperties;
}

// 表格行选择（配置项）。
// 选中状态用顶层 `v-model:selectedRowKeys` 管理（见 STableProps）；此处仅保留「选择列的行为配置」。
export interface STableRowSelection<TData extends RowData> {
  /**
   * @description 表格选择类型。
   * @default 'checkbox'
   */
  type?: STableSelectionType;
  /**
   * @description `keys` 物化所有选中 key；`intent` 用 all+excluded/include+included 表达大规模选择。
   * @default 'keys'
   */
  strategy?: 'keys' | 'intent';
  /**
   * @description 选择列的对齐方式。
   * @default 'center'
   */
  align?: STableSelectionColumnAlign;
  /**
   * @description 选择列的宽度。Checkbox 模式默认 62（含下拉菜单），Radio / 隐藏全选模式默认 52。
   * @default 62 | 52
   */
  columnWidth?: number | string;
  /**
   * @description 是否固定选择列。
   * @default true
   */
  fixed?: boolean;
  /**
   * @description 是否隐藏全选复选框和自定义选择。
   * @default false
   */
  hideSelectAll?: boolean;
  /**
   * @description 追加到表头批量选择菜单的自定义操作项。
   */
  selections?: STableSelectionOption<TData>[];
  /**
   * @description 当数据行从 dataSource 中移除时，是否保留其选中状态。
   * @default false
   */
  preserveSelectedRowKeys?: boolean;
  /**
   * @description 获取每行 Checkbox / Radio 的属性。
   */
  getCheckboxProps?: (record: TData) => STableCheckboxProps;
  /**
   * @description 获取表头全选 Checkbox 的属性。
   */
  getTitleCheckboxProps?: () => STableCheckboxProps;
  /**
   * @description 自定义渲染选择列单元格。
   */
  renderCell?: (
    checked: boolean,
    record: TData,
    index: number,
    originNode: VNodeChild
  ) => VNodeChild;
}

// 表格样式语义化
export interface STableStyles {
  /**
   * @description 表格头样式。
   */
  header?: CSSProperties;
  /**
   * @description 表格体样式。
   */
  body?: CSSProperties;
  /**
   * @description 表格尾部样式。
   */
  footer?: CSSProperties;
  /**
   * @description 表格汇总行样式。
   */
  summary?: CSSProperties;

  /**
   * @description 表格头单元格样式。
   */
  headerCell?: CSSProperties;
  /**
   * @description 表格头单元格标题样式。
   */
  headerCellTitle?: CSSProperties;
  /**
   * @description 表格体单元格样式。
   */
  bodyCell?: CSSProperties;
  /**
   * @description 表格汇总行单元格样式。
   */
  summaryCell?: CSSProperties;
}

// 表格class语义化
export interface STableClasses {
  /**
   * @description 表格头类名。
   */
  header?: string;
  /**
   * @description 表格体类名。
   */
  body?: string;
  /**
   * @description 表格尾部类名。
   */
  footer?: string;
  /**
   * @description 表格汇总行类名。
   */
  summary?: string;
  /**
   * @description 表格头单元格类名。
   */
  headerCell?: string;
  /**
   * @description 表格头单元格标题类名。
   */
  headerCellTitle?: string;
  /**
   * @description 表格体单元格类名。
   */
  bodyCell?: string;
  /**
   * @description 表格汇总行单元格类名。
   */
  summaryCell?: string;
}
