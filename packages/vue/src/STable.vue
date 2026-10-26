<template>
  <div
    ref="rootRef"
    :class="[
      's-table',
      `s-table-${size}`,
      {
        's-table-bordered': bordered,
        's-table-striped': striped,
        's-table-resizing': isColumnResizing,
        's-table-column-dragging': isColumnDragging,
        's-table-row-dragging': isRowDragging,
      },
    ]"
    @copy="handleCellRangeCopy"
    @keydown="handleCellRangeCopyShortcut"
  >
    <div v-if="$slots.title || title !== undefined" class="s-table-title">
      <slot v-if="$slots.title" name="title" :current-page-data="currentPageData" />
      <RenderVNode v-else :value="titleContent" />
    </div>
    <Pagination
      v-for="placement in topPaginationPlacements"
      :key="placement"
      v-bind="paginationState"
      :placement="placement"
      @change="handlePaginationChange"
    />
    <div class="s-table-scroll-shell">
      <div
        ref="scrollContainerRef"
        class="s-table-container"
        :tabindex="props.keyboardNavigation ? 0 : undefined"
        role="region"
        :aria-label="resolvedLocale.accessibility.table"
        @focus.self="focusFirstBodyCell"
      >
        <table :style="tableStyle">
          <colgroup>
            <template v-if="renderedColumns.length > 0">
              <col
                v-for="entry in renderedColumns"
                :key="entry.id"
                :span="entry.type === 'spacer' ? entry.colSpan : undefined"
                :style="
                  entry.type === 'spacer'
                    ? { width: `${entry.colSpan > 0 ? entry.width / entry.colSpan : 0}px` }
                    : getVisibleColumnStyle(entry.id)
                "
              />
            </template>
            <template v-else>
              <col
                v-for="column in visibleLeafColumns"
                :key="column.id"
                :style="column.hasExplicitWidth ? { width: `${column.size}px` } : undefined"
              />
            </template>
          </colgroup>
          <Header
            v-if="showHeader"
            :class="{ 's-table-header-fixed': fixedHeader }"
            :header-groups="headerGroups"
            :rendered-columns="renderedColumns"
          >
            <template v-if="$slots.filterPanel" #filterPanel="scope">
              <slot name="filterPanel" v-bind="scope" />
            </template>
          </Header>
          <Body
            class="s-table-body"
            :rows="rows"
            :top-rows="topRows"
            :center-rows="centerRows"
            :bottom-rows="bottomRows"
            :col-span="visibleLeafColumns.length || 1"
            :virtual-api="virtualApi"
            :editing-api="editingApi"
            :on-range-row-click="handleRowClick"
            :visible-column-ids="visibleColumnIds"
            :rendered-columns="renderedColumns"
            :tree-indent-size="treeIndentSize"
            :cell-render-token="cellRenderToken"
            :data-source-token="dataSource"
            :animate-row-drag="animateRowDrag"
            :render-expanded-row="Boolean($slots.expandedRowRender)"
            :row-class-name="props.rowClassName"
            :row-style="props.rowStyle"
            :custom-row="props.customRow"
            :custom-cell="props.customCell"
            :ignore-cell-key="props.ignoreCellKey"
            :row-drag-trigger="rowDragTrigger"
            :on-row-drag-start="handleRowDragStart"
            :on-navigate-cell="navigateCell"
            :is-row-selected="isRowSelected"
            :keyboard-navigation="props.keyboardNavigation"
            :fixed-header="fixedHeader"
            @row-context-menu="onRowContextMenu"
            @row-click="onRowClick"
            @row-double-click="onRowDoubleClick"
            @row-mouseenter="onRowMouseenter"
            @row-mouseleave="onRowMouseleave"
            @cell-click="onCellClick"
            @cell-double-click="onCellDoubleClick"
            @cell-context-menu="onCellContextMenu"
            @cell-mouseenter="onCellMouseenter"
            @cell-mouseleave="onCellMouseleave"
            @cell-keydown="onCellKeydown"
          >
            <template #empty>
              <slot name="empty" />
            </template>
            <template #emptyAction>
              <slot name="emptyAction" />
            </template>
            <template v-if="$slots.expandedRowRender" #expandedRowRender="scope">
              <slot
                name="expandedRowRender"
                :record="scope.record"
                :index="scope.index"
                :expanded="scope.expanded"
              />
            </template>
            <template v-if="$slots.cellEditor" #cellEditor="scope">
              <slot name="cellEditor" v-bind="scope" />
            </template>
            <template v-if="$slots.groupRow" #groupRow="scope">
              <slot name="groupRow" v-bind="scope" />
            </template>
          </Body>
          <ColumnFooter
            v-if="hasColumnFooter"
            :footer-groups="columnFooterGroups"
            :sticky="summaryFixed"
          />
          <Summary
            v-if="$slots.summary"
            :visible-leaf-columns="visibleLeafColumns"
            :sticky="summaryFixed"
          >
            <slot name="summary" />
          </Summary>
        </table>
        <div
          v-if="scrollToBottomEnabled"
          ref="scrollBottomSentinelRef"
          class="s-table-scroll-bottom-sentinel"
          aria-hidden="true"
        />
        <div v-if="isScrollToBottom && $slots.scrollToBottom" class="s-table-scroll-to-bottom">
          <slot name="scrollToBottom" />
        </div>
      </div>
      <div
        v-if="!bordered && hasFixedColumnLeftShadow"
        class="s-table-fixed-column-shadow s-table-fixed-column-shadow-left"
        :style="{ left: fixedColumnShadowStyles.left }"
        aria-hidden="true"
      />
      <div
        v-if="!bordered && hasFixedColumnRightShadow"
        class="s-table-fixed-column-shadow s-table-fixed-column-shadow-right"
        :style="{ right: fixedColumnShadowStyles.right }"
        aria-hidden="true"
      />
    </div>
    <Footer
      v-if="$slots.footer || footer !== undefined"
      :styles="styles?.footer"
      :classes="classes?.footer"
    >
      <slot v-if="$slots.footer" name="footer" v-bind="footerScope" />
      <RenderVNode v-else-if="footerContent !== undefined" :value="footerContent" />
    </Footer>
    <Pagination
      v-for="placement in bottomPaginationPlacements"
      :key="placement"
      v-bind="paginationState"
      :placement="placement"
      @change="handlePaginationChange"
    />
    <Loading v-if="loading">
      <slot name="loading" />
    </Loading>
    <ContextMenu
      v-if="$slots.contextMenu"
      :is-open="contextMenuOpen"
      :pos-x="contextMenuPosX"
      :pos-y="contextMenuPosY"
      :row="contextRow"
      :row-index="contextRowIndex"
      :close="closeContextMenu"
      :aria-label="resolvedLocale.accessibility.contextMenu"
      :theme-style="themeStyle"
      :trigger-node="rootRef"
      :get-popup-container="resolvePopupContainer"
    >
      <template #default="scope">
        <slot name="contextMenu" v-bind="scope" />
      </template>
    </ContextMenu>
  </div>
</template>
<script setup lang="ts" generic="TData extends RowData = RowData">
import {
  computed,
  isReactive,
  nextTick,
  provide,
  shallowRef,
  toRef,
  toRefs,
  useSlots,
  useTemplateRef,
  watch,
  type VNodeChild,
} from 'vue';
import { RenderVNode } from './ui/render-vnode';
import type { RowData, Table, TableFeatures } from '@tanstack/vue-table';
import { SizeContextKey } from './context/size';
import {
  TableBodyContextKey,
  TableHeaderContextKey,
  TablePresentationContextKey,
} from './context/table';
import {
  Header,
  Body,
  Footer,
  Summary,
  ColumnFooter,
  Pagination,
  Loading,
  ContextMenu,
} from './components';
import { walkColumnTree } from './utils/columnTree';
import { useBreakpoints } from './hooks/useBreakpoints';
import {
  useApi,
  useCellRangeBridge,
  useColumnState,
  useDataState,
  useEvents,
  useTableModel,
  useView,
  type STableSetupContext,
} from './setup';
import type { STableColumn, STableEmits, STableProps, STableSlots } from './types';
import { LocaleContextKey, defaultLocale, mergeLocale } from './locales';

const props = withDefaults(defineProps<STableProps<TData>>(), {
  dataSource: () => [],
  columns: () => [],
  size: 'middle',
  bordered: false,
  striped: false,
  loading: false,
  virtual: false,
  showHeader: true,
  fixedHeader: true,
  // VNodeChild 含 boolean，未声明 default 时 Vue 会把缺省值转成 false，
  // 使 `title !== undefined` / `footer !== undefined` 恒成立。
  title: undefined,
  footer: undefined,
  columnResizeMode: 'onEnd',
  paginationPlacement: 'bottomEnd',
  keyboardNavigation: true,
  summaryFixed: false,
  defaultBreakpoint: 'lg',
  locale: () => defaultLocale,
});
defineSlots<STableSlots<TData>>();
const emit = defineEmits<STableEmits<TData>>();
const slots = useSlots();
const resolvedLocale = computed(() => mergeLocale(props.locale));
const rootRef = useTemplateRef<HTMLElement>('rootRef');
/** 统一解析浮层容器；无效节点回退到触发元素所在文档的 body。 */
const resolvePopupContainer = (trigger: HTMLElement): HTMLElement => {
  const container = props.getPopupContainer?.(trigger);
  return container?.isConnected ? container : trigger.ownerDocument.body;
};
// props 的纯引用统一从一次 toRefs 获取；context 直接展开 propRefs，避免字段写两遍。
const propRefs = toRefs(props);
const { tree, columnDrag, size, styles, classes, breakpoints, defaultBreakpoint } = propRefs;
/** 没有任何 responsive 列时不需要订阅 resize。 */
const hasResponsiveColumns = computed(() => {
  let found = false;
  walkColumnTree(props.columns ?? [], (column) => {
    if (column.responsive !== undefined) found = true;
  });
  return found;
});
const { activeBreakpoint } = useBreakpoints(
  rootRef,
  breakpoints,
  defaultBreakpoint,
  hasResponsiveColumns
);

// 可选深度监听：默认继续要求不可变更新，避免大数组上的全量遍历开销。
const dataSourceRevision = shallowRef(0);
const columnRevision = shallowRef(0);
watch(
  () => (props.deepWatchDataSource ? props.dataSource : undefined),
  () => {
    dataSourceRevision.value++;
  },
  { deep: true }
);
watch(
  () => (props.deepWatchColumns ? props.columns : undefined),
  () => {
    columnRevision.value++;
  },
  { deep: true }
);

const treeIndentSize = computed(() => {
  if (!tree.value) return undefined;
  const indentSize = tree.value.indentSize;
  return typeof indentSize === 'number' && Number.isFinite(indentSize) && indentSize >= 0
    ? indentSize
    : 16;
});
const expandable = computed(() => props.expandable);
const rowDragEnabled = toRef(() => Boolean(props.rowDrag));
const rowDragConfig = toRef(() => {
  const value = props.rowDrag;
  if (typeof value === 'function') return { canDrag: value };
  return typeof value === 'object' ? value : undefined;
});
const animateRowDrag = toRef(() => rowDragConfig.value?.animation === true);
const animateColumnDrag = toRef(() => columnDrag.value?.animation === true);
/** 列拖拽开始前的权限判断；未配置 `canDrag` 时默认允许。 */
const canColumnDrag = (column: STableColumn<any>, columnIndex: number) =>
  columnDrag.value?.canDrag?.({ column, columnId: column.id, index: columnIndex }) !== false;
const dataSource = computed(() => {
  // deepWatchDataSource 开启时，嵌套字段原地修改通过 revision 使快照失效。
  dataSourceRevision.value.toString();
  // TanStack 按 data 根引用缓存行模型：仅为需要跟踪 push/splice 的 Vue 响应式数组建立快照，
  // 普通数组直接复用父级引用，避免每次替换数据都额外执行 O(n) 拷贝。
  const source = props.dataSource;
  // 非数组输入（null / undefined / Set / 字符串等）统一回退为空数组，避免下游崩溃。
  if (!Array.isArray(source)) {
    if (source != null && import.meta.env?.DEV) {
      console.warn('[STable] `dataSource` 必须是数组，已回退为空数组。');
    }
    return [];
  }
  return isReactive(source) ? [...source] : source;
});

// 选中 / 展开状态通过顶层 v-model 管理；
// 分页状态统一走 pagination 配置对象单一入口（对齐 Ant Design Vue）。
// 依赖 table 的 hook 通过闭包惰性取实例；shallowRef 避免代理 TanStack 内部 atoms。
const tableInstance = shallowRef<Table<TableFeatures, TData>>();
const getTable = () => tableInstance.value;

const context: STableSetupContext<TData> = {
  ...propRefs,
  props,
  emit,
  slots,
  resolvedLocale,
  dataSource,
  treeIndentSize,
  expandable,
  rowDragEnabled,
  rowDragConfig,
  animateColumnDrag,
  tableInstance,
  getTable,
  rootRef,
  classes,
};

// 数据模型状态：排序 / 过滤、编辑、导入、分页、选择、展开、分组、固定行。
const dataState = useDataState<TData>(context);
// 列模型状态：列拖拽、行拖拽句柄列、序号列、注入列与列归一化。
// 行拖拽通过闭包惰性读取行模型；`tableModel` 先声明后赋值，避免类型循环推断。
let tableModel!: ReturnType<typeof useTableModel<TData>>;
const columnState = useColumnState<TData>(context, dataState, {
  getRows: () => tableModel.rows.value,
  activeBreakpoint,
  columnRevision,
});
// TanStack Table 实例与派生行模型。
tableModel = useTableModel<TData>(context, dataState, columnState);
// 单元格框选桥接。
const cellRangeState = useCellRangeBridge<TData>(context, dataState, tableModel, columnState);
// 视图运行时：虚拟化、滚动、触底检测与固定列阴影。
// 滚动容器 ref 必须留在组件顶层，模板字符串 ref 才能解析。
const scrollContainerRef = useTemplateRef<HTMLElement>('scrollContainerRef');
const scrollBottomSentinelRef = useTemplateRef<HTMLElement>('scrollBottomSentinelRef');
const view = useView<TData>(context, dataState, tableModel, cellRangeState, {
  scrollContainerRef,
  scrollBottomSentinelRef,
});
/** 虚拟窗口边缘：滚动到目标行/列后重新聚焦对应单元格。 */
const navigateCell = (
  rowIndex: number,
  columnIndex: number,
  direction: 'up' | 'down' | 'left' | 'right'
): boolean => {
  const rows = tableModel.rows.value;
  const columns = tableModel.visibleColumnIds.value;
  const nextRow =
    direction === 'up' ? rowIndex - 1 : direction === 'down' ? rowIndex + 1 : rowIndex;
  const nextColumn =
    direction === 'left' ? columnIndex - 1 : direction === 'right' ? columnIndex + 1 : columnIndex;
  if (nextRow < 0 || nextRow >= rows.length || nextColumn < 0 || nextColumn >= columns.length) {
    return false;
  }
  view.scrollToIndex(nextRow);
  const columnId = columns[nextColumn];
  if (columnId) view.scrollToColumn(columnId);
  nextTick(() => {
    rootRef.value
      ?.querySelector<HTMLElement>(
        `tbody td[data-row-index="${nextRow}"][data-col-index="${nextColumn}"][tabindex]`
      )
      ?.focus();
  });
  return true;
};

/** 供标题 / 页脚渲染的当前页数据；manualPagination 直接使用外部数据源。 */
const currentPageData = computed<TData[]>(() => {
  if (props.manualPagination) return [...dataSource.value];
  const model = dataState.paginationEnabled.value
    ? tableModel.table.getPaginatedRowModel()
    : tableModel.table.getPrePaginatedRowModel();
  return model.flatRows.filter((row) => !row.getIsGrouped?.()).map((row) => row.original);
});

const footerScope = computed(() => ({
  currentPageData: currentPageData.value,
  currentPage: dataState.currentPage.value,
  pageSize: dataState.currentPageSize.value,
  total: dataState.paginationState.value.total,
}));

/** 标题 / 页脚共用：函数形式按当前作用域求值，其余按 VNode 原样返回。 */
const resolveSlotContent = <TScope>(
  value: VNodeChild | ((scope: TScope) => VNodeChild) | undefined,
  scope: TScope
): VNodeChild =>
  typeof value === 'function' ? (value as (scope: TScope) => VNodeChild)(scope) : value;

const titleContent = computed<VNodeChild>(() =>
  resolveSlotContent(props.title, { currentPageData: currentPageData.value })
);

const footerContent = computed<VNodeChild>(() =>
  resolveSlotContent(props.footer, footerScope.value)
);

const columnFooterGroups = computed(() => tableModel.table.getFooterGroups());
const hasColumnFooter = computed(() =>
  columnFooterGroups.value.some((group) =>
    group.headers.some(
      (header) => !header.isPlaceholder && header.column.columnDef.footer !== undefined
    )
  )
);

// 事件桥接与右键菜单。
const events = useEvents<TData>(context, dataState);
// 实例 API：defineExpose 的唯一出口。
const api = useApi<TData>({
  context,
  dataState,
  columnState,
  tableModel,
  cellRange: cellRangeState,
  view,
});
defineExpose(api);

// ── 模板绑定 ──
const {
  topPaginationPlacements,
  bottomPaginationPlacements,
  paginationState,
  handlePaginationChange,
  isRowSelected,
  filterState,
  searchState,
  toggleSort,
  setFilter,
  clearFilterByColumn,
  setSearch,
  clearSearchByColumn,
} = dataState;
const {
  isColumnResizing,
  headerGroups,
  rows,
  topRows,
  centerRows,
  bottomRows,
  visibleLeafColumns,
  visibleLeafColumnById,
  tableStyle,
  visibleColumnIds,
} = tableModel;
const {
  isColumnDragging,
  isRowDragging,
  cellRenderToken,
  columnOrder,
  dragColumnFromIndex,
  dragColumnOverIndex,
  handleColumnDragStart,
  handleColumnDragOver,
  handleColumnDragEnd,
  handleColumnOrderDrop,
  dragRowFromIndex,
  dragRowOverIndex,
  dragRowSourceIds,
  dragRowDropPosition,
  rowDragTrigger,
  handleRowDragStart,
  handleRowDragOver,
  handleRowDragEnd,
  handleRowDrop,
} = columnState;
const {
  focusFirstBodyCell,
  renderedColumns,
  virtualApi,
  editingApi,
  scrollToBottomEnabled,
  isScrollToBottom,
  hasFixedColumnLeftShadow,
  hasFixedColumnRightShadow,
  fixedColumnShadowStyles,
} = view;
const {
  handleCellRangeCopy,
  handleCellRangeCopyShortcut,
  handleRowClick,
  cellRange,
  isCellRangeDragging,
  handleCellMouseDown,
  handleCellMouseEnter,
  focusedCell,
} = cellRangeState;
const {
  contextMenuOpen,
  contextMenuPosX,
  contextMenuPosY,
  contextRow,
  contextRowIndex,
  closeContextMenu,
  themeStyle,
  onRowContextMenu,
  onRowClick,
  onRowDoubleClick,
  onRowMouseenter,
  onRowMouseleave,
  onCellClick,
  onCellDoubleClick,
  onCellContextMenu,
  onCellMouseenter,
  onCellMouseleave,
  onCellKeydown,
} = events;

/** 横向虚拟化的 colgroup 只查询窗口列；完整 ID 索引已在列模型同一次遍历中建立。 */
const getVisibleColumnStyle = (columnId: string) => {
  const column = visibleLeafColumnById.value.get(columnId);
  return column?.hasExplicitWidth ? { width: `${column.size}px` } : undefined;
};

// ── 上下文注入 ──
provide(SizeContextKey, size);

provide(TablePresentationContextKey, {
  styles,
  classes,
  getColumnById: (columnId: string) => columnState.getColumnById(columnId),
  fixedColumnStyles: tableModel.fixedColumnStyles,
  getPopupContainer: resolvePopupContainer,
  getCustomHeaderCell: (column) => props.customHeaderCell?.(column as STableColumn<TData>),
  getColumnDragGhost: (column, index) =>
    columnDrag.value?.ghost?.({
      column: column as STableColumn<TData>,
      columnId: column.id,
      index,
    }),
});

provide(TableHeaderContextKey, {
  filterState,
  searchState,
  onToggleSort: toggleSort,
  onSetFilter: setFilter,
  onClearFilter: clearFilterByColumn,
  onSetSearch: setSearch,
  onClearSearch: clearSearchByColumn,
  columnOrder,
  dragColumnFromIndex,
  dragColumnOverIndex,
  onColumnDragStart: handleColumnDragStart,
  onColumnDragOver: handleColumnDragOver,
  onColumnDragEnd: handleColumnDragEnd,
  onColumnDrop: handleColumnOrderDrop,
  animateColumnDrag,
  canColumnDrag,
  filterDropdownOpenKeys: toRef(() => props.filterDropdownOpenKeys),
  onFilterDropdownOpenChange: (columnId, open) => emit('filterDropdownOpenChange', columnId, open),
});

provide(TableBodyContextKey, {
  dragRowFromIndex,
  dragRowOverIndex,
  dragRowSourceIds,
  dragRowDropPosition,
  onRowDragOver: handleRowDragOver,
  onRowDragEnd: handleRowDragEnd,
  onRowDrop: handleRowDrop,
  // 框选
  cellRange,
  isCellRangeDragging,
  onCellRangeMousedown: handleCellMouseDown,
  onCellRangeMouseenter: handleCellMouseEnter,
  onCellRangeSelectAll: cellRangeState.selectAllCellRange,
  onCellRangeExtend: cellRangeState.extendCellRange,
  onCellRangeClear: () => cellRangeState.clearCellRangeAt(),
  cellRangeMode: toRef(() => context.cellRangeSelection.value?.mode),
  getFocusedCell: () => focusedCell.value,
});

provide(LocaleContextKey, {
  locale: resolvedLocale,
});
</script>
