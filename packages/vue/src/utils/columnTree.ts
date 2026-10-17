import {
  MAX_COLUMN_DEPTH,
  resolveSafeColumnChildren as resolveCoreColumnChildren,
  walkColumnTree as walkCoreColumnTree,
  type ColumnTreeTraversalOptions,
  type ColumnTreeVisitor,
  type SafeColumnChildren,
} from '@zchengfeng/s-table-core';

export { MAX_COLUMN_DEPTH };
export type { ColumnTreeTraversalOptions, ColumnTreeVisitor, SafeColumnChildren };

type VueColumnTreeNode<TNode> = { columns?: readonly TNode[] };

let unsafeColumnTreeWarned = false;
const warnUnsafeColumnTree = () => {
  if (unsafeColumnTreeWarned || !import.meta.env?.DEV) return;
  unsafeColumnTreeWarned = true;
  console.warn(
    `[STable] 列树存在循环引用或嵌套深度超过 ${MAX_COLUMN_DEPTH}，无效的更深层级已被截断。`
  );
};

const withVueWarning = (options: Readonly<ColumnTreeTraversalOptions>) => ({
  ...options,
  onUnsafe: () => {
    options.onUnsafe?.();
    warnUnsafeColumnTree();
  },
});

export const resolveSafeColumnChildren = <TNode extends VueColumnTreeNode<TNode>>(
  column: TNode,
  depth: number,
  ancestors: ReadonlySet<TNode>,
  options: Readonly<ColumnTreeTraversalOptions> = {}
): SafeColumnChildren<TNode> =>
  resolveCoreColumnChildren(column, depth, ancestors, withVueWarning(options));

export const walkColumnTree = <TNode extends VueColumnTreeNode<TNode>>(
  columns: readonly TNode[],
  visitor: ColumnTreeVisitor<TNode>,
  options: Readonly<ColumnTreeTraversalOptions> = {}
): void => walkCoreColumnTree(columns, visitor, withVueWarning(options));
