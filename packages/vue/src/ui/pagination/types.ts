import type { VNodeChild } from 'vue';
import type { SComponentSize } from '../../context/size';

/** 分页可渲染的条目类型。 */
export type STablePaginationItemType = 'page' | 'prev' | 'next' | 'jump-prev' | 'jump-next';

/** 自定义分页条目渲染。返回 undefined 时使用默认节点。 */
export type STablePaginationItemRender = (
  page: number,
  type: STablePaginationItemType,
  originalElement: VNodeChild,
  info: { current: number; totalPages: number }
) => VNodeChild;

export interface PaginationProps {
  /** 当前页码 */
  current?: number;
  /** 每页条数 */
  pageSize?: number;
  /** 数据总数 */
  total?: number;
  /** 尺寸（Context Size > 此属性） */
  size?: SComponentSize;
  /** 禁用 */
  disabled?: boolean;
  /** 紧凑模式：更小尺寸与间距，适用于工具栏等空间受限场景 */
  compact?: boolean;
  /** 是否显示快速跳转 */
  showQuickJumper?: boolean;
  /** 是否显示每页条数切换器 */
  showSizeChanger?: boolean;
  /** 用于显示数据总量和当前范围 */
  showTotal?: (total: number, range: [number, number]) => string;
  /** 每页条数选项 */
  pageSizeOptions?: number[];
  /** 快速跳转前缀文本 */
  jumpToText?: string;
  /** 页码单位文本 */
  pageText?: string;
  /** 每页条数单位文本 */
  itemsPerPageText?: string;
  /** 内部选择器占位文本 */
  selectPlaceholder?: string;
  /** 内部选择器空状态文本 */
  selectEmptyText?: string;
  /** 简洁模式：仅上一页/下一页与当前页信息。 */
  simple?: boolean;
  /** 页码窗口更小时只显示当前页附近的少量页码。 */
  showLessItems?: boolean;
  /** 只有一页时隐藏整个分页器。 */
  hideOnSinglePage?: boolean;
  /** 自定义分页条目渲染。 */
  itemRender?: STablePaginationItemRender;
}
