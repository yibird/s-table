/** 内部注入列 id 的统一前缀。命名刻意冗长以规避与业务列 id 冲突。 */
const INTERNAL_COLUMN_ID_PREFIX = 'S_TABLE_INTERNAL_COLUMN__';

/** 行拖拽句柄列 id。 */
export const DRAG_COLUMN_ID = `${INTERNAL_COLUMN_ID_PREFIX}DRAG` as const;

/** 行选择列（Checkbox / Radio）id。 */
export const SELECTION_COLUMN_ID = `${INTERNAL_COLUMN_ID_PREFIX}SELECTION` as const;

/** 行展开列 id。 */
export const EXPAND_COLUMN_ID = `${INTERNAL_COLUMN_ID_PREFIX}EXPAND` as const;

/** 内置序号列 id。 */
export const SEQ_COLUMN_ID = `${INTERNAL_COLUMN_ID_PREFIX}SEQ` as const;

/** 全部内部注入列 id 集合（导出等场景需跳过这些列）。 */
export const INTERNAL_COLUMN_IDS = new Set<string>([
  DRAG_COLUMN_ID,
  SELECTION_COLUMN_ID,
  EXPAND_COLUMN_ID,
  SEQ_COLUMN_ID,
]);
