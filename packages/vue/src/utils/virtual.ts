export type STableVirtualValue = boolean | { y?: boolean; x?: boolean } | undefined;

/** `true` 保留历史语义，仅代表开启纵向虚拟化。 */
export const isRowVirtualEnabled = (virtual: STableVirtualValue): boolean =>
  virtual === true || (typeof virtual === 'object' && virtual !== null && virtual.y === true);

export const isColumnVirtualEnabled = (virtual: STableVirtualValue): boolean =>
  typeof virtual === 'object' && virtual !== null && virtual.x === true;
