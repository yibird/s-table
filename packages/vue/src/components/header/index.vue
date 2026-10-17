<template>
  <thead
    ref="theadRef"
    :class="['s-table-header', presentation.classes?.header]"
    :style="presentation.styles?.header"
    @mousedown="handleMouseDragCandidate"
    @dragstart="clearMouseDrag"
  >
    <tr v-for="(row, rowIndex) in renderRows" :key="rowIndex">
      <template v-for="cell in row" :key="cell.key">
        <th
          v-if="cell.type === 'spacer'"
          class="s-table-cell s-table-column-virtual-spacer"
          :colspan="cell.colSpan"
          :style="{ width: `${cell.width}px`, padding: 0, border: 0 }"
          aria-hidden="true"
        />
        <HeaderCell
          v-else
          :header="cell.header"
          :col-span="cell.colSpan"
          :row-span="cell.rowSpan"
          :fixed-class-name="getFixedClassName(cell.header.column.id)"
          :fixed-style="getFixedStyle(cell.header.column.id)"
          :show-resizer="cell.showResizer"
          :user-column-index="getUserColumnIndex(cell.header.column.id)"
          @column-drag-start="handleCellDragStart"
          @column-drag-over="handleCellDragOver"
          @column-drag-end="ctx.onColumnDragEnd?.()"
          @column-drop="handleColumnDrop"
        >
          <template v-if="$slots.filterPanel" #filterPanel="scope">
            <slot name="filterPanel" v-bind="scope" />
          </template>
        </HeaderCell>
      </template>
    </tr>
  </thead>
</template>

<script lang="ts" setup generic="TData extends RowData = RowData">
import { computed, proxyRefs, useTemplateRef } from 'vue';
import type { HeaderGroup, RowData, TableFeatures } from '@tanstack/vue-table';
import { injectTableHeaderContext, injectTablePresentationContext } from '../../context/table';
import { createFixedColumnStyleAccessors } from '../../utils/columnMetrics';
import { useFlipDropAnimation } from '../../interaction/useFlipAnimation';
import HeaderCell from './HeaderCell.vue';
import { useMouseColumnDragBridge } from './useMouseColumnDragBridge';
import type { STableSlots } from '../../types';
import type { STableRenderedColumn } from '../../types';

const props = withDefaults(
  defineProps<{
    headerGroups?: HeaderGroup<TableFeatures, TData>[];
    renderedColumns?: STableRenderedColumn[];
  }>(),
  {
    headerGroups: () => [],
    renderedColumns: () => [],
  }
);
defineSlots<Pick<STableSlots<TData>, 'filterPanel'>>();

// 仅解包顶层 Ref，避免 header/column 实例被 Vue 深层代理。
const presentationContext = injectTablePresentationContext<TData>();
const presentation = proxyRefs(presentationContext);
const ctx = proxyRefs(injectTableHeaderContext());

// ==================== 列拖拽排序动画（FLIP） ====================

const theadRef = useTemplateRef<HTMLTableSectionElement>('theadRef');

const { handleDrop: handleColumnDrop } = useFlipDropAnimation({
  containerRef: theadRef,
  selector: 'th[data-column-id]',
  axis: 'x',
  getKey: (el) => el.getAttribute('data-column-id') ?? undefined,
  canAnimate: () =>
    ctx.animateColumnDrag &&
    (ctx.dragColumnFromIndex ?? -1) >= 0 &&
    (ctx.dragColumnOverIndex ?? -1) >= 0 &&
    ctx.dragColumnFromIndex !== ctx.dragColumnOverIndex,
  onDrop: () => ctx.onColumnDrop(),
});

const { handleMouseDragCandidate, clearMouseDrag } = useMouseColumnDragBridge({
  isDraggableSource: (columnId) =>
    presentation.getColumnById(columnId)?.draggable === true && getUserColumnIndex(columnId) >= 0,
  isValidTarget: (columnId) => getUserColumnIndex(columnId) >= 0,
  onDragStart: (columnId) => handleCellDragStart(columnId),
  onDragOver: (columnId, event) => handleCellDragOver(columnId, event),
  onDragEnd: () => ctx.onColumnDragEnd(),
  onDrop: (target) => target.dispatchEvent(new Event('drop', { cancelable: true })),
});

const { getFixedClassName, getFixedStyle } = createFixedColumnStyleAccessors(
  presentationContext.fixedColumnStyles,
  'header'
);

interface HeaderRenderCell {
  type: 'header';
  key: string;
  header: HeaderGroup<TableFeatures, TData>['headers'][number];
  colSpan: number;
  rowSpan: number;
  showResizer: boolean;
}
interface HeaderSpacerCell {
  type: 'spacer';
  key: string;
  colSpan: number;
  width: number;
}

type TableHeader = HeaderGroup<TableFeatures, TData>['headers'][number];

/**
 * 分组表头到叶子列的投影只随 headerGroups 变化；横向滚动仅改变渲染窗口，
 * 不应为每一帧重复遍历完整表头树。
 */
const headersByLeafId = computed(() => {
  const result: Array<Map<string, TableHeader>> = [];
  for (const group of props.headerGroups) {
    const map = new Map<string, TableHeader>();
    for (const header of group.headers) {
      for (const leaf of header.column.getLeafColumns()) map.set(leaf.id, header);
      if (header.column.columns.length === 0) map.set(header.column.id, header);
    }
    result.push(map);
  }
  return result;
});

/**
 * 稳定版已计算不等深表头的 colSpan/rowSpan。rowSpan 为 0 表示该 header 已被上方
 * placeholder 覆盖；保留 rowSpan 大于 0 的 placeholder，HeaderCell 会用其叶子列内容渲染。
 */
const renderRows = computed<Array<Array<HeaderRenderCell | HeaderSpacerCell>>>(() => {
  const lastVisibleLeafId = props.headerGroups[0]?.headers[0]?.table
    .getVisibleLeafColumns()
    .at(-1)?.id;
  const rows: Array<Array<HeaderRenderCell | HeaderSpacerCell>> = [];
  for (let groupIndex = 0; groupIndex < props.headerGroups.length; groupIndex++) {
    const group = props.headerGroups[groupIndex]!;
    if (props.renderedColumns.length > 0) {
      const headerByLeafId = headersByLeafId.value[groupIndex]!;
      const virtualCells: Array<HeaderRenderCell | HeaderSpacerCell> = [];
      for (const entry of props.renderedColumns) {
        if (entry.type === 'spacer') {
          virtualCells.push({
            type: 'spacer',
            key: `${group.id}:${entry.id}`,
            colSpan: entry.colSpan,
            width: entry.width,
          });
          continue;
        }
        const header = headerByLeafId.get(entry.id);
        if (!header || header.rowSpan <= 0) continue;
        const previous = virtualCells.at(-1);
        if (previous?.type === 'header' && previous.header.id === header.id) {
          previous.colSpan += 1;
          continue;
        }
        virtualCells.push({
          type: 'header',
          key: `${group.id}:${header.id}:${virtualCells.length}`,
          header,
          colSpan: 1,
          rowSpan: header.rowSpan,
          showResizer:
            header.column.columns.length === 0 &&
            header.column.getCanResize() &&
            header.column.id !== lastVisibleLeafId,
        });
      }
      rows.push(virtualCells);
      continue;
    }
    const cells: HeaderRenderCell[] = [];
    for (const header of group.headers) {
      if (header.rowSpan <= 0) continue;
      cells.push({
        type: 'header',
        key: header.id,
        header,
        colSpan: header.colSpan,
        rowSpan: header.rowSpan,
        showResizer:
          header.column.columns.length === 0 &&
          header.column.getCanResize() &&
          header.column.id !== lastVisibleLeafId,
      });
    }
    rows.push(cells);
  }
  return rows;
});

// ==================== 列拖拽索引映射 ====================

/**
 * 用户列 ID → 用户列索引的映射（排除注入列如拖拽句柄、选择列等）。
 */
const userColumnIndexMap = computed(() => {
  const map = new Map<string, number>();
  for (let index = 0; index < ctx.columnOrder.length; index++) {
    const id = ctx.columnOrder[index];
    if (id) map.set(id, index);
  }
  return map;
});

/**
 * 将表头列 ID 映射为用户列索引（跳过注入列）。
 */
const getUserColumnIndex = (columnId: string): number => {
  return userColumnIndexMap.value.get(columnId) ?? -1;
};

/**
 * HeaderCell emit 的 columnDragStart → 映射为用户列索引后调用 Context 回调。
 */
const handleCellDragStart = (columnId: string) => {
  const userIndex = getUserColumnIndex(columnId);
  if (userIndex >= 0) ctx.onColumnDragStart(userIndex);
};

/**
 * HeaderCell emit 的 columnDragOver → 映射为用户列索引后调用 Context 回调。
 */
const handleCellDragOver = (columnId: string, event: DragEvent) => {
  const userIndex = getUserColumnIndex(columnId);
  if (userIndex >= 0) ctx.onColumnDragOver(userIndex, event);
};
</script>
