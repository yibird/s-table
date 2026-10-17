import type { VirtualItem } from '@tanstack/vue-virtual';
import type { STableEditingState } from '../../types';

/** 虚拟滚动 API（父层预计算直传，保持热路径稳定性）。 */
export type BodyVirtualApi = {
  enabled: boolean;
  items: VirtualItem[];
  topSpacerHeight: number;
  bottomSpacerHeight: number;
  measureElement: (el: Element | null) => void;
  measureExpandedElement: (rowId: string, el: Element | null) => void;
};

/** 编辑 API（父层预计算直传）。 */
export type BodyEditingApi = {
  state: STableEditingState | null;
  commitOnBlur?: boolean;
  onSetValue: (columnId: string, value: unknown) => void;
  onCommit: () => Promise<boolean>;
  onCancel: () => void;
};
