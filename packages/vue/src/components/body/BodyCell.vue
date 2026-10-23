<template>
  <td
    v-if="!isCellHidden"
    ref="cellRef"
    v-bind="mergedAttrs"
    :class="[
      's-table-cell',
      fixedClassName,
      rangeClasses,
      bodyCellClass,
      customAttrs?.class,
      { 's-table-cell-ellipsis': ellipsis, 's-table-cell-auto-height': autoHeight },
    ]"
    :style="[fixedStyle, alignStyle, treeIndentStyle, bodyCellStyle, customAttrs?.style]"
    :data-row-index="rowIndex"
    :data-col-index="colIndex"
    :data-row-id="cell.row.id"
    :data-column-id="cell.column.id"
    :tabindex="focusable ? -1 : undefined"
    :title="cellTitle"
  >
    <template v-if="editing">
      <slot
        name="editor"
        :record="record"
        :row-key="rowKey"
        :row-index="rowIndex"
        :column="rawColumn!"
        :column-id="cell.column.id"
        :value="editValue"
        :set-value="setValue"
        :commit="commit"
        :cancel="cancel"
      >
        <input
          class="s-table-cell-editor"
          :type="
            editorType === 'number' ? 'number' : editorType === 'checkbox' ? 'checkbox' : 'text'
          "
          :checked="editorType === 'checkbox' ? Boolean(editValue) : undefined"
          :value="editorType === 'checkbox' ? undefined : (editValue ?? '')"
          @input="handleInput"
          @keydown.enter.prevent="requestCommitAndFocus"
          @keydown.esc.prevent="cancelAndFocus"
          @blur="handleEditorBlur"
        />
      </slot>
    </template>
    <CachedCellContent v-else :state="cellRenderState" />
  </td>
</template>

<script lang="ts" setup generic="TData extends RowData = RowData">
import type { CSSProperties } from 'vue';
import { computed, nextTick, ref } from 'vue';
import type { Cell, RowData, TableFeatures } from '@tanstack/vue-table';
import type { STableCellEditorSlotContext, STableCellProps, STableRowKey } from '../../types';
import CachedCellContent from './CachedCellContent';
import type { CachedCellRenderState } from './cellRenderCache';
import type { SplitTableAttrs } from '../../utils/mergeTableAttrs';

// BodyCell 是「可见行数 × 列数」级别的热路径组件，刻意保持轻量：
// - 不 inject / reactive 包装 context（context 由父层 Body 注入一次即可）；
// - 不做按列 ID 的递归查找（onCell、固定列样式、列索引均由父层预计算后以 props 传入）。
// 这样每个单元格只保留最小的 per-cell 派生计算（onCell 合并 / span），
// 避免大表格下的 O(可见单元格 × 列树) 放大。

const props = defineProps<{
  cell: Cell<TableFeatures, TData>;
  /** 行数据（用于 onCell 求值）。 */
  record: TData;
  /** 已由父层解码的公开行键，避免每个复杂单元格重复解析 TanStack row.id。 */
  rowKey: STableRowKey;
  /** 行索引。 */
  rowIndex: number;
  /** 列索引（visibleColumnIds 中的位置，父层 O(1) 预查）。 */
  colIndex: number;
  /** 固定列 class（父层预计算）。 */
  fixedClassName?: string;
  /** 固定列 style（父层预计算）。 */
  fixedStyle?: CSSProperties;
  /** 列对齐（父层预计算，避免每格再查 column.align）。 */
  alignStyle?: CSSProperties;
  /** 树形层级缩进，仅首个业务列会收到该样式。 */
  treeIndentStyle?: CSSProperties;
  /** 框选边缘 CSS 类。 */
  rangeClasses?: Record<string, boolean>;
  /**
   * 该列的 onCell 回调（父层按列预解析后传入，非 onCell 列为 undefined）。
   * 避免每个单元格递归查列配置。
   */
  resolveCellProps?: (record: TData, rowIndex: number) => STableCellProps;
  /** body cell 语义化 class（父层从 context 提取一次）。 */
  bodyCellClass?: string;
  /** body cell 语义化 style（父层从 context 提取一次）。 */
  bodyCellStyle?: CSSProperties;
  /** 编辑态。 */
  editing?: boolean;
  editValue?: unknown;
  editorType?: 'text' | 'number' | 'checkbox';
  commitOnBlur?: boolean;
  rawColumn?: import('../../types').STableColumn<TData>;
  focusable?: boolean;
  onSetEditValue?: (columnId: string, value: unknown) => void;
  onCommitEdit?: () => Promise<boolean>;
  onCancelEdit?: () => void;
  cellRenderState: CachedCellRenderState;
  /** customCell 拆分后的属性。 */
  customAttrs?: SplitTableAttrs;
  /** 是否应用超长省略样式。 */
  ellipsis?: boolean;
  /** 是否允许内容撑高单元格。 */
  autoHeight?: boolean;
}>();

/** 自定义编辑器插槽：与表格公开的 `cellEditor` 共享同一套作用域类型。 */
defineSlots<{
  editor?: (scope: STableCellEditorSlotContext<TData>) => unknown;
}>();

const cellRef = ref<HTMLTableCellElement | null>(null);
const setValue = (value: unknown) => props.onSetEditValue?.(props.cell.column.id, value);
const commit = () => props.onCommitEdit?.() ?? Promise.resolve(false);
const cancel = () => props.onCancelEdit?.();
/** DOM 事件不能等待异步校验；在组件边界处理拒绝，避免产生未处理 Promise。 */
const requestCommit = () => {
  commit().catch(() => false);
};
/** 键盘提交成功后把焦点还给单元格（编辑器卸载后焦点默认会落到 body）。 */
const focusCell = () => {
  nextTick(() => cellRef.value?.focus());
};
const requestCommitAndFocus = () => {
  commit()
    .then((committed) => {
      if (committed) focusCell();
      return committed;
    })
    .catch(() => false);
};
/** Esc 取消编辑后同样归还单元格焦点。 */
const cancelAndFocus = () => {
  cancel();
  focusCell();
};
const handleEditorBlur = () => {
  if (props.commitOnBlur) requestCommit();
};
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const value =
    props.editorType === 'number'
      ? target.value === ''
        ? undefined
        : Number(target.value)
      : props.editorType === 'checkbox'
        ? target.checked
        : target.value;
  setValue(value);
};

// ==================== onCell 合并 ====================

/**
 * 获取单元格的 onCell 返回值。仅当该列声明了 onCell 时才有值。
 */
const cellProps = computed<STableCellProps | undefined>(() => {
  if (typeof props.resolveCellProps !== 'function') return undefined;
  return props.resolveCellProps(props.record, props.rowIndex);
});

/**
 * 判断单元格是否被合并隐藏（rowSpan === 0 或 colSpan === 0）。
 */
const isCellHidden = computed<boolean>(() => {
  if (props.cell.getIsCovered()) return true;
  const cp = cellProps.value;
  if (!cp) return false;
  return cp.rowSpan === 0 || cp.colSpan === 0;
});

/**
 * 获取单元格的 colspan / rowspan HTML 属性。
 */
const spanAttrs = computed<Record<string, number> | undefined>(() => {
  const cp = cellProps.value;
  const attrs: Record<string, number> = {};
  const colSpan = cp?.colSpan ?? props.cell.getColSpan();
  const rowSpan = cp?.rowSpan ?? props.cell.getRowSpan();
  if (colSpan > 1) attrs.colspan = colSpan;
  if (rowSpan > 1) attrs.rowspan = rowSpan;
  return Object.keys(attrs).length > 0 ? attrs : undefined;
});

/** 自定义属性与合并后 span 属性一次绑定；onCell 的 span 结果优先。 */
const mergedAttrs = computed<Record<string, unknown> | undefined>(() => {
  const custom = props.customAttrs?.attrs;
  const spans = spanAttrs.value;
  if (!custom && !spans) return undefined;
  return { ...custom, ...spans };
});

/** 原生 title 只来自 customCell。 */
const cellTitle = computed(() => mergedAttrs.value?.title as string | undefined);
</script>
