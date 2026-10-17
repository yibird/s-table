import { computed, onMounted, watch, type Ref } from 'vue';
import type { VirtualItem } from '@tanstack/vue-virtual';
import type { STableEditingState } from '../../types';
import { encodeRowKey, escapeCssAttributeValue } from '../../utils';

type UseEditingFocusOptions = {
  getEditingState: () => STableEditingState | null;
  getVirtualItems: () => VirtualItem[];
  tbodyRef: Readonly<Ref<HTMLTableSectionElement | null>>;
};

/**
 * 编辑焦点管理：编辑状态或虚拟窗口变化后，把焦点交给当前编辑单元格内的
 * 第一个可聚焦控件，并保持文本输入的全选状态。
 */
export const useEditingFocus = ({
  getEditingState,
  getVirtualItems,
  tbodyRef,
}: UseEditingFocusOptions) => {
  const editingFocusKey = computed(() => {
    const editing = getEditingState();
    if (!editing) return '';
    const items = getVirtualItems();
    const first = items[0]?.key ?? '';
    const last = items[items.length - 1]?.key ?? '';
    return `${encodeRowKey(editing.rowKey)}:${editing.columnId ?? '*'}:${String(first)}:${String(last)}`;
  });

  const focusActiveEditor = () => {
    const editing = getEditingState();
    const body = tbodyRef.value;
    if (!editing || !body) return;
    const rowId = escapeCssAttributeValue(encodeRowKey(editing.rowKey));
    const columnSelector = editing.columnId
      ? `[data-column-id="${escapeCssAttributeValue(editing.columnId)}"]`
      : '[data-column-id]';
    const cell = body.querySelector<HTMLTableCellElement>(
      `td[data-row-id="${rowId}"]${columnSelector}`
    );
    const target = cell?.querySelector<HTMLElement>(
      'input:not([disabled]),textarea:not([disabled]),select:not([disabled]),button:not([disabled]),[tabindex]:not([tabindex="-1"])'
    );
    if (!target || tbodyRef.value?.ownerDocument.activeElement === target) return;
    target.focus();
    if (target instanceof HTMLInputElement && target.type !== 'checkbox') target.select();
  };

  watch(editingFocusKey, focusActiveEditor, { immediate: true, flush: 'post' });

  onMounted(focusActiveEditor);
};
