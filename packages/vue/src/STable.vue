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
    <Pagination
      v-if="showPaginationTop"
      v-bind="paginationState"
      :placement="resolvedPaginationPlacement"
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
            :class="['s-table-header', { 's-table-header-fixed': fixedHeader }]"
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
            :tree-indent-base-padding="treeIndentBasePadding"
            :cell-render-token="cellRenderToken"
            :data-source-token="dataSource"
            :animate-row-drag="animateRowDrag"
            :render-expanded-row="Boolean($slots.expandedRowRender)"
            :row-class-name="props.rowClassName"
            :row-style="props.rowStyle"
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
          <Summary v-if="$slots.summary" :visible-leaf-columns="visibleLeafColumns">
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
    <Footer v-if="showFooter" :styles="styles?.footer" :classes="resolvedClasses?.footer">
      <slot name="footer" />
    </Footer>
    <Pagination
      v-if="showPaginationBottom"
      v-bind="paginationState"
      :placement="resolvedPaginationPlacement"
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
  provide,
  shallowRef,
  toRef,
  toRefs,
  useSlots,
  useTemplateRef,
} from 'vue';
import type { RowData, Table, TableFeatures } from '@tanstack/vue-table';
import { SizeContextKey } from './context/size';
import {
  TableBodyContextKey,
  TableHeaderContextKey,
  TablePresentationContextKey,
} from './context/table';
import { Header, Body, Footer, Summary, Pagination, Loading, ContextMenu } from './components';
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
import type { STableEmits, STableProps, STableSlots } from './types';
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
  showFooter: false,
  columnResizeMode: 'onEnd',
  paginationPlacement: 'bottomEnd',
  keyboardNavigation: true,
  locale: () => defaultLocale,
});
defineSlots<STableSlots<TData>>();
const emit = defineEmits<STableEmits<TData>>();
const slots = useSlots();
const resolvedLocale = computed(() => mergeLocale(props.locale));
const rootRef = useTemplateRef<HTMLElement>('rootRef');

// props 的纯引用统一从一次 toRefs 获取；context 直接展开 propRefs，避免字段写两遍。
const propRefs = toRefs(props);
const { tree, columnDrag, size, styles, classNames, classes } = propRefs;

// `classNames` 是对齐 Ant Design v5 的推荐命名；`classes` 保留兼容，两者同时提供时 `classNames` 优先。
const resolvedClasses = computed(() => classNames.value ?? classes.value);
const treeIndentSize = computed(() => {
  if (!tree.value) return undefined;
  const indentSize = tree.value.indentSize;
  return typeof indentSize === 'number' && Number.isFinite(indentSize) && indentSize >= 0
    ? indentSize
    : 16;
});
const treeIndentBasePadding = computed(() => {
  if (size.value === 'small') return 12;
  if (size.value === 'large') return 20;
  return 16;
});
const expandable = computed(() => props.expandable ?? (tree.value ? {} : undefined));
const rowDragEnabled = toRef(() => Boolean(props.rowDrag));
const rowDragConfig = toRef(() => (typeof props.rowDrag === 'object' ? props.rowDrag : undefined));
const animateRowDrag = toRef(() => rowDragConfig.value?.animation === true);
const animateColumnDrag = toRef(() => columnDrag.value?.animation === true);
const dataSource = computed(() => {
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
  treeIndentBasePadding,
  expandable,
  rowDragEnabled,
  rowDragConfig,
  animateColumnDrag,
  tableInstance,
  getTable,
  rootRef,
  classes: resolvedClasses,
};

// 数据模型状态：排序 / 过滤、编辑、导入、分页、选择、展开、分组、固定行。
const dataState = useDataState<TData>(context);
// 列模型状态：列拖拽、行拖拽句柄列、序号列、注入列与列归一化。
// 行拖拽通过闭包惰性读取行模型；`tableModel` 先声明后赋值，避免类型循环推断。
let tableModel!: ReturnType<typeof useTableModel<TData>>;
const columnState = useColumnState<TData>(context, dataState, {
  getRows: () => tableModel.rows.value,
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
  showPaginationTop,
  showPaginationBottom,
  resolvedPaginationPlacement,
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
  dragRowDropPosition,
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
  classes: resolvedClasses,
  getColumnById: (columnId: string) => columnState.getColumnById(columnId),
  fixedColumnStyles: tableModel.fixedColumnStyles,
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
});

provide(TableBodyContextKey, {
  dragRowFromIndex,
  dragRowOverIndex,
  dragRowDropPosition,
  onRowDragOver: handleRowDragOver,
  onRowDragEnd: handleRowDragEnd,
  onRowDrop: handleRowDrop,
  // 框选
  cellRange,
  isCellRangeDragging,
  onCellRangeMousedown: handleCellMouseDown,
  onCellRangeMouseenter: handleCellMouseEnter,
  cellRangeMode: toRef(() => context.cellRangeSelection.value?.mode),
  getFocusedCell: () => focusedCell.value,
});

provide(LocaleContextKey, {
  locale: resolvedLocale,
});
</script>
