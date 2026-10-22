<template>
  <div
    v-if="visible"
    :class="['s-table-pagination-wrapper', `s-table-pagination-wrapper-${placement}`]"
  >
    <UIPagination
      :current="current"
      :page-size="pageSize"
      :total="total"
      :disabled="disabled"
      :size="size"
      :compact="compact"
      :show-quick-jumper="showQuickJumper"
      :show-size-changer="showSizeChanger"
      :page-size-options="pageSizeOptions"
      :show-total="showTotal"
      :simple="simple"
      :show-less-items="showLessItems"
      :hide-on-single-page="hideOnSinglePage"
      :item-render="itemRender"
      :jump-to-text="locale.pagination.jumpTo"
      :page-text="locale.pagination.page"
      :items-per-page-text="locale.pagination.itemsPerPage"
      :select-placeholder="locale.select.placeholder"
      :select-empty-text="locale.select.noData"
      @update:current="(p: number) => emit('update:current', p)"
      @update:page-size="(s: number) => emit('update:pageSize', s)"
      @change="(p: number, s: number) => emit('change', p, s)"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { Pagination as UIPagination, type STablePaginationItemRender } from '../../ui/pagination';
import { useLocales } from '../../locales/useLocales';
import type { PaginationPlacement } from '../../types';

const locale = useLocales();

const props = withDefaults(
  defineProps<{
    current?: number;
    pageSize?: number;
    total?: number;
    disabled?: boolean;
    size?: 'small' | 'middle' | 'large';
    compact?: boolean;
    showQuickJumper?: boolean;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
    showTotal?: (total: number, range: [number, number]) => string;
    placement?: PaginationPlacement;
    simple?: boolean;
    showLessItems?: boolean;
    hideOnSinglePage?: boolean;
    itemRender?: STablePaginationItemRender;
  }>(),
  {
    current: 1,
    pageSize: 10,
    total: 0,
    disabled: false,
    showQuickJumper: false,
    showSizeChanger: false,
    pageSizeOptions: () => [10, 20, 50, 100],
    placement: 'bottomEnd',
    simple: false,
    showLessItems: false,
    hideOnSinglePage: false,
    itemRender: undefined,
  }
);

const visible = computed(() => {
  if (props.total <= 0) return false;
  if (!props.hideOnSinglePage) return true;
  const totalPages = Math.max(1, Math.ceil(props.total / props.pageSize));
  return totalPages > 1;
});

const emit = defineEmits<{
  'update:current': [page: number];
  'update:pageSize': [size: number];
  change: [page: number, pageSize: number];
}>();
</script>
