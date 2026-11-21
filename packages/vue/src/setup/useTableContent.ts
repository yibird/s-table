import { computed } from 'vue';
import type { RowData } from '@tanstack/vue-table';
import type { STableSetupContext } from './types';
import type { useDataState } from './useDataState';
import type { useTableModel } from './useTableModel';

type UseTableContentOptions<TData extends RowData> = {
  context: STableSetupContext<TData>;
  dataState: ReturnType<typeof useDataState<TData>>;
  tableModel: ReturnType<typeof useTableModel<TData>>;
};

/** 标题和页脚的共享作用域，只在函数内容或 slot 消费时投影当前页数据。 */
export const useTableContent = <TData extends RowData>({
  context: { props, dataSource },
  dataState,
  tableModel,
}: UseTableContentOptions<TData>) => {
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

  const titleContent = computed(() =>
    typeof props.title === 'function'
      ? props.title({ currentPageData: currentPageData.value })
      : props.title
  );
  const footerContent = computed(() =>
    typeof props.footer === 'function' ? props.footer(footerScope.value) : props.footer
  );

  return { currentPageData, footerScope, titleContent, footerContent };
};
