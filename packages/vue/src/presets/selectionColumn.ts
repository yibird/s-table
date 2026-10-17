import { createCommentVNode, h } from 'vue';
import type { ColumnDef, Row, RowData, TableFeatures } from '@tanstack/vue-table';
import { SELECTION_COLUMN_ID } from '../constants';
import type { STableCheckboxProps, STableRowKey, STableRowSelection } from '../types';
import { toColumnDef } from '../utils';
import { getRowVisibleIndex } from '../adapter/tableDisplayOrder';
import SelectionDropdown from '../components/header/SelectionDropdown.vue';
import { Checkbox } from '../ui/checkbox';
import { Radio } from '../ui/radio';

type SelectionRowPresentation<TData extends RowData> = {
  key: STableRowKey;
  checkboxProps: STableCheckboxProps;
  selected: boolean;
  row: Row<TableFeatures, TData>;
};

type CreateSelectionColumnOptions<TData extends RowData> = {
  config: STableRowSelection<TData>;
  getHeaderProps: () => STableCheckboxProps;
  getRowPresentation: (row: Row<TableFeatures, TData>) => SelectionRowPresentation<TData>;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSelectOdd: () => void;
  onSelectEven: () => void;
  onSelectCurrentPage: () => void;
  onCustomSelect: (key: string) => void;
  onRadioChange: (key: STableRowKey) => void;
  onCheckboxChange: (
    presentation: SelectionRowPresentation<TData>,
    checked: boolean,
    event: MouseEvent
  ) => void;
};

/** Build the internal selection column without adding a component per visible cell. */
export const createSelectionColumn = <TData extends RowData>({
  config,
  getHeaderProps,
  getRowPresentation,
  onSelectAll,
  onClearAll,
  onSelectOdd,
  onSelectEven,
  onSelectCurrentPage,
  onCustomSelect,
  onRadioChange,
  onCheckboxChange,
}: CreateSelectionColumnOptions<TData>): ColumnDef<TableFeatures, TData, unknown> => {
  const isRadio = config.type === 'radio';
  const defaultWidth = isRadio || config.hideSelectAll ? 52 : 62;
  const columnWidth = config.columnWidth ?? defaultWidth;
  const align = config.align ?? 'center';
  const isFixed = config.fixed ?? true;
  const renderCell = config.renderCell;

  const headerRenderer = () => {
    if (isRadio || config.hideSelectAll) return createCommentVNode('selection-header');
    const headerProps = getHeaderProps();
    return h('div', { class: 's-table-selection-header' }, [
      h(Checkbox, {
        modelValue: headerProps.checked,
        indeterminate: headerProps.indeterminate,
        disabled: headerProps.disabled,
        class: headerProps.class,
        style: headerProps.style,
        onChange: (checked: boolean) => (checked ? onSelectAll() : onClearAll()),
      }),
      h(SelectionDropdown, {
        onSelectAll,
        onClearAll,
        onSelectOdd,
        onSelectEven,
        onSelectCurrentPage,
        customOptions: config.selections,
        onCustomSelect,
      }),
    ]);
  };

  const cellRenderer = (context: { row: Row<TableFeatures, TData> }) => {
    const presentation = getRowPresentation(context.row);
    const { checkboxProps, key, row, selected } = presentation;
    const disabled = checkboxProps.disabled === true;
    const containerProps = {
      class: 's-table-selection-cell',
      onClick: (event: Event) => event.stopPropagation(),
    };
    const originNode = isRadio
      ? h(
          'div',
          containerProps,
          h(Radio, {
            modelValue: (checkboxProps.checked ?? selected) ? key : undefined,
            value: key,
            disabled,
            class: checkboxProps.class,
            style: checkboxProps.style,
            onChange: () => onRadioChange(key),
          })
        )
      : h(
          'div',
          containerProps,
          h(Checkbox, {
            modelValue: checkboxProps.checked ?? selected,
            indeterminate: checkboxProps.indeterminate,
            disabled,
            class: checkboxProps.class,
            style: checkboxProps.style,
            onChange: (checked: boolean, event: MouseEvent) =>
              onCheckboxChange(presentation, checked, event),
          })
        );

    return renderCell?.(selected, row.original, getRowVisibleIndex(row), originNode) ?? originNode;
  };

  const parsedSize =
    typeof columnWidth === 'number' ? columnWidth : Number.parseInt(columnWidth, 10);
  const size = Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : defaultWidth;
  return toColumnDef({
    id: SELECTION_COLUMN_ID,
    header: headerRenderer,
    cell: cellRenderer,
    size,
    minSize: size,
    maxSize: size,
    enableResizing: false,
    enableCellSelection: false,
    meta: { align },
    ...(isFixed && { fixed: 'left' as const }),
  });
};
