/** Core 只要求每行是可引用的数据结构，不依赖具体表格引擎的 RowData 类型。 */
export type STableRowData = object;

export type STableRowKey = string | number;

export interface STablePinnedRowKeys {
  top?: STableRowKey[];
  bottom?: STableRowKey[];
}

export type STableSelectionIntent =
  | { mode: 'all'; excludedRowKeys: STableRowKey[] }
  | { mode: 'include'; includedRowKeys: STableRowKey[] };

type STableStringKey<TData extends STableRowData> = Extract<keyof TData, string>;
type STableCompatibleRowKeyField<TData extends STableRowData> = {
  [TKey in STableStringKey<TData>]-?: TData[TKey] extends STableRowKey ? TKey : never;
}[STableStringKey<TData>];

/** 绑定具体行类型时只允许 string/number 字段；未绑定泛型时保留字符串兼容性。 */
export type STableRowKeyField<TData extends STableRowData> = [STableStringKey<TData>] extends [
  never,
]
  ? string
  : STableCompatibleRowKeyField<TData>;

export interface STableTree<TData extends STableRowData = STableRowData> {
  /** 子节点字段名。与 `getChildren` 二选一，默认 `children`。 */
  childrenColumnName?: Extract<keyof TData, string> | string;
  /** 自定义子节点读取函数。 */
  getChildren?: (record: TData) => TData[] | undefined;
  /** 使用自定义 `getChildren` 且需要编辑/树拖拽时，用于不可变写回子节点。 */
  setChildren?: (record: TData, children: TData[]) => TData;
  /** 树节点每一层的缩进宽度（px）。 */
  indentSize?: number;
}
