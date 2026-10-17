import type { STableRowData, STableTree } from '../types/row';

/**
 * 统一读取树形数据子节点：优先 getChildren，否则按 childrenColumnName 属性读取。
 * 三个消费方（row model 桥接、编辑替换、行拖拽）共用同一实现，避免语义漂移。
 */
export const getTreeChildren = <TData extends STableRowData>(
  record: TData,
  tree: STableTree<TData> | undefined
): TData[] | undefined => {
  if (!tree) return undefined;
  const children = tree.getChildren
    ? tree.getChildren(record)
    : ((record as Record<string, unknown>)[tree.childrenColumnName ?? 'children'] as
        | TData[]
        | undefined);
  return Array.isArray(children) ? children : undefined;
};

/** 统一写入树形数据子节点：优先 setChildren，否则不可变拷贝后替换 childrenColumnName 属性。 */
export const setTreeChildren = <TData extends STableRowData>(
  record: TData,
  tree: STableTree<TData>,
  children: TData[]
): TData => {
  if (tree.setChildren) return tree.setChildren(record, children);
  return {
    ...(record as Record<string, unknown>),
    [tree.childrenColumnName ?? 'children']: children,
  } as TData;
};
