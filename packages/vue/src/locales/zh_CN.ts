import type { STableLocale } from './types';

/**
 * 简体中文语言包。
 */
const zh_CN: STableLocale = {
  localeName: 'zh_CN',
  empty: {
    title: '暂无数据',
  },
  filter: {
    reset: '重置',
    confirm: '确定',
  },
  search: {
    reset: '重置',
    confirm: '搜索',
    placeholder: '搜索...',
  },
  selection: {
    selectAll: '全选',
    clearAll: '取消全选',
    selectOddRows: '选择奇数行',
    selectEvenRows: '选择偶数行',
    selectCurrentPage: '选择当前页',
  },
  pagination: {
    jumpTo: '跳至',
    page: '页',
    itemsPerPage: '条/页',
  },
  select: {
    placeholder: '请选择',
    noData: '暂无数据',
  },
  table: {
    sequence: '序号',
  },
  accessibility: {
    table: '数据表格',
    filterColumn: '筛选列',
    searchColumn: '搜索列',
    contextMenu: '行操作',
    expandTrigger: '展开或收起行',
    selectionDropdown: '选择操作菜单',
    columnMenu: '列菜单',
    resizeColumn: '调整列宽',
    loading: '加载中',
  },
};

export default zh_CN;
