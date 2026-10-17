import { h } from 'vue';
import type { ColumnDef, Row, RowData, TableFeatures } from '@tanstack/vue-table';
import { EXPAND_COLUMN_ID } from '../../constants';
import type { STableExpandable, STableRowKey } from '../../types';
import { toColumnDef } from '../../utils';
import { ExpandIcon } from '../icon';

type CreateExpandColumnOptions<TData extends RowData> = {
  config: STableExpandable<TData>;
  treeEnabled: boolean;
  getPublicKey: (row: Row<TableFeatures, TData>) => STableRowKey;
  onToggle: (key: STableRowKey) => void;
  /** 展开触发器的无障碍文案（来自 locale.accessibility.expandTrigger）。 */
  getAriaLabel: () => string;
};

/** Build the internal expand column without adding a component per visible cell. */
export const createExpandColumn = <TData extends RowData>({
  config,
  treeEnabled,
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
  const isFixed = config.fixed ?? true;
  const cellRenderer = (context: { row: Row<TableFeatures, TData> }) => {
    const row = context.row;
    const expanded = row.getIsExpanded();
    const disabled = !row.getCanExpand();
    if (treeEnabled && row.subRows.length === 0 && disabled) {
      return h('div', { class: 's-table-expand-cell', 'aria-hidden': 'true' });
    }

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
            if (!disabled) onToggle(getPublicKey(row));
          },
        },
        [h(ExpandIcon, { size: 12 })]
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
    enableCellSelection: false,
    meta: { align: 'center' },
    ...(isFixed && { fixed: 'left' as const }),
  });
};
