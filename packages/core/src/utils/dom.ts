/**
 * 框架无关的 DOM / CSS 工具。
 *
 * 仅依赖浏览器 DOM API（core 的 interaction/scroll 模块同样直接接触 DOM），
 * 不依赖任何框架，供 Vue / React / Solid 等适配层复用。
 */

/**
 * Return the document that owns a DOM node or document.
 *
 * A `Document` has no useful `ownerDocument`, so checking that case explicitly
 * avoids accidentally falling back to the global document when working with an
 * iframe or another document context.
 */
export const getOwnerDocument = (node?: Node | Document | null): Document | undefined => {
  if (node?.nodeType === 9) return node as Document;
  return node?.ownerDocument ?? (typeof document !== 'undefined' ? document : undefined);
};

/** Return the window associated with a DOM node or document. */
export const getOwnerWindow = (node?: Node | Document | null): Window | undefined =>
  getOwnerDocument(node)?.defaultView ?? (typeof window !== 'undefined' ? window : undefined);

/** Escape a value interpolated into a quoted CSS attribute selector. */
export const escapeCssAttributeValue = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\n\r\f]/g, ' ');
