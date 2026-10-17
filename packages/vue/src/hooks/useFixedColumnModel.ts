import { computed, type Ref, type ShallowRef } from 'vue';
import type { RowData, Table, TableFeatures } from '@tanstack/vue-table';
import { useRafValue } from './useRafValue';
import type { STableFixedColumnStyle } from '../utils/columnMetrics';

export type { STableFixedColumnStyle } from '../utils/columnMetrics';

type FixedColumnModel = {
  styles: Map<string, STableFixedColumnStyle>;
  variables: Record<string, string>;
};

type UseSTableFixedColumnModelOptions<TData extends RowData> = {
  table: Table<TableFeatures, TData>;
  /** 列宽拖拽 onChange 模式下合帧同步固定列偏移。 */
  shouldRafSyncSizing: Readonly<Ref<boolean>>;
};

const sameVariables = (left: Record<string, string>, right: Record<string, string>) => {
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  return keys.every((key) => left[key] === right[key]);
};

/**
 * 固定列样式模型：
 * sticky 偏移放在 table 根节点的 CSS 变量中，单元格只持有稳定的 var(...) 样式。
 * 列宽变化因此只更新 table style，不再让每个可见行的 v-memo 失效。
 * 样式对象与变量对象均做引用保留，未变化时返回上一份快照。
 */
export const useFixedColumnModel = <TData extends RowData>({
  table,
  shouldRafSyncSizing,
}: UseSTableFixedColumnModelOptions<TData>) => {
  const fixedStyleCache = new Map<
    string,
    {
      position: 'left' | 'right';
      variableName: string;
      style: STableFixedColumnStyle;
    }
  >();
  let nextFixedVariableId = 0;
  let previousFixedColumnModel: FixedColumnModel = { styles: new Map(), variables: {} };

  /** 计算固定列的稳定样式与当前偏移变量。 */
  const calculateFixedColumnModel = (): FixedColumnModel => {
    const nextFixedColumnStyles = new Map<string, STableFixedColumnStyle>();
    const nextFixedColumnVariables: Record<string, string> = {};
    const seen = new Set<string>();

    /** 为叶子列或完整固定的分组表头登记可复用 sticky 样式。 */
    const registerStyle = (columnId: string, pinnedPosition: 'left' | 'right', offset: string) => {
      seen.add(columnId);
      const cached = fixedStyleCache.get(columnId);
      const variableName =
        cached?.variableName ?? `--s-table-fixed-offset-${nextFixedVariableId++}`;
      nextFixedColumnVariables[variableName] = offset;

      if (cached && cached.position === pinnedPosition) {
        nextFixedColumnStyles.set(columnId, cached.style);
        return;
      }

      const variableValue = `var(${variableName})`;
      const style: STableFixedColumnStyle = {
        className: `s-table-cell-fixed-${pinnedPosition}`,
        headerStyle: {
          position: 'sticky',
          // 与 token.less 的语义层级保持一致：表头固定格 = cell-fixed + 1，表体固定格 = cell-fixed。
          zIndex: 'calc(var(--s-z-index-cell-fixed) + 1)',
          left: pinnedPosition === 'left' ? variableValue : undefined,
          right: pinnedPosition === 'right' ? variableValue : undefined,
        },
        bodyStyle: {
          position: 'sticky',
          zIndex: 'var(--s-z-index-cell-fixed)',
          left: pinnedPosition === 'left' ? variableValue : undefined,
          right: pinnedPosition === 'right' ? variableValue : undefined,
        },
      };

      fixedStyleCache.set(columnId, { position: pinnedPosition, variableName, style });
      nextFixedColumnStyles.set(columnId, style);
    };

    // 直接使用 TanStack 的固定区可见列模型，只遍历实际固定列；大量中间列不会进入 resize 热路径。
    const startColumns = table.getStartVisibleLeafColumns();
    const endColumns = table.getEndVisibleLeafColumns();

    for (const column of startColumns) {
      registerStyle(column.id, 'left', `${column.getStart('start')}px`);
    }
    for (const column of endColumns) {
      registerStyle(column.id, 'right', `${column.getAfter('end')}px`);
    }

    // TanStack 的尺寸 offset 索引以叶子列为键，分组列自身 getStart/getAfter 会回退为 0。
    // 对“全部可见叶子都固定在同一侧”的分组表头，用首/末叶子计算其真实 sticky 偏移。
    const headerGroups = table.getHeaderGroups();
    if (headerGroups.length > 1) {
      for (const headerGroup of headerGroups) {
        for (const header of headerGroup.headers) {
          const column = header.column;
          const leaves = column.getLeafColumns();
          if (leaves.length <= 1 || seen.has(column.id)) continue;
          const logicalPosition = column.getIsPinned();
          if (!logicalPosition) continue;

          let firstVisibleLeaf: (typeof leaves)[number] | undefined;
          let lastVisibleLeaf: (typeof leaves)[number] | undefined;
          let allVisibleLeavesPinned = true;
          for (const leaf of leaves) {
            if (!leaf.getIsVisible()) continue;
            firstVisibleLeaf ??= leaf;
            lastVisibleLeaf = leaf;
            if (leaf.getIsPinned() !== logicalPosition) allVisibleLeavesPinned = false;
          }
          if (!firstVisibleLeaf || !lastVisibleLeaf || !allVisibleLeavesPinned) continue;

          const pinnedPosition = logicalPosition === 'start' ? 'left' : 'right';
          const boundaryLeaf = pinnedPosition === 'left' ? firstVisibleLeaf : lastVisibleLeaf;
          const offset = `${
            logicalPosition === 'start'
              ? boundaryLeaf.getStart('start')
              : boundaryLeaf.getAfter('end')
          }px`;
          registerStyle(column.id, pinnedPosition, offset);
        }
      }
    }

    // 清理已不再固定 / 不可见的列缓存，避免缓存无限增长。
    for (const id of fixedStyleCache.keys()) {
      if (!seen.has(id)) fixedStyleCache.delete(id);
    }

    let stableStyles = previousFixedColumnModel.styles;
    if (stableStyles.size === nextFixedColumnStyles.size) {
      let stylesMatch = true;
      for (const [id, style] of nextFixedColumnStyles) {
        if (stableStyles.get(id) !== style) {
          stylesMatch = false;
          break;
        }
      }
      if (!stylesMatch) stableStyles = nextFixedColumnStyles;
    } else {
      stableStyles = nextFixedColumnStyles;
    }

    const stableVariables = sameVariables(
      previousFixedColumnModel.variables,
      nextFixedColumnVariables
    )
      ? previousFixedColumnModel.variables
      : nextFixedColumnVariables;
    if (
      stableStyles === previousFixedColumnModel.styles &&
      stableVariables === previousFixedColumnModel.variables
    ) {
      return previousFixedColumnModel;
    }
    previousFixedColumnModel = { styles: stableStyles, variables: stableVariables };
    return previousFixedColumnModel;
  };

  const fixedColumnModel = useRafValue(calculateFixedColumnModel, {
    enabled: shouldRafSyncSizing,
  }) as ShallowRef<FixedColumnModel>;
  const fixedColumnStyles = computed(() => fixedColumnModel.value.styles);

  return { fixedColumnModel, fixedColumnStyles };
};
