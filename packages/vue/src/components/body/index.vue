<template>
  <tbody
    ref="tbodyRef"
    :class="[
      's-table-body',
      { 's-table-cell-range-dragging': ctx.isCellRangeDragging },
      tableCtx.classes?.body,
    ]"
    :style="tableCtx.styles?.body"
    @click="handleBodyClick"
    @contextmenu="handleBodyContextmenu"
    @dragover="handleBodyDragover"
    @drop.prevent="handleRowDrop"
    @dragend="ctx.onRowDragEnd()"
    @mouseover="handleBodyMouseover"
    @mouseout="handleBodyMouseout"
    @mousedown="handleBodyMousedown"
    @dblclick="handleBodyDblclick"
    @keydown="handleBodyKeydown"
  >
    <tr v-if="rows.length === 0">
      <td :colspan="colSpan" class="s-table-cell s-table-empty-cell">
        <Empty>
          <slot name="empty" />
          <template #action>
            <slot name="emptyAction" />
          </template>
        </Empty>
      </td>
    </tr>
    <template v-for="item in renderItems" :key="item.key">
      <tr
        v-if="
          virtualApi?.enabled &&
          virtualApi.topSpacerHeight > 0 &&
          item.sectionIndex === 0 &&
          (item.section === 'center' || (item.section === 'bottom' && renderedCenterCount === 0))
        "
        aria-hidden="true"
      >
        <td
          :colspan="colSpan"
          class="s-table-cell s-table-virtual-spacer-cell"
          :style="{ height: virtualApi.topSpacerHeight + 'px', contain: 'strict' }"
        />
      </tr>
      <tr
        v-if="
          virtualApi?.enabled &&
          virtualApi.bottomSpacerHeight > 0 &&
          item.section === 'bottom' &&
          item.sectionIndex === 0
        "
        aria-hidden="true"
      >
        <td
          :colspan="colSpan"
          class="s-table-cell s-table-virtual-spacer-cell"
          :style="{ height: virtualApi.bottomSpacerHeight + 'px', contain: 'strict' }"
        />
      </tr>
      <tr
        v-memo="[
          item.row,
          item.index,
          item.flags,
          tableCtx.fixedColumnStyles,
          visibleColumnIds,
          props.treeIndentSize,
          props.treeIndentBasePadding,
          props.cellRenderToken,
          item.rangeMemoKey,
          ctx.cellRangeMode,
          bodyColumnFeatures.onCellMap,
          bodyColumnFeatures.alignStyleById,
          bodyCellClass,
          bodyCellStyle,
          item.editMemoKey,
          ctx.dragRowDropPosition,
          item.rowClass,
          item.rowStyle,
          item.pinnedStyle,
        ]"
        :ref="item.ref"
        :data-index="item.dataIndex"
        :data-row-index="item.index"
        :data-row-id="item.row.id"
        :data-row-key="item.publicRowKey"
        :class="[
          's-table-row',
          item.rowClass,
          {
            's-table-row-selected': item.flags & ROW_FLAG_SELECTED,
            's-table-row-expanded': item.flags & ROW_FLAG_EXPANDED,
            's-table-row-grouped': item.flags & ROW_FLAG_GROUPED,
            's-table-row-pinned': item.pinnedPosition,
            's-table-row-pinned-top': item.pinnedPosition === 'top',
            's-table-row-pinned-bottom': item.pinnedPosition === 'bottom',
            's-table-row-drag-source': item.flags & ROW_FLAG_DRAG_SOURCE,
            's-table-row-drag-over': item.flags & ROW_FLAG_DRAG_TARGET,
            's-table-row-drag-over-before':
              item.flags & ROW_FLAG_DRAG_TARGET && ctx.dragRowDropPosition === 'before',
            's-table-row-drag-over-after':
              item.flags & ROW_FLAG_DRAG_TARGET && ctx.dragRowDropPosition === 'after',
            's-table-row-drag-over-inside':
              item.flags & ROW_FLAG_DRAG_TARGET && ctx.dragRowDropPosition === 'inside',
          },
        ]"
        :style="[item.rowStyle, item.pinnedStyle]"
      >
        <td
          v-if="item.flags & ROW_FLAG_GROUPED && $slots.groupRow"
          :colspan="colSpan"
          class="s-table-cell s-table-group-row-cell"
        >
          <slot name="groupRow" v-bind="getGroupRowContext(item.row)" />
        </td>
        <template v-else>
          <template v-for="entry in getRenderedCells(item.row)" :key="entry.id">
            <td
              v-if="isColumnSpacer(entry)"
              class="s-table-cell s-table-column-virtual-spacer"
              :colspan="entry.colSpan"
              :style="{ width: `${entry.width}px`, padding: 0, border: 0 }"
              aria-hidden="true"
            />
            <td
              v-else-if="entry.getIsGrouped()"
              :class="[
                's-table-cell',
                's-table-group-cell',
                getFixedClassName(entry.column.id),
                bodyCellClass,
              ]"
              :style="[
                getFixedStyle(entry.column.id),
                getAlignStyle(entry.column.id),
                bodyCellStyle,
              ]"
              :data-row-index="item.index"
              :data-col-index="getColIndex(entry.column.id)"
              :data-row-id="entry.row.id"
              :data-column-id="entry.column.id"
              :tabindex="keyboardNavigation ? -1 : undefined"
            >
              <button
                type="button"
                :class="[
                  's-table-expand-trigger',
                  { 's-table-expand-trigger-expanded': item.flags & ROW_FLAG_EXPANDED },
                ]"
                :aria-label="locale.accessibility.expandTrigger"
                :aria-expanded="Boolean(item.flags & ROW_FLAG_EXPANDED)"
                @click.stop="item.row.toggleExpanded()"
              >
                <ExpandIcon />
              </button>
              <span class="s-table-group-cell-value">
                <CachedCellContent :state="getCellRenderState(entry, item)" />
              </span>
              <span class="s-table-group-cell-count">({{ getGroupLeafCount(item.row) }})</span>
            </td>
            <td
              v-else-if="isSimpleCell(entry.column.id)"
              :class="[
                's-table-cell',
                getFixedClassName(entry.column.id),
                cellRangeEnabled ? getRangeClasses(entry, item) : undefined,
                bodyCellClass,
              ]"
              :style="[
                getFixedStyle(entry.column.id),
                getAlignStyle(entry.column.id),
                getTreeIndentStyle(entry, item.row),
                bodyCellStyle,
              ]"
              :data-row-index="item.index"
              :data-col-index="getColIndex(entry.column.id)"
              :data-row-id="entry.row.id"
              :data-column-id="entry.column.id"
              :tabindex="keyboardNavigation ? -1 : undefined"
            >
              <CachedCellContent :state="getCellRenderState(entry, item)" />
            </td>
            <BodyCell
              v-else
              :cell="entry"
              :record="item.row.original"
              :row-key="item.publicRowKey"
              :row-index="item.index"
              :col-index="getColIndex(entry.column.id)"
              :fixed-class-name="getFixedClassName(entry.column.id)"
              :fixed-style="getFixedStyle(entry.column.id)"
              :align-style="getAlignStyle(entry.column.id)"
              :tree-indent-style="getTreeIndentStyle(entry, item.row)"
              :range-classes="cellRangeEnabled ? getRangeClasses(entry, item) : undefined"
              :resolve-cell-props="bodyColumnFeatures.onCellMap.get(entry.column.id)"
              :body-cell-class="bodyCellClass"
              :body-cell-style="bodyCellStyle"
              :editing="isCellEditing(item.editMemoKey, entry.column.id)"
              :edit-value="item.editMemoKey?.values[entry.column.id]"
              :editor-type="getEditorType(entry.column.id)"
              :commit-on-blur="editingApi?.commitOnBlur"
              :raw-column="getRawColumn(entry.column.id)"
              :focusable="keyboardNavigation"
              :on-set-edit-value="editingApi?.onSetValue"
              :on-commit-edit="editingApi?.onCommit"
              :on-cancel-edit="editingApi?.onCancel"
              :cell-render-state="getCellRenderState(entry, item)"
            >
              <template v-if="$slots.cellEditor" #editor="scope">
                <slot name="cellEditor" v-bind="scope" />
              </template>
            </BodyCell>
          </template>
        </template>
      </tr>
      <tr
        v-if="props.renderExpandedRow && item.flags & ROW_FLAG_EXPANDED"
        :ref="item.expandedRef"
        class="s-table-expanded-row"
      >
        <td :colspan="colSpan" class="s-table-expanded-cell">
          <slot
            name="expandedRowRender"
            :record="item.row.original"
            :index="item.index"
            :expanded="true"
          />
        </td>
      </tr>
    </template>
    <tr
      v-if="virtualApi?.enabled && virtualApi.bottomSpacerHeight > 0 && bottomRows.length === 0"
      aria-hidden="true"
    >
      <td
        :colspan="colSpan"
        class="s-table-cell s-table-virtual-spacer-cell"
        :style="{ height: virtualApi.bottomSpacerHeight + 'px', contain: 'strict' }"
      />
    </tr>
  </tbody>
</template>
<script lang="ts" setup generic="TData extends RowData = RowData">
import { computed, proxyRefs, toRefs, useTemplateRef, type CSSProperties } from 'vue';
import Empty from '../empty/index.vue';
import type { Cell, Row, RowData, TableFeatures } from '@tanstack/vue-table';
import type { BodyEditingApi, BodyVirtualApi } from './api';
import type { STableEditingState, STableSlots } from '../../types';
import { injectTableBodyContext, injectTablePresentationContext } from '../../context/table';
import { useLocales } from '../../hooks/useLocales';
import { createFixedColumnStyleAccessors } from '../../hooks/useFixedColumnModel';
import { useFlipDropAnimation } from '../../hooks/useFlipAnimation';
import BodyCell from './BodyCell.vue';
import CachedCellContent from './CachedCellContent';
import { createCellRenderCache } from './cellRenderCache';
import { useBodyEventDelegation, type BodyEventMap } from './useBodyEventDelegation';
import { useBodyRowRendering } from './useBodyRowRendering';
import { usePinnedRowMeasurements } from './usePinnedRowMeasurements';
import type { STableRenderedColumn } from '../../hooks/useColumnVirtual';
import ExpandIcon from '../icon/ExpandIcon.vue';
import { createCellRangePresentation } from './useCellRangePresentation';
import {
  useRowRenderItems,
  type RenderItem,
  ROW_FLAG_SELECTED,
  ROW_FLAG_EXPANDED,
  ROW_FLAG_DRAG_SOURCE,
  ROW_FLAG_DRAG_TARGET,
  ROW_FLAG_GROUPED,
} from './useRowRenderItems';
import { useBodyColumnFeatures } from './useBodyColumnFeatures';
import { useEditingFocus } from './useEditingFocus';

/** 虚拟滚动 API（父层预计算直传，保持热路径稳定性）。 */
const props = withDefaults(
  defineProps<{
    rows?: Row<TableFeatures, TData>[];
    topRows?: Row<TableFeatures, TData>[];
    centerRows?: Row<TableFeatures, TData>[];
    bottomRows?: Row<TableFeatures, TData>[];
    colSpan?: number;
    /** 虚拟滚动 API（enabled / items / spacers / 测量函数）。 */
    virtualApi?: BodyVirtualApi;
    /** 编辑 API（状态快照 / 提交 / 取消）。 */
    editingApi?: BodyEditingApi;
    /** 行点击回调（row 模式）。 */
    onRangeRowClick?: (rowIndex: number) => void;
    /** 可见列 ID 列表（用于列索引查找）。 */
    visibleColumnIds?: string[];
    /** 树节点每层缩进宽度；未启用树形数据时为 undefined。 */
    treeIndentSize?: number;
    /** 当前尺寸下业务单元格原有的行内起始 padding。 */
    treeIndentBasePadding?: number;
    /** 仅在叶子列单元格渲染器变化时更新的稳定 token。 */
    cellRenderToken?: ReadonlyMap<string, readonly unknown[]>;
    /** 数据数组身份变化时失效 Cell context；普通表格状态变化保持稳定。 */
    dataSourceToken?: readonly TData[];
    /** 是否启用行拖拽排序动画（FLIP）。 */
    animateRowDrag?: boolean;
    /** 是否渲染详情兄弟行。 */
    renderExpandedRow?: boolean;
    rowClassName?: string | ((record: TData, rowIndex: number) => string | undefined);
    rowStyle?: CSSProperties | ((record: TData, rowIndex: number) => CSSProperties | undefined);
    isRowSelected?: (row: Row<TableFeatures, TData>) => boolean;
    renderedColumns?: STableRenderedColumn[];
    keyboardNavigation?: boolean;
    fixedHeader?: boolean;
  }>(),
  {
    rows: () => [],
    topRows: () => [],
    centerRows: () => [],
    bottomRows: () => [],
    colSpan: 1,
    virtualApi: undefined,
    editingApi: undefined,
    visibleColumnIds: () => [],
    treeIndentBasePadding: 16,
    cellRenderToken: () => new Map(),
    dataSourceToken: () => [],
    animateRowDrag: false,
    renderExpandedRow: false,
    renderedColumns: () => [],
    keyboardNavigation: true,
    fixedHeader: false,
  }
);

// Context 只在顶层解包 Ref，避免把列、样式和 TanStack 对象递归代理成深层 Proxy。
const tablePresentationContext = injectTablePresentationContext<TData>();
const tableCtx = proxyRefs(tablePresentationContext);
const ctx = proxyRefs(injectTableBodyContext());
const locale = useLocales();
const tbodyRef = useTemplateRef<HTMLTableSectionElement>('tbodyRef');
const { topRows, bottomRows, fixedHeader } = toRefs(props);

/** 主行共用稳定函数 ref，避免虚拟窗口每次变化都让仍在屏内的行重复注销和测量。 */
const mainElementRef = (el: unknown) => props.virtualApi?.measureElement(el as Element | null);
const expandedElementRefCache = new WeakMap<Row<TableFeatures, TData>, (el: unknown) => void>();

/** 每个 TanStack Row 只创建一次详情行 ref；WeakMap 让缓存随 Row 模型自动回收。 */
const getExpandedElementRef = (row: Row<TableFeatures, TData>) => {
  const cached = expandedElementRefCache.get(row);
  if (cached) return cached;
  const rowId = row.id;
  const elementRef = (el: unknown) =>
    props.virtualApi?.measureExpandedElement(rowId, el as Element | null);
  expandedElementRefCache.set(row, elementRef);
  return elementRef;
};

defineSlots<
  Pick<
    STableSlots<TData>,
    'empty' | 'emptyAction' | 'expandedRowRender' | 'cellEditor' | 'groupRow'
  >
>();

const emit = defineEmits<BodyEventMap<TData>>();

const { getPinnedStyle } = usePinnedRowMeasurements({
  tbodyRef,
  topRows,
  bottomRows,
  fixedHeader,
  enabled: computed(() => topRows.value.length > 0 || bottomRows.value.length > 0),
});

const { getRangeClasses, getRowRangeMemoKey } = createCellRangePresentation<TData>({
  getCellRange: () => ctx.cellRange,
  getCellRangeMode: () => ctx.cellRangeMode,
  getFocusedCell: () => ctx.getFocusedCell(),
});

const { renderItems } = useRowRenderItems<TData>({
  props,
  getDragRowFromIndex: () => ctx.dragRowFromIndex,
  getDragRowOverIndex: () => ctx.dragRowOverIndex,
  getPinnedStyle,
  getRowRangeMemoKey,
  mainElementRef,
  getExpandedElementRef,
});

const renderedCenterCount = computed(() =>
  props.virtualApi?.enabled ? props.virtualApi.items.length : props.centerRows.length
);

const { getFixedClassName, getFixedStyle } = createFixedColumnStyleAccessors(
  tablePresentationContext.fixedColumnStyles,
  'body'
);

// 行渲染辅助逻辑（树缩进、列索引、分组行、可见单元格）见 useBodyRowRendering。
const {
  getTreeIndentStyle,
  getColIndex,
  isColumnSpacer,
  getGroupLeafCount,
  getGroupRowContext,
  getRenderedCells,
} = useBodyRowRendering<TData>({
  props,
  getColumnById: (columnId) => tableCtx.getColumnById(columnId),
});

const {
  handleBodyClick,
  handleBodyContextmenu,
  handleBodyDblclick,
  handleBodyDragover,
  handleBodyKeydown,
  handleBodyMousedown,
  handleBodyMouseout,
  handleBodyMouseover,
} = useBodyEventDelegation<TData>({
  getRows: () => props.rows,
  getColumnIndex: getColIndex,
  getKeyboardNavigation: () => props.keyboardNavigation,
  getCellRangeMode: () => ctx.cellRangeMode,
  getDragRowFromIndex: () => ctx.dragRowFromIndex,
  getOnRangeRowClick: () => props.onRangeRowClick,
  onCellRangeMousedown: (rowId, columnId, event) =>
    ctx.onCellRangeMousedown(rowId, columnId, event),
  onCellRangeMouseenter: (rowId, columnId, event) =>
    ctx.onCellRangeMouseenter(rowId, columnId, event),
  onRowDragOver: (rowIndex, event) => ctx.onRowDragOver(rowIndex, event),
  emit,
});

/** 是否启用框选（cell 或 row 模式）。关闭时热路径完全不进入 range class 计算。 */
const cellRangeEnabled = computed(() => ctx.cellRangeMode !== undefined);

const { bodyColumnFeatures, getAlignStyle, isSimpleCell } = useBodyColumnFeatures<TData>({
  getVisibleColumnIds: () => props.visibleColumnIds,
  getColumnById: (columnId) => tableCtx.getColumnById(columnId),
});

/** body cell 语义化 class / style（从 context 提取一次，避免每格读取）。 */
const bodyCellClass = computed(() => tableCtx.classes?.bodyCell);
const bodyCellStyle = computed(() => {
  const style = tableCtx.styles?.bodyCell;
  // v-memo 按引用比较；生成只在样式字段变化时更新的浅快照，兼容父级原地修改 style。
  return style !== undefined ? { ...style } : undefined;
});

const getEditorType = (columnId: string) => tableCtx.getColumnById(columnId)?.editor ?? 'text';
const getRawColumn = (columnId: string) => tableCtx.getColumnById(columnId);
const getCellRenderer = (cell: Cell<TableFeatures, TData>) => {
  const columnDef = cell.column.columnDef;
  if (cell.getIsAggregated?.()) return columnDef.aggregatedCell ?? columnDef.cell;
  if (cell.getIsPlaceholder?.()) return undefined;
  return columnDef.cell;
};
const getCellRenderToken = (columnId: string) => props.cellRenderToken.get(columnId);
const resolveCellRenderState = createCellRenderCache<TData>();
const getCellRenderState = (cell: Cell<TableFeatures, TData>, item: RenderItem<TData>) =>
  resolveCellRenderState(cell, {
    render: getCellRenderer(cell),
    columnToken: getCellRenderToken(cell.column.id),
    columnSetToken: props.visibleColumnIds,
    dataSourceToken: props.dataSourceToken,
    rowIndex: item.index,
  });
const isCellEditing = (editing: STableEditingState | null, columnId: string): boolean =>
  Boolean(
    editing &&
    (editing.mode === 'row' || editing.columnId === columnId) &&
    columnId in editing.values
  );

useEditingFocus({
  getEditingState: () => props.editingApi?.state ?? null,
  getVirtualItems: () => props.virtualApi?.items ?? [],
  tbodyRef,
});

// ==================== 行拖拽排序动画（FLIP） ====================

const { handleDrop: handleRowDrop } = useFlipDropAnimation({
  containerRef: tbodyRef,
  selector: '.s-table-row[data-row-key]',
  axis: 'y',
  getKey: (el) => el.dataset.rowKey,
  canAnimate: () =>
    props.animateRowDrag &&
    ctx.dragRowFromIndex >= 0 &&
    ctx.dragRowOverIndex >= 0 &&
    ctx.dragRowFromIndex !== ctx.dragRowOverIndex,
  onDrop: () => ctx.onRowDrop(),
});
</script>
