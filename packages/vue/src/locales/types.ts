/**
 * STable 多语言包类型定义。
 */
export interface STableLocale {
  /** 语言包标识（如 'en_US'、'zh_CN'）。 */
  localeName: string;
  /** 空状态。 */
  empty: {
    title: string;
    description: string;
  };
  /** 过滤器。 */
  filter: {
    reset: string;
    confirm: string;
  };
  /** 搜索。 */
  search: {
    reset: string;
    confirm: string;
    placeholder: string;
  };
  /** 选择下拉菜单。 */
  selection: {
    selectAll: string;
    clearAll: string;
    selectOddRows: string;
    selectEvenRows: string;
    selectCurrentPage: string;
  };
  /** 分页器。 */
  pagination: {
    jumpTo: string;
    page: string;
    itemsPerPage: string;
  };
  /** 通用选择器。 */
  select: {
    placeholder: string;
    noData: string;
  };
  /** 表格内置列。 */
  table: {
    sequence: string;
  };
  /** 仅供辅助技术读取，不影响可见文案。 */
  accessibility: {
    table: string;
    filterColumn: string;
    searchColumn: string;
    contextMenu: string;
    expandTrigger: string;
    selectionDropdown: string;
    resizeColumn: string;
    loading: string;
  };
}

/** 允许调用方只覆盖需要定制的语言分支。 */
export type STableLocaleOverrides = {
  [Key in keyof STableLocale]?: STableLocale[Key] extends Record<string, unknown>
    ? Partial<STableLocale[Key]>
    : STableLocale[Key];
};
