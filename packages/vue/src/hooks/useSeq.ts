import { computed, h, type Ref, type VNodeChild } from 'vue';
import type { ColumnDef, Row, RowData, TableFeatures } from '@tanstack/vue-table';
import type { STableSeq } from '../types';
import { SEQ_COLUMN_ID } from '../constants';
import { toColumnDef } from '../utils';
import { getRowVisibleIndex } from '../adapter/tableDisplayOrder';

/** 序号列默认宽度（px）。 */
const DEFAULT_WIDTH = 60;

type UseSTableSeqOptions<TData extends RowData> = {
  /** 序号列配置（来自 props.seq）。 */
  seq: Readonly<Ref<boolean | STableSeq<TData> | undefined>>;
  /** 当前页码（1 起）。 */
  currentPage: Readonly<Ref<number>>;
  /** 当前每页条数。 */
  currentPageSize: Readonly<Ref<number>>;
  /** 是否启用分页。 */
  paginationEnabled: Readonly<Ref<boolean>>;
  /** 当前语言包中的默认序号列表头。 */
  defaultTitle: Readonly<Ref<string>>;
};

/** 从 seq 配置解析出配置对象；未启用返回 null。 */
const resolveConfig = <TData extends RowData>(
  value: boolean | STableSeq<TData> | undefined
): STableSeq<TData> | null => {
  if (value === true) return {};
  if (typeof value === 'object' && value !== null) return value;
  return null;
};

/**
 * 内置序号列 hook。
 *
 * 在表格左侧注入一个自增序号列，序号与分页联动：
 * - 分页 + `paginate: true`：序号 = startIndex + (page-1)×pageSize + 当前页内偏移。
 *   客户端分页时行模型已是当前页切片；服务端分页时 dataSource 即当前页数据，
 *   两者都按 (page-1)×pageSize 加页内偏移，得到跨页连续序号。
 * - `paginate: false` 或未分页：序号 = startIndex + 行在当前渲染集合中的偏移。
 */
export const useSeq = <TData extends RowData>({
  seq,
  currentPage,
  currentPageSize,
  paginationEnabled,
  defaultTitle,
}: UseSTableSeqOptions<TData>) => {
  const config = computed(() => resolveConfig(seq.value));

  // 分页偏移：仅在开启分页联动时按 (page-1)×pageSize 计算跨页连续序号。
  const pageOffset = computed(() => {
    const c = config.value;
    if (!c) return 0;
    const paginate = c.paginate ?? true;
    if (!paginate || !paginationEnabled.value) return 0;
    return Math.max(0, currentPage.value - 1) * currentPageSize.value;
  });

  const seqColumn = computed<ColumnDef<TableFeatures, TData, unknown> | undefined>(() => {
    const c = config.value;
    if (!c) return undefined;

    const columnWidth =
      typeof c.columnWidth === 'number' && Number.isFinite(c.columnWidth) && c.columnWidth > 0
        ? c.columnWidth
        : DEFAULT_WIDTH;
    const align = c.align ?? 'center';
    const isFixed = c.fixed ?? true;
    const startIndex = c.startIndex ?? 1;
    // 捕获并追踪渲染器引用，支持业务侧原地替换函数后精确刷新单元格。
    const renderCell = c.renderCell;

    // 单元格 / 表头统一套一层带对齐样式的容器：body 默认左对齐，序号列通常需要居中，
    // 这里直接内联 text-align，避免依赖未实现 align 的通用单元格样式。
    /** 使用统一容器与对齐样式包装序号列内容。 */
    const wrap = (content: unknown) =>
      h('div', { class: 's-table-seq-cell', style: { textAlign: align } }, [content as VNodeChild]);

    /** 计算并渲染当前行的连续序号。 */
    const cellRenderer = (context: { row: Row<TableFeatures, TData> }) => {
      const row = context.row;
      // 当前单元格一定来自最终行模型；-1 仅作为第三方 feature 产生异常行时的保守回退。
      const visibleIndex = getRowVisibleIndex(row);
      const offsetInPage = visibleIndex < 0 ? row.index : visibleIndex;
      const serial = startIndex + pageOffset.value + offsetInPage;
      if (typeof renderCell === 'function') return wrap(renderCell(serial, row.original));
      return wrap(serial);
    };

    return toColumnDef({
      id: SEQ_COLUMN_ID,
      header: () => wrap(c.title ?? defaultTitle.value),
      cell: cellRenderer,
      size: columnWidth,
      minSize: columnWidth,
      maxSize: columnWidth,
      enableResizing: false,
      enableCellSelection: false,
      meta: { align },
      ...(isFixed && { fixed: 'left' as const }),
    });
  });

  return { seqColumn };
};
