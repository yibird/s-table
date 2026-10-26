import { h } from 'vue';
import type { ColumnDef, Row, RowData, TableFeatures } from '@tanstack/vue-table';
import { EXPAND_COLUMN_ID, TREE_EXPAND_COLUMN_ID } from '../constants';
import type { STableExpandable, STableRowKey } from '../types';
import { toColumnDef } from '../utils';
import { getRowVisibleIndex } from '../adapter/tableDisplayOrder';
import { ExpandIcon, TreeExpandIcon } from '../components/icon';

type CreateExpandColumnOptions<TData extends RowData> = {
  config: STableExpandable<TData>;
  getPublicKey: (row: Row<TableFeatures, TData>) => STableRowKey;
  onToggle: (key: STableRowKey) => void;
  /** 展开触发器的无障碍文案（来自 locale.accessibility.expandTrigger）。 */
  getAriaLabel: () => string;
};

/** Build the internal expand column without adding a component per visible cell. */
export const createExpandColumn = <TData extends RowData>({
  config,
  getPublicKey,
  onToggle,
  getAriaLabel,
}: CreateExpandColumnOptions<TData>): ColumnDef<TableFeatures, TData, unknown> => {
  const columnWidth =
    typeof config.columnWidth === 'number' &&
    Number.isFinite(config.columnWidth) &&
    config.columnWidth > 0
      ? config.columnWidth
      : 40;
  const fixedSetting = config.expandFixed ?? config.fixed ?? true;
  const fixed = fixedSetting === true ? 'left' : fixedSetting === false ? undefined : fixedSetting;
  const cellRenderer = (context: { row: Row<TableFeatures, TData> }) => {
    const row = context.row;
    const expanded = row.getIsExpanded();
    const disabled = !row.getCanExpand();
    const toggle = () => onToggle(getPublicKey(row));
    const icon = config.expandIcon
      ? config.expandIcon({
          expanded,
          expandable: !disabled,
          record: row.original,
          rowIndex: getRowVisibleIndex(row),
          toggle,
        })
      : h(ExpandIcon, { size: 12 });

    return h('div', { class: 's-table-expand-cell' }, [
      h(
        'button',
        {
          class: [
            's-table-expand-trigger',
            {
              's-table-expand-trigger-expanded': expanded,
              's-table-expand-trigger-disabled': disabled,
            },
          ],
          type: 'button',
          disabled,
          'aria-label': getAriaLabel(),
          'aria-expanded': expanded,
          onClick: (event: MouseEvent) => {
            event.stopPropagation();
            if (!disabled) toggle();
          },
        },
        [icon]
      ),
    ]);
  };

  return toColumnDef({
    id: EXPAND_COLUMN_ID,
    header: () => '',
    cell: cellRenderer,
    size: columnWidth,
    minSize: columnWidth,
    maxSize: columnWidth,
    enableResizing: false,
    meta: { align: 'center' },
    ...(fixed ? { fixed } : {}),
  });
};

type CreateTreeExpandColumnOptions<TData extends RowData> = {
  getPublicKey: (row: Row<TableFeatures, TData>) => STableRowKey;
  onToggle: (key: STableRowKey) => void;
  getAriaLabel: () => string;
};

/** 树形展开列：独立于详情展开列，收起显示 `+`，展开显示 `−`。 */
export const createTreeExpandColumn = <TData extends RowData>({
  getPublicKey,
  onToggle,
  getAriaLabel,
}: CreateTreeExpandColumnOptions<TData>): ColumnDef<TableFeatures, TData, unknown> => {
  const columnWidth = 40;
  const cellRenderer = (context: { row: Row<TableFeatures, TData> }) => {
    const row = context.row;
    if (!row.getCanExpand()) {
      return h('div', { class: 's-table-expand-cell', 'aria-hidden': 'true' });
    }
    const expanded = row.getIsExpanded();
    return h('div', { class: 's-table-expand-cell' }, [
      h(
        'button',
        {
          class: [
            's-table-expand-trigger',
            's-table-tree-expand-trigger',
            { 's-table-expand-trigger-expanded': expanded },
          ],
          type: 'button',
          'aria-label': getAriaLabel(),
          'aria-expanded': expanded,
          onClick: (event: MouseEvent) => {
            event.stopPropagation();
            onToggle(getPublicKey(row));
          },
        },
        [h(TreeExpandIcon, { expanded, size: 10 })]
      ),
    ]);
  };

  return toColumnDef({
    id: TREE_EXPAND_COLUMN_ID,
    header: () => '',
    cell: cellRenderer,
    size: columnWidth,
    minSize: columnWidth,
    maxSize: columnWidth,
    enableResizing: false,
    meta: { align: 'center' },
    fixed: 'left',
  });
};
