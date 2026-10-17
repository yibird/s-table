import type { STableCellRange, STableCellRangeCopyEvent, STableCopyOptions } from '../types';
import { serializeDelimitedCell } from '@zchengfeng/s-table-core';

type CellRangeCopySource = STableCellRangeCopyEvent['source'];

type CellRangeClipboardOptions = {
  getRange: () => STableCellRange | null;
  getColumnIds: () => readonly string[];
  getSelectedValues: () => readonly (readonly unknown[])[] | undefined;
  getColumnHeader: (columnId: string) => unknown;
  isInternalColumn: (columnId: string) => boolean;
};

const escapeCopiedValue = (
  value: unknown,
  delimiter: string,
  preventFormulaInjection: boolean
): string => {
  return serializeDelimitedCell(value, {
    delimiter,
    preventFormulaInjection,
  });
};

/**
 * 创建框选复制的纯序列化适配器。
 * TanStack 负责选区和值矩阵，本模块只负责把稳定的二维结果编码为剪贴板文本，
 * 因此不会引入 Vue 响应式，也不会在普通表格渲染时参与计算。
 */
export const createCellRangeClipboard = ({
  getRange,
  getColumnIds,
  getSelectedValues,
  getColumnHeader,
  isInternalColumn,
}: CellRangeClipboardOptions) => {
  const serialize = (
    options: STableCopyOptions = {},
    source: CellRangeCopySource,
    nativeEvent?: KeyboardEvent | ClipboardEvent
  ): STableCellRangeCopyEvent | null => {
    const range = getRange();
    if (!range) return null;

    const delimiter = options.delimiter ?? '\t';
    const preventFormulaInjection = options.preventFormulaInjection !== false;
    const columnIds = getColumnIds().filter((id) => !isInternalColumn(id));
    const selectedValues = getSelectedValues();
    if (!selectedValues) return null;

    const lines: string[] = [];
    if (options.includeHeaders) {
      lines.push(
        columnIds
          .map((id) => {
            const header = getColumnHeader(id);
            // header 可能是函数或 VNode；复制协议只承诺文本标题，无法安全渲染时回退列 ID。
            return escapeCopiedValue(
              typeof header === 'string' || typeof header === 'number' ? header : id,
              delimiter,
              preventFormulaInjection
            );
          })
          .join(delimiter)
      );
    }
    for (const values of selectedValues) {
      lines.push(
        values
          .map((value) => escapeCopiedValue(value, delimiter, preventFormulaInjection))
          .join(delimiter)
      );
    }

    return {
      range: { ...range },
      text: lines.join('\r\n'),
      columnIds,
      source,
      nativeEvent,
    };
  };

  return { serialize };
};
