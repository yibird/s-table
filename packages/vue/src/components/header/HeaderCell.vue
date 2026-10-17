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
    ]"
    :colspan="colSpan"
    :rowspan="rowSpan"
    :aria-sort="ariaSort"
    :style="[fixedStyle, alignStyle, styles?.headerCell]"
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
          :class="[{ 's-table-cell-title-sortable': !!rawCol?.sorter }, classes?.headerCellTitle]"
          :style="styles?.headerCellTitle"
          :role="rawCol?.sorter ? 'button' : undefined"
          :tabindex="rawCol?.sorter ? 0 : undefined"
          @click="handleToggleSort"
          @keydown.enter.prevent="handleToggleSort"
          @keydown.space.prevent="handleToggleSort"
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
import Resizer from './Resizer.vue';
import Sort from './Sort.vue';
import Filter from './Filter.vue';
import Search from './Search.vue';
import { useColumnDragPreview } from './useColumnDragPreview';

import type { CSSProperties } from 'vue';
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
const { styles, classes } = injectTablePresentationContext<TData>();
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

// ==================== 排序 / 过滤 / 搜索状态 ====================

const columnFilters = computed(() => rawCol.value?.filters);

const columnFilterMode = computed<STableFilterMode>(() => {
  return rawCol.value?.filterMode ?? 'checkbox';
});

const columnFilterMultiple = computed<boolean>(() => {
  return rawCol.value?.filterMultiple ?? true;
});

const sortOrder = computed<STableSortOrder | null>(() => {
  // 排序状态由 TanStack rowSortingFeature 统一维护并记忆化读取；
  // STable 只把官方 asc/desc 映射为兼容层公开的 ascend/descend。
  const order = props.header.column.getIsSorted();
  if (order === 'asc') return 'ascend';
  if (order === 'desc') return 'descend';
  return null;
});

const ariaSort = computed<'ascending' | 'descending' | 'none' | undefined>(() => {
  if (!rawCol.value?.sorter) return undefined;
  if (sortOrder.value === 'ascend') return 'ascending';
  if (sortOrder.value === 'descend') return 'descending';
  return 'none';
});

/** 鼠标、键盘和 Sort 子组件共用稳定回调，避免表头更新时产生新函数引用。 */
const handleToggleSort = () => {
  if (rawCol.value?.sorter) onToggleSort(props.header.column.id);
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
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
  setCustomDragImage(event);
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
