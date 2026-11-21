/** 标题本身可排序和拖拽，但其中的控件不能成为列拖拽起点。 */
export const isColumnDragExcludedTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  const header = target.closest('th[data-column-id]');
  const control = target.closest(
    'button,input,select,textarea,a,summary,[contenteditable]:not([contenteditable="false"]),' +
      '[role="button"]:not(.s-table-cell-title),[role="checkbox"],[role="menuitem"],' +
      '[tabindex]:not(.s-table-cell-title),.s-table-column-sorter,.s-table-header-resizer,' +
      '.s-table-filter-trigger-wrapper,.s-table-search-trigger-wrapper,.s-table-header-menu-trigger'
  );
  return Boolean(header && control && control !== header && header.contains(control));
};

/** Vue 兼容入口；DOM owner 遍历与 CSS 转义属于 core。 */
export {
  escapeCssAttributeValue,
  getOwnerDocument,
  getOwnerWindow,
} from '@zchengfeng/s-table-core';
