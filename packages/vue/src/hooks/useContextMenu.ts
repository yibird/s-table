import { nextTick, onBeforeUnmount, shallowRef, type ShallowRef } from 'vue';
import type { Row, RowData, TableFeatures } from '@tanstack/vue-table';
import { getOwnerDocument, getOwnerWindow } from '../utils/dom';
import { getRowVisibleIndex } from '../adapter/tableDisplayOrder';

export const useContextMenu = <TData extends RowData>() => {
  const isOpen = shallowRef(false);
  const posX = shallowRef(0);
  const posY = shallowRef(0);
  const contextRow = shallowRef<TData | null>(null) as ShallowRef<TData | null>;
  const contextRowIndex = shallowRef(-1);
  let listenerDocument: Document | undefined;
  let listenerWindow: Window | undefined;
  let registerRafId: number | null = null;
  /** Esc 关闭时用于归还焦点的触发单元格。 */
  let restoreTarget: HTMLElement | null = null;

  const removeGlobalListeners = () => {
    if (registerRafId !== null) {
      listenerWindow?.cancelAnimationFrame(registerRafId);
      registerRafId = null;
    }
    listenerDocument?.removeEventListener('mousedown', handleClickOutside, true);
    listenerDocument?.removeEventListener('keydown', handleKeyDown, true);
    listenerDocument?.removeEventListener('scroll', handleScroll, true);
    listenerDocument = undefined;
    listenerWindow = undefined;
  };

  const registerGlobalListeners = (ownerDocument: Document | undefined) => {
    removeGlobalListeners();
    const ownerWindow = getOwnerWindow(ownerDocument?.documentElement);
    if (!ownerDocument || !ownerWindow) return;
    listenerDocument = ownerDocument;
    listenerWindow = ownerWindow;
    // 延迟一帧注册，避免触发当前 contextmenu 事件链。
    registerRafId = ownerWindow.requestAnimationFrame(() => {
      registerRafId = null;
      if (!isOpen.value || listenerDocument !== ownerDocument) return;
      ownerDocument.addEventListener('mousedown', handleClickOutside, true);
      ownerDocument.addEventListener('keydown', handleKeyDown, true);
      ownerDocument.addEventListener('scroll', handleScroll, true);
    });
  };

  const handleContextMenu = (
    row: Row<TableFeatures, TData>,
    event: MouseEvent,
    rowIndex = getRowVisibleIndex(row)
  ) => {
    event.preventDefault();
    const origin = event.target as Element | null;
    restoreTarget =
      origin?.closest<HTMLElement>('td[data-column-id]') ??
      origin?.closest<HTMLElement>('.s-table-row') ??
      null;
    contextRow.value = row.original;
    contextRowIndex.value = rowIndex;
    posX.value = event.clientX;
    posY.value = event.clientY;
    isOpen.value = true;
    registerGlobalListeners(getOwnerDocument(event.currentTarget as Node | null));
  };

  const closeMenu = (restoreFocus = false) => {
    const target = restoreTarget;
    restoreTarget = null;
    isOpen.value = false;
    contextRow.value = null;
    contextRowIndex.value = -1;
    removeGlobalListeners();
    if (restoreFocus && target?.isConnected) {
      nextTick(() => target.focus());
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target;
    // 监听器注册在 document capture 阶段，必须在此识别 Teleport 菜单本体；
    // 仅在菜单节点上 stopPropagation 已来不及阻止 capture 监听。
    if ((target as Element | null)?.closest?.('.s-table-context-menu')) return;
    if (isOpen.value) closeMenu();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen.value) closeMenu(true);
  };

  const handleScroll = () => {
    if (isOpen.value) closeMenu();
  };

  onBeforeUnmount(removeGlobalListeners);

  return {
    isOpen,
    posX,
    posY,
    contextRow,
    contextRowIndex,
    handleContextMenu,
    closeMenu,
  };
};
