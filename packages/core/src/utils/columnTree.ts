/** 列树最大层数（根列深度为 0）。 */
export const MAX_COLUMN_DEPTH = 20;

export type ColumnTreeNode<TNode = unknown> = {
  columns?: readonly TNode[];
};

export interface ColumnTreeTraversalOptions {
  maxDepth?: number;
  onUnsafe?: () => void;
}

export type SafeColumnChildren<TNode> = {
  children: readonly TNode[];
  ancestors: ReadonlySet<TNode>;
};

/**
 * 解析一个列节点可安全继续访问的子列。
 *
 * ancestors 只描述当前分支，因此同一列对象仍可合法复用于不同分支；只有回到当前
 * 祖先链的引用才会被视为循环。
 */
export const resolveSafeColumnChildren = <TNode extends ColumnTreeNode<TNode>>(
  column: TNode,
  depth: number,
  ancestors: ReadonlySet<TNode>,
  options: Readonly<ColumnTreeTraversalOptions> = {}
): SafeColumnChildren<TNode> => {
  const source = column.columns;
  if (!Array.isArray(source) || source.length === 0) {
    return { children: [], ancestors };
  }
  if (depth + 1 >= (options.maxDepth ?? MAX_COLUMN_DEPTH)) {
    options.onUnsafe?.();
    return { children: [], ancestors };
  }

  const nextAncestors = new Set(ancestors);
  nextAncestors.add(column);
  const children = source.filter((child) => {
    const safe = !nextAncestors.has(child);
    if (!safe) options.onUnsafe?.();
    return safe;
  });
  return { children, ancestors: nextAncestors };
};

export type ColumnTreeVisitor<TNode> = (
  column: TNode,
  depth: number,
  children: readonly TNode[]
) => void;

/** 按声明顺序前序遍历列树，并统一应用深度与循环保护。 */
export const walkColumnTree = <TNode extends ColumnTreeNode<TNode>>(
  columns: readonly TNode[],
  visitor: ColumnTreeVisitor<TNode>,
  options: Readonly<ColumnTreeTraversalOptions> = {}
): void => {
  type Frame = { column: TNode; depth: number; ancestors: ReadonlySet<TNode> };
  const stack: Frame[] = [];
  const rootAncestors = new Set<TNode>();
  for (let index = columns.length - 1; index >= 0; index--) {
    const column = columns[index];
    if (column) stack.push({ column, depth: 0, ancestors: rootAncestors });
  }

  while (stack.length > 0) {
    const frame = stack.pop()!;
    const resolved = resolveSafeColumnChildren(frame.column, frame.depth, frame.ancestors, options);
    visitor(frame.column, frame.depth, resolved.children);
    for (let index = resolved.children.length - 1; index >= 0; index--) {
      const child = resolved.children[index];
      if (child) {
        stack.push({
          column: child,
          depth: frame.depth + 1,
          ancestors: resolved.ancestors,
        });
      }
    }
  }
};
