<template>
  <div
    v-if="total > 0"
    :class="['s-table-pagination-wrapper', `s-table-pagination-wrapper-${placement}`]"
  >
    <UIPagination
      :current="current"
      :page-size="pageSize"
      :total="total"
      :disabled="disabled"
      :show-quick-jumper="showQuickJumper"
      :show-size-changer="showSizeChanger"
      :page-size-options="pageSizeOptions"
      :show-total="showTotal"
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
import { Pagination as UIPagination } from '../../ui/pagination';
import { useLocales } from '../../locales/useLocales';
import type { PaginationPlacement } from '../../types';

const locale = useLocales();

const props = withDefaults(
  defineProps<{
    current?: number;
    pageSize?: number;
    total?: number;
    disabled?: boolean;
    showQuickJumper?: boolean;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
    showTotal?: (total: number, range: [number, number]) => string;
    placement?: PaginationPlacement;
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
  }
);

const emit = defineEmits<{
  'update:current': [page: number];
  'update:pageSize': [size: number];
  change: [page: number, pageSize: number];
}>();
</script>
