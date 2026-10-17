<template>
  <span v-if="sorter" class="s-table-column-sorter" @click="onToggleSort?.($event)">
    <span class="s-table-column-sorter-inner" :class="sorterInnerClass">
      <CaretUpIcon
        class-name="s-table-column-sorter-up"
        :class="{ 's-table-column-sorter-up-active': sortOrder === 'ascend' }"
      />
      <CaretDownIcon
        class-name="s-table-column-sorter-down"
        :class="{ 's-table-column-sorter-down-active': sortOrder === 'descend' }"
      />
    </span>
  </span>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import type { STableSortOrder } from '../../types';
import { CaretUpIcon, CaretDownIcon } from '../icon';

const props = withDefaults(
  defineProps<{
    /** 是否启用排序。 */
    sorter?: boolean;
    /** 当前排序方向。 */
    sortOrder?: STableSortOrder | null;
    /** 切换排序的回调；事件用于识别修饰键多列排序。 */
    onToggleSort?: (event?: Event) => void;
  }>(),
  {
    sorter: false,
    sortOrder: null,
  }
);

const sorterInnerClass = computed(() => ({
  's-table-column-sorter-inner-active': props.sortOrder !== null,
}));
</script>
