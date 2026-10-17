/** 横向虚拟化的渲染窗口项：真实列或用于占位的 spacer。 */
export type STableRenderedColumn =
  | { type: 'column'; id: string }
  | { type: 'spacer'; id: string; colSpan: number; width: number };
