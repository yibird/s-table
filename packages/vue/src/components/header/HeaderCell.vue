<template>
  <th
    ref="thRef"
    :data-column-id="header.column.id"
    :class="[
      's-table-cell',
      fixedClassName,
      {
        's-table-header-cell-drag-source':
          dragColumnFromIndex != null &&
          dragColumnFromIndex >= 0 &&
          userColumnIndex === dragColumnFromIndex,
        's-table-header-cell-drag-over':
          dragColumnOverIndex != null &&
          dragColumnOverIndex >= 0 &&
          userColumnIndex === dragColumnOverIndex,
        's-table-cell-drag-column': header.column.id === DRAG_COLUMN_ID,
      },
      classes?.headerCell,
      customAttrs?.class,
    ]"
    v-bind="customAttrs?.attrs"
    :colspan="colSpan"
    :rowspan="rowSpan"
    :aria-sort="ariaSort"
    :title="headerTitle"
    :style="[fixedStyle, alignStyle, styles?.headerCell, customAttrs?.style]"
    :draggable="rawCol?.draggable === true ? 'true' : undefined"
    @dragstart="onDragStart"
    @dragover.prevent="onDragOver"
    @dragend="onDragEnd"
    @drop.prevent="emit('columnDrop')"
  >
    <template v-if="rowSpan > 0">
      <div class="s-table-cell-inner">
        <div
          class="s-table-cell-title"
          :class="[
            {
              's-table-cell-title-sortable': !!rawCol?.sorter,
              's-table-cell-title-ellipsis': !!rawCol?.ellipsis,
            },
            classes?.headerCellTitle,
          ]"
          :style="styles?.headerCellTitle"
          :role="rawCol?.sorter ? 'button' : undefined"
          :tabindex="rawCol?.sorter ? 0 : undefined"
          @click="handleToggleSort"
          @keydown.enter.self.prevent="handleToggleSort"
          @keydown.space.self.prevent="handleToggleSort"
        >
          <FlexRender :header="header" />
        </div>
        <Sort
          v-if="rawCol?.sorter"
          :sorter="true"
          :sort-order="sortOrder"
          :on-toggle-sort="handleToggleSort"
        />
        <Filter
          v-if="columnFilters || columnFilterMode === 'custom'"
          :column-id="header.column.id"
          :filters="columnFilters"
          :filtered-values="filteredValues"
          :filter-mode="columnFilterMode"
          :filter-multiple="columnFilterMultiple"
          :filter-icon="filterIcon"
          :filter-dropdown-open="rawCol?.filterDropdownOpen"
          :on-confirm="handleFilterConfirm"
          :on-reset="handleFilterReset"
        >
          <template v-if="$slots.filterPanel" #custom="scope">
            <slot
              name="filterPanel"
              :column="rawCol!"
              :column-id="header.column.id"
              :selected-keys="scope.selectedKeys"
              :set-selected-keys="scope.setSelectedKeys"
              :confirm="scope.confirm"
              :reset="scope.reset"
              :close="scope.close"
            />
          </template>
        </Filter>
        <Search
          v-if="rawCol?.search"
          :column-id="header.column.id"
          :search-value="searchValue"
          :on-confirm="handleSearchConfirm"
          :on-reset="handleSearchReset"
        />
        <HeaderMenu
          v-if="rawCol?.showMenu && rawCol?.menuPopup !== undefined"
          :column="rawCol"
          :column-id="header.column.id"
          :popup="rawCol.menuPopup"
          :icon="rawCol.menuIcon"
        />
      </div>
    </template>

    <Resizer v-if="showResizer" :header="header" />
  </th>
</template>

<script lang="ts" setup generic="TData extends RowData = RowData">
import { computed, useTemplateRef } from 'vue';
import { FlexRender } from '@tanstack/vue-table';

import { injectTableHeaderContext, injectTablePresentationContext } from '../../context/table';
import { DRAG_COLUMN_ID } from '../../constants';
import { resolveColumnAlignStyle } from '../../utils/column';
import { toSTableSortOrder } from '../../utils/sort';
import Resizer from './Resizer.vue';
import Sort from './Sort.vue';
import Filter from './Filter.vue';
import Search from './Search.vue';
import HeaderMenu from './HeaderMenu.vue';
import { useColumnDragPreview } from './useColumnDragPreview';
import { splitTableAttrs } from '../../utils/mergeTableAttrs';
import { applyDragGhost } from '../../utils/dragGhost';

import type { CSSProperties, VNodeChild } from 'vue';
import type { Header, RowData, TableFeatures } from '@tanstack/vue-table';
import type { STableColumn, STableFilterMode, STableSortOrder, STableSlots } from '../../types';

type FilterValue = string | number | boolean;

const props = withDefaults(
  defineProps<{
    header: Header<TableFeatures, TData>;
    /** TanStack Header API 计算出的 colSpan。 */
    colSpan?: number;
    /** TanStack Header API 计算出的 rowSpan；0 表示已被上层 header 覆盖。 */
    rowSpan?: number;
    /** 固定列 class。 */
    fixedClassName?: string;
    /** 固定列 style。 */
    fixedStyle?: CSSProperties;
    /** 是否显示 Resizer。 */
    showResizer?: boolean;
    /** 该列在用户列中的索引（-1 表示注入列）。 */
    userColumnIndex?: number;
  }>(),
  {
    colSpan: 1,
    rowSpan: 1,
    showResizer: false,
    userColumnIndex: -1,
  }
);
defineSlots<Pick<STableSlots<TData>, 'filterPanel'>>();

// HeaderCell 会按列实例化，直接消费所需 Ref 可避免为每个表头创建 proxyRefs 代理。
const presentation = injectTablePresentationContext<TData>();
const { styles, classes, getCustomHeaderCell } = presentation;
const {
  filterState,
  searchState,
  onToggleSort,
  onSetFilter,
  onClearFilter,
  onSetSearch,
  onClearSearch,
  dragColumnFromIndex,
  dragColumnOverIndex,
  canColumnDrag,
} = injectTableHeaderContext();

const emit = defineEmits<{
  columnDragStart: [columnId: string];
  columnDragOver: [columnId: string, event: DragEvent];
  columnDragEnd: [];
  columnDrop: [];
}>();

// TanStack Column 直接持有归一化 columnDef；其对象由列模型缓存，表头无需再查一遍组件级 Map。
const rawCol = computed(() => props.header.column.columnDef as STableColumn<TData>);
const alignStyle = computed(() => resolveColumnAlignStyle(rawCol.value));

const customAttrs = computed(() => splitTableAttrs(getCustomHeaderCell?.(rawCol.value)));

/** 原生 title 完全由 customHeaderCell 控制。 */
const headerTitle = computed(() => customAttrs.value?.attrs?.title as string | undefined);

// ==================== 排序 / 过滤 / 搜索状态 ====================

const columnFilters = computed(() => rawCol.value?.filters);

const columnFilterMode = computed<STableFilterMode>(() => {
  return rawCol.value?.filterMode ?? 'checkbox';
});

const columnFilterMultiple = computed<boolean>(() => {
  return rawCol.value?.filterMultiple ?? true;
});

const sortOrder = computed<STableSortOrder | null>(() =>
  // 排序状态由 TanStack rowSortingFeature 统一维护并记忆化读取。
  toSTableSortOrder(props.header.column.getIsSorted())
);

const ariaSort = computed<'ascending' | 'descending' | 'none' | undefined>(() => {
  if (!rawCol.value?.sorter) return undefined;
  if (sortOrder.value === 'ascend') return 'ascending';
  if (sortOrder.value === 'descend') return 'descending';
  return 'none';
});

/** 修饰键多列排序判断与 TanStack 默认 `isMultiSortEvent` 保持一致。 */
const isMultiSortEvent = (event?: Event): boolean =>
  event instanceof MouseEvent ? event.shiftKey || event.metaKey || event.ctrlKey : false;

/** 鼠标、键盘和 Sort 子组件共用稳定回调，避免表头更新时产生新函数引用。 */
const handleToggleSort = (event?: Event) => {
  if (!rawCol.value?.sorter) return;
  const column = props.header.column;
  // 默认方向、移除排序与修饰键多列完全交给 TanStack 内置 handler；
  // 只有显式 sortDirections 才走兼容层（内置不支持自定义方向子集）。
  if (rawCol.value.sortDirections === undefined) {
    column.getToggleSortingHandler()?.(event);
    return;
  }
  onToggleSort(column.id, isMultiSortEvent(event));
};

const handleFilterConfirm = (values: FilterValue[]) => onSetFilter(props.header.column.id, values);
const handleFilterReset = () => onClearFilter(props.header.column.id);
const handleSearchConfirm = (value: string) => onSetSearch(props.header.column.id, value);
const handleSearchReset = () => onClearSearch(props.header.column.id);

/**
 * 无过滤值时复用同一冻结空数组：任意列的过滤变化都会重建 filterState Map，
 * 若每次回退都新建 `[]`，未过滤列会拿到新引用，导致下游 Filter 面板把
 * 用户尚未确认的本地勾选误判为外部状态变化而清空。
 */
const EMPTY_FILTER_VALUES: FilterValue[] = [];

const filteredValues = computed<FilterValue[]>(() => {
  return filterState.value.get(props.header.column.id) ?? EMPTY_FILTER_VALUES;
});

/** 列配置的筛选图标；函数形式在每次过滤状态变化时求值。 */
const filterIcon = computed<VNodeChild | undefined>(() => {
  const icon = rawCol.value?.filterIcon;
  if (typeof icon === 'function') {
    return icon({
      column: rawCol.value!,
      columnId: props.header.column.id,
      filteredValues: filteredValues.value,
      active: filteredValues.value.length > 0,
    });
  }
  return icon;
});

const searchValue = computed<string>(() => {
  return searchState.value.get(props.header.column.id) ?? '';
});

// ==================== 列拖拽 ====================

const thRef = useTemplateRef<HTMLTableCellElement>('thRef');

const { setCustomDragImage, clearCustomDragImage } = useColumnDragPreview({ thRef });

/** 校验列拖拽能力、设置预览并上报拖拽开始。 */
const onDragStart = (event: DragEvent) => {
  if (!rawCol.value?.draggable) {
    event.preventDefault();
    return;
  }
  // `canDrag` 在每次拖拽开始时求值，允许按业务状态动态禁用某列的拖拽。
  if (!canColumnDrag(rawCol.value, props.userColumnIndex)) {
    event.preventDefault();
    return;
  }
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
  const customGhost = presentation.getColumnDragGhost?.(rawCol.value, props.userColumnIndex);
  if (!applyDragGhost(event, customGhost)) {
    setCustomDragImage(event);
  }
  emit('columnDragStart', props.header.column.id);
};

/** 清理拖拽预览并上报拖拽结束。 */
const onDragEnd = () => {
  clearCustomDragImage();
  emit('columnDragEnd');
};

/** 任意用户叶子列都可作为落点；draggable 只约束拖拽源。 */
const onDragOver = (event: DragEvent) => {
  emit('columnDragOver', props.header.column.id, event);
};
</script>
