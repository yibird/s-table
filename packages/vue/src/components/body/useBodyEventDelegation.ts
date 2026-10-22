import type { Row, RowData, TableFeatures } from '@tanstack/vue-table';
import { escapeCssAttributeValue } from '../../utils/dom';

export type BodyEventMap<TData extends RowData> = {
  rowContextMenu: [row: Row<TableFeatures, TData>, index: number, event: MouseEvent];
  rowClick: [row: Row<TableFeatures, TData>, index: number, event: MouseEvent];
  rowDoubleClick: [row: Row<TableFeatures, TData>, index: number, event: MouseEvent];
  rowMouseenter: [row: Row<TableFeatures, TData>, index: number, event: MouseEvent];
  rowMouseleave: [row: Row<TableFeatures, TData>, index: number, event: MouseEvent];
  cellClick: [
    row: Row<TableFeatures, TData>,
    columnId: string,
    index: number,
    columnIndex: number,
    event: MouseEvent,
  ];
  cellDoubleClick: [
    row: Row<TableFeatures, TData>,
    columnId: string,
    index: number,
    columnIndex: number,
    event: MouseEvent,
  ];
  cellContextMenu: [
    row: Row<TableFeatures, TData>,
    columnId: string,
    index: number,
    columnIndex: number,
    event: MouseEvent,
  ];
  cellMouseenter: [
    row: Row<TableFeatures, TData>,
    columnId: string,
    index: number,
    columnIndex: number,
    event: MouseEvent,
  ];
  cellMouseleave: [
    row: Row<TableFeatures, TData>,
    columnId: string,
    index: number,
    columnIndex: number,
    event: MouseEvent,
  ];
  cellKeydown: [
    row: Row<TableFeatures, TData>,
    columnId: string,
    index: number,
    columnIndex: number,
    event: KeyboardEvent,
  ];
};

type BodyEventEmitter<TData extends RowData> = <TEvent extends keyof BodyEventMap<TData>>(
  event: TEvent,
  ...args: BodyEventMap<TData>[TEvent]
) => void;

type BodyEventDelegationOptions<TData extends RowData> = {
  getRows: () => readonly Row<TableFeatures, TData>[];
  getColumnIndex: (columnId: string) => number;
  getKeyboardNavigation: () => boolean;
  getCellRangeMode: () => 'cell' | 'row' | undefined;
  getDragRowFromIndex: () => number;
  getOnRangeRowClick: () => ((rowIndex: number) => void) | undefined;
  onCellRangeMousedown: (rowId: string, columnId: string, event: MouseEvent) => void;
  onCellRangeMouseenter: (rowId: string, columnId: string, event: MouseEvent) => void;
  onCellRangeSelectAll?: () => void;
  onCellRangeExtend?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onCellRangeClear?: () => void;
  /** 虚拟窗口边缘没有相邻 DOM 时的跨窗口导航。 */
  onBoundaryNavigate?: (
    rowIndex: number,
    columnIndex: number,
    direction: 'up' | 'down' | 'left' | 'right'
  ) => boolean;
  onRowDragOver: (rowIndex: number, event: DragEvent) => void;
  emit: BodyEventEmitter<TData>;
};

type EventRowHit<TData extends RowData> = {
  row: Row<TableFeatures, TData>;
  index: number;
  rowElement: HTMLElement;
};

type EventCellHit<TData extends RowData> = EventRowHit<TData> & {
  cellElement: HTMLTableCellElement;
  columnId: string;
  columnIndex: number;
};

const ROW_SELECTOR = '.s-table-row[data-row-index]';
const CELL_SELECTOR = 'td.s-table-cell[data-column-id]';
const INTERACTIVE_SELECTOR =
  'button,input,select,textarea,option,[contenteditable="true"],.s-table-drag-handle,[draggable="true"]';
const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

/**
 * 从事件目标向 tbody 方向单次向上遍历，找到第一个匹配选择器的元素，
 * 并校验其直接归属当前委托的 tbody（嵌套表格内的同结构元素被跳过）。
 * 相比「closest(selector) + closest('tbody')」两次完整遍历，只在命中元素时
 * 补一次浅层归属校验，hover 高频路径的 DOM 遍历量明显下降。
 */
const findOwnedElement = <TElement extends Element>(
  target: EventTarget | null,
  selector: string,
  body: EventTarget | null
): TElement | undefined => {
  if (!(target instanceof Element) || !(body instanceof Element)) return undefined;
  let element: Element | null = target;
  let match: Element | undefined;
  while (element && element !== body) {
    if (element.matches(selector)) {
      match = element;
      break;
    }
    element = element.parentElement;
  }
  return match && match.closest('tbody') === body ? (match as TElement) : undefined;
};

/**
 * 将 Body 的 DOM 事件集中委托到 tbody。读取输入时使用 getter，确保处理器始终消费最新 props/context，
 * 同时避免为每个可见行和单元格创建监听器与闭包。
 *
 * 命中结果（行/格元素引用）在处理器内复用：mouseover/mouseout 不再重复遍历父链，
 * click/dblclick/contextmenu 的行+格双派发共享同一次命中。
 */
export const useBodyEventDelegation = <TData extends RowData>(
  options: BodyEventDelegationOptions<TData>
) => {
  const getEventRow = (event: Event): EventRowHit<TData> | undefined => {
    const rowElement = findOwnedElement<HTMLElement>(
      event.target,
      ROW_SELECTOR,
      event.currentTarget
    );
    if (!rowElement) return undefined;
    const index = Number(rowElement.dataset.rowIndex);
    if (!Number.isInteger(index)) return undefined;
    const row = options.getRows()[index];
    return row ? { row, index, rowElement } : undefined;
  };

  const getEventCell = (
    event: Event,
    hit: EventRowHit<TData> | undefined = getEventRow(event)
  ): EventCellHit<TData> | undefined => {
    if (!hit) return undefined;
    const cellElement = findOwnedElement<HTMLTableCellElement>(
      event.target,
      CELL_SELECTOR,
      event.currentTarget
    );
    if (!cellElement) return undefined;
    const columnId = cellElement.dataset.columnId;
    if (!columnId) return undefined;
    const datasetIndex = Number(cellElement.dataset.colIndex);
    return {
      ...hit,
      cellElement,
      columnId,
      columnIndex: Number.isFinite(datasetIndex) ? datasetIndex : options.getColumnIndex(columnId),
    };
  };

  const handleBodyMousedown = (event: MouseEvent) => {
    if (options.getCellRangeMode() !== 'cell') return;
    const target = event.target as Element | null;
    if (target?.closest(INTERACTIVE_SELECTOR)) return;
    const cell = getEventCell(event);
    if (!cell) return;
    event.preventDefault();
    options.onCellRangeMousedown(cell.row.id, cell.columnId, event);
  };

  /** click/dblclick/contextmenu 共用的「行 + 格」双派发路径。 */
  const emitRowAndCell = (
    event: MouseEvent,
    emitRow: (hit: EventRowHit<TData>) => void,
    emitCell: (cell: EventCellHit<TData>) => void
  ) => {
    const hit = getEventRow(event);
    if (!hit) return;
    emitRow(hit);
    const cell = getEventCell(event, hit);
    if (cell) emitCell(cell);
  };

  const handleBodyClick = (event: MouseEvent) => {
    emitRowAndCell(
      event,
      (hit) => {
        options.getOnRangeRowClick()?.(hit.index);
        options.emit('rowClick', hit.row, hit.index, event);
      },
      (cell) =>
        options.emit('cellClick', cell.row, cell.columnId, cell.index, cell.columnIndex, event)
    );
    const target = event.target as Element | null;
    if (options.getKeyboardNavigation() && !target?.closest('input,button,select,textarea,a')) {
      target?.closest<HTMLElement>('td[tabindex]')?.focus();
    }
  };

  const handleBodyDblclick = (event: MouseEvent) => {
    emitRowAndCell(
      event,
      (hit) => options.emit('rowDoubleClick', hit.row, hit.index, event),
      (cell) =>
        options.emit(
          'cellDoubleClick',
          cell.row,
          cell.columnId,
          cell.index,
          cell.columnIndex,
          event
        )
    );
  };

  const handleBodyContextmenu = (event: MouseEvent) => {
    emitRowAndCell(
      event,
      (hit) => options.emit('rowContextMenu', hit.row, hit.index, event),
      (cell) =>
        options.emit(
          'cellContextMenu',
          cell.row,
          cell.columnId,
          cell.index,
          cell.columnIndex,
          event
        )
    );
  };

  const handleBodyDragover = (event: DragEvent) => {
    if (options.getDragRowFromIndex() < 0) return;
    const hit = getEventRow(event);
    if (hit) options.onRowDragOver(hit.index, event);
  };

  const handleBodyMouseover = (event: MouseEvent) => {
    const hit = getEventRow(event);
    const relatedRowElement = findOwnedElement<Element>(
      event.relatedTarget,
      ROW_SELECTOR,
      event.currentTarget
    );
    if (hit && relatedRowElement !== hit.rowElement) {
      options.emit('rowMouseenter', hit.row, hit.index, event);
    }

    const cell = getEventCell(event, hit);
    if (!cell) return;
    const relatedCell = findOwnedElement<Element>(
      event.relatedTarget,
      CELL_SELECTOR,
      event.currentTarget
    );
    if (relatedCell === cell.cellElement) return;
    options.emit('cellMouseenter', cell.row, cell.columnId, cell.index, cell.columnIndex, event);
    if (options.getCellRangeMode() === 'cell') {
      options.onCellRangeMouseenter(cell.row.id, cell.columnId, event);
    }
  };

  const handleBodyMouseout = (event: MouseEvent) => {
    const hit = getEventRow(event);
    const relatedRowElement = findOwnedElement<Element>(
      event.relatedTarget,
      ROW_SELECTOR,
      event.currentTarget
    );
    if (hit && relatedRowElement !== hit.rowElement) {
      options.emit('rowMouseleave', hit.row, hit.index, event);
    }

    const cell = getEventCell(event, hit);
    if (!cell) return;
    const relatedCell = findOwnedElement<Element>(
      event.relatedTarget,
      CELL_SELECTOR,
      event.currentTarget
    );
    if (relatedCell === cell.cellElement) return;
    options.emit('cellMouseleave', cell.row, cell.columnId, cell.index, cell.columnIndex, event);
  };

  const handleBodyKeydown = (event: KeyboardEvent) => {
    const cell = getEventCell(event);
    if (!cell) return;
    options.emit('cellKeydown', cell.row, cell.columnId, cell.index, cell.columnIndex, event);
    if (event.defaultPrevented) return;
    if (!options.getKeyboardNavigation()) return;
    const isEditableTarget = Boolean(
      (event.target as Element | null)?.matches?.('input,select,textarea,[contenteditable]')
    );
    if (isEditableTarget) return;

    // Tab 从表格首格离开时先把焦点交给同表表头操作控件。
    // 表头在 DOM 中位于 tbody 之前，正常正向 Tab 会跳过它们；仅对首格做一次衔接，
    // 后续 Tab 继续按文档顺序离开表格，不改变网格内部的方向键导航。
    if (
      event.key === 'Tab' &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey
    ) {
      const body = event.currentTarget as HTMLElement;
      const firstCell = body.querySelector<HTMLElement>(
        'td.s-table-cell[data-column-id][tabindex]'
      );
      const currentCell = findOwnedElement<HTMLTableCellElement>(
        event.target,
        'td[tabindex]',
        event.currentTarget
      );
      if (firstCell && currentCell && firstCell === currentCell) {
        const headerTarget = currentCell
          .closest<HTMLElement>('.s-table')
          ?.querySelector<HTMLElement>(
            'thead .s-table-cell-title[tabindex], thead button:not([disabled]), thead [tabindex="0"]'
          );
        if (headerTarget) {
          event.preventDefault();
          headerTarget.focus();
          return;
        }
      }
    }

    // 框选快捷键：Ctrl/Cmd+A、Escape、Shift+方向键。
    if (options.getCellRangeMode()) {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        options.onCellRangeSelectAll?.();
        return;
      }
      if (event.key === 'Escape') {
        options.onCellRangeClear?.();
        return;
      }
      if (event.shiftKey && ARROW_KEYS.has(event.key)) {
        event.preventDefault();
        const direction =
          event.key === 'ArrowUp'
            ? 'up'
            : event.key === 'ArrowDown'
              ? 'down'
              : event.key === 'ArrowLeft'
                ? 'left'
                : 'right';
        options.onCellRangeExtend?.(direction);
      }
    }

    if (!ARROW_KEYS.has(event.key)) return;

    const current = findOwnedElement<HTMLTableCellElement>(
      event.target,
      'td[tabindex]',
      event.currentTarget
    );
    const currentRow = current?.closest('tr.s-table-row');
    if (!current || !currentRow) return;
    const currentColumnIndex = Number(current.dataset.colIndex);
    const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
    let candidate: Element | null = null;
    if (horizontal) {
      candidate =
        event.key === 'ArrowLeft' ? current.previousElementSibling : current.nextElementSibling;
      while (candidate && !candidate.matches('td[data-column-id][tabindex]')) {
        candidate =
          event.key === 'ArrowLeft'
            ? candidate.previousElementSibling
            : candidate.nextElementSibling;
      }
      // 横向虚拟化时窗口外列不在 DOM 中，DOM 相邻节点可能直接是左右固定列。
      // 索引不连续说明中间还有未渲染列，应交给表格层滚动并重新聚焦，避免整段跳过。
      if (candidate && Number.isFinite(currentColumnIndex)) {
        const candidateColumnIndex = Number((candidate as HTMLElement).dataset.colIndex);
        if (
          Number.isFinite(candidateColumnIndex) &&
          Math.abs(candidateColumnIndex - currentColumnIndex) > 1
        ) {
          candidate = null;
        }
      }
    } else {
      let nextRow =
        event.key === 'ArrowUp' ? currentRow.previousElementSibling : currentRow.nextElementSibling;
      while (nextRow && !nextRow.matches('tr.s-table-row')) {
        nextRow =
          event.key === 'ArrowUp' ? nextRow.previousElementSibling : nextRow.nextElementSibling;
      }
      const columnId = current.dataset.columnId;
      if (columnId) {
        candidate =
          nextRow?.querySelector(
            `td[data-column-id="${escapeCssAttributeValue(columnId)}"][tabindex]`
          ) ?? null;
      }
    }
    const focusTarget = candidate?.matches('[tabindex]') ? (candidate as HTMLElement) : undefined;
    if (!focusTarget) {
      // 虚拟滚动下相邻行/列可能不在 DOM 中，交给表格层滚动并重新聚焦。
      const rowIndex = Number(currentRow.getAttribute('data-row-index'));
      const columnIndex = Number(current.dataset.colIndex);
      if (
        Number.isFinite(rowIndex) &&
        Number.isFinite(columnIndex) &&
        options.onBoundaryNavigate?.(
          rowIndex,
          columnIndex,
          event.key === 'ArrowUp'
            ? 'up'
            : event.key === 'ArrowDown'
              ? 'down'
              : event.key === 'ArrowLeft'
                ? 'left'
                : 'right'
        )
      ) {
        event.preventDefault();
      }
      return;
    }
    event.preventDefault();
    focusTarget.focus();
  };

  return {
    handleBodyClick,
    handleBodyContextmenu,
    handleBodyDblclick,
    handleBodyDragover,
    handleBodyKeydown,
    handleBodyMousedown,
    handleBodyMouseout,
    handleBodyMouseover,
  };
};
