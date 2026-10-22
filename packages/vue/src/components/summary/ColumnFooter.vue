<template>
  <tfoot class="s-table-summary s-table-column-footer" :class="stickyClass">
    <tr v-for="group in footerGroups" :key="group.id" class="s-table-summary-row">
      <template v-for="header in group.headers" :key="header.id">
        <th
          v-if="!header.isPlaceholder"
          class="s-table-cell"
          :class="fixedStyle(header.column.id)?.className"
          :colspan="header.colSpan"
          :style="[fixedStyle(header.column.id)?.bodyStyle, alignStyle(header)]"
        >
          <FlexRender :footer="header" />
        </th>
      </template>
    </tr>
  </tfoot>
</template>

<script lang="ts" setup generic="TData extends RowData = RowData">
import { computed } from 'vue';
import { FlexRender } from '@tanstack/vue-table';
import type { Header, HeaderGroup, RowData, TableFeatures } from '@tanstack/vue-table';
import { injectTablePresentationContext } from '../../context/table';

const props = withDefaults(
  defineProps<{
    footerGroups: HeaderGroup<TableFeatures, TData>[];
    /** 是否固定在滚动容器底部。 */
    sticky?: boolean;
  }>(),
  {
    sticky: false,
  }
);

const { fixedColumnStyles } = injectTablePresentationContext();

const fixedStyle = (columnId: string) => fixedColumnStyles.value.get(columnId);

const alignStyle = (header: Header<TableFeatures, TData>) => {
  const align = (
    header.column.columnDef.meta as { align?: 'left' | 'center' | 'right' } | undefined
  )?.align;
  return align && align !== 'left' ? { textAlign: align } : undefined;
};

const stickyClass = computed(() => (props.sticky ? 's-table-summary-fixed' : undefined));
</script>
