import type { Row, RowData, TableFeatures } from '@tanstack/vue-table';
import { decodeRowKey, toSTableCellEvent, toSTableRowEvent } from '../utils';
import { useContextMenu, useThemeVariables } from '../hooks';
import type { useDataState } from './useDataState';
import type { STableSetupContext } from './types';

/**
 * 事件桥接：行 / 单元格事件转换为公开 payload，并接管右键菜单与主题变量。
 */
export const useEvents = <TData extends RowData>(
  context: STableSetupContext<TData>,
  dataState: ReturnType<typeof useDataState<TData>>
) => {
  const { props, slots, emit, rootRef } = context;
  const { toggleExpand, handleEditTrigger } = dataState;

  const {
    isOpen: contextMenuOpen,
    posX: contextMenuPosX,
    posY: contextMenuPosY,
    contextRow,
    contextRowIndex,
    handleContextMenu,
    closeMenu: closeContextMenu,
  } = useContextMenu<TData>();
  const { themedStyle: themeStyle } = useThemeVariables(rootRef, contextMenuOpen);

  /** 仅在 contextMenu slot 存在时才打开右键菜单 */
  const onRowContextMenu = (
    row: Parameters<typeof handleContextMenu>[0],
    index: number,
    event: MouseEvent
  ) => {
    emit('rowContextMenu', toSTableRowEvent(row, index, event));
    if (slots.contextMenu) handleContextMenu(row, event, index);
  };

  const onRowClick = (row: Row<TableFeatures, TData>, index: number, event: MouseEvent) => {
    emit('rowClick', toSTableRowEvent(row, index, event));
    if (props.expandRowByClick && row.getCanExpand()) toggleExpand(decodeRowKey(row.id));
  };
  const onRowDoubleClick = (row: Row<TableFeatures, TData>, index: number, event: MouseEvent) =>
    emit('rowDoubleClick', toSTableRowEvent(row, index, event));
  const onRowMouseenter = (row: Row<TableFeatures, TData>, index: number, event: MouseEvent) =>
    emit('rowMouseenter', toSTableRowEvent(row, index, event));
  const onRowMouseleave = (row: Row<TableFeatures, TData>, index: number, event: MouseEvent) =>
    emit('rowMouseleave', toSTableRowEvent(row, index, event));
  const onCellClick = (
    row: Row<TableFeatures, TData>,
    columnId: string,
    index: number,
    columnIndex: number,
    event: MouseEvent
  ) => {
    const payload = toSTableCellEvent(row, columnId, index, columnIndex, event);
    emit('cellClick', payload);
    handleEditTrigger(payload, 'click');
  };
  const onCellDoubleClick = (
    row: Row<TableFeatures, TData>,
    columnId: string,
    index: number,
    columnIndex: number,
    event: MouseEvent
  ) => {
    const payload = toSTableCellEvent(row, columnId, index, columnIndex, event);
    emit('cellDoubleClick', payload);
    handleEditTrigger(payload, 'dblclick');
  };
  const onCellContextMenu = (
    row: Row<TableFeatures, TData>,
    columnId: string,
    index: number,
    columnIndex: number,
    event: MouseEvent
  ) => emit('cellContextMenu', toSTableCellEvent(row, columnId, index, columnIndex, event));
  const onCellMouseenter = (
    row: Row<TableFeatures, TData>,
    columnId: string,
    index: number,
    columnIndex: number,
    event: MouseEvent
  ) => emit('cellMouseenter', toSTableCellEvent(row, columnId, index, columnIndex, event));
  const onCellMouseleave = (
    row: Row<TableFeatures, TData>,
    columnId: string,
    index: number,
    columnIndex: number,
    event: MouseEvent
  ) => emit('cellMouseleave', toSTableCellEvent(row, columnId, index, columnIndex, event));
  const onCellKeydown = (
    row: Row<TableFeatures, TData>,
    columnId: string,
    index: number,
    columnIndex: number,
    event: KeyboardEvent
  ) => emit('cellKeydown', toSTableCellEvent(row, columnId, index, columnIndex, event));

  return {
    contextMenuOpen,
    contextMenuPosX,
    contextMenuPosY,
    contextRow,
    contextRowIndex,
    closeContextMenu,
    themeStyle,
    onRowContextMenu,
    onRowClick,
    onRowDoubleClick,
    onRowMouseenter,
    onRowMouseleave,
    onCellClick,
    onCellDoubleClick,
    onCellContextMenu,
    onCellMouseenter,
    onCellMouseleave,
    onCellKeydown,
  };
};
