/**
 * 拆分 customRow / customCell / customHeaderCell 返回的属性。
 *
 * 结构属性由表格内部控制，用户输出中的同名键会被忽略；
 * class / style 单独返回，便于与内部类名、布局样式合并。
 */
const RESERVED_ATTRIBUTES = new Set([
  'colspan',
  'rowspan',
  'draggable',
  'data-row-id',
  'data-row-index',
  'data-row-key',
  'data-col-index',
  'data-column-id',
]);
const FORBIDDEN_ATTRIBUTES = new Set(['innerHTML', 'outerHTML', 'dangerouslySetInnerHTML']);

import type { ClassValue, StyleValue } from 'vue';

export interface SplitTableAttrs {
  class?: ClassValue;
  style?: StyleValue;
  attrs?: Record<string, unknown>;
}

export const splitTableAttrs = (
  input: Record<string, unknown> | undefined
): SplitTableAttrs | undefined => {
  if (!input) return undefined;
  const { class: className, style, ...rest } = input;
  const attrs: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (FORBIDDEN_ATTRIBUTES.has(key)) continue;
    if (RESERVED_ATTRIBUTES.has(key.toLowerCase())) continue;
    attrs[key] = value;
  }
  return {
    class: className as ClassValue,
    style: style as StyleValue,
    attrs: Object.keys(attrs).length > 0 ? attrs : undefined,
  };
};
