import type { STableCellRangeSelection } from '../types';

/**
 * 归一化单元格框选配置。
 * 支持布尔值、'single' 以及完整配置对象，对齐 Surely Vue 的使用方式。
 */
export const normalizeCellRangeSelection = (
  config: boolean | 'single' | STableCellRangeSelection | undefined
): STableCellRangeSelection | undefined => {
  if (config === true) {
    return { mode: 'cell', multi: true };
  }
  if (config === 'single') {
    return { mode: 'cell', multi: false };
  }
  if (!config || typeof config !== 'object') {
    return undefined;
  }
  return {
    ...config,
    mode: config.mode ?? 'cell',
  };
};

/**
 * 解析 `rangeSelection` 别名与 `cellRangeSelection`。
 *
 * 布尔 prop 未显式传入时会被 Vue 转成 `false`，因此不能直接用 `??`：
 * 只有 truthy 的别名才覆盖旧属性，避免未声明的 `rangeSelection` 把
 * 已传入的 `cellRangeSelection` 对象吞掉。
 */
export const resolveCellRangeSelection = (
  rangeSelection: boolean | 'single' | STableCellRangeSelection | undefined,
  cellRangeSelection: boolean | 'single' | STableCellRangeSelection | undefined
): STableCellRangeSelection | undefined =>
  normalizeCellRangeSelection(rangeSelection || cellRangeSelection);
