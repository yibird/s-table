<template>
  <div
    :class="[
      's-table-header-resizer',
      {
        's-table-header-resizer-active': header.column.getIsResizing(),
        's-table-header-resizer-disabled': !header.column.getCanResize(),
      },
    ]"
    role="separator"
    aria-orientation="vertical"
    :aria-label="locale.accessibility.resizeColumn"
    :aria-valuenow="header.getSize()"
    :aria-valuemin="header.column.columnDef.minSize ?? 20"
    :aria-valuemax="header.column.columnDef.maxSize ?? Number.MAX_SAFE_INTEGER"
    :tabindex="header.column.getCanResize() ? 0 : -1"
    @mousedown.stop="handleResizeStart"
    @touchstart.stop="handleResizeStart"
    @keydown="handleResizeKeydown"
  ></div>
</template>
<script lang="ts" setup generic="TData extends RowData = RowData">
import type { Header, RowData, TableFeatures } from '@tanstack/vue-table';
import { useLocales } from '../../locales/useLocales';

const locale = useLocales();

const props = defineProps<{
  header: Header<TableFeatures, TData>;
}>();

/** 在列允许调整宽度时启动 TanStack 的尺寸拖拽处理。 */
const handleResizeStart = (event: MouseEvent | TouchEvent) => {
  if (!props.header.column.getCanResize()) {
    return;
  }

  // 可拖拽表头中的手柄必须阻止浏览器默认 dragstart，否则移动鼠标会重排列并中断列宽调整。
  event.preventDefault();
  props.header.getResizeHandler()(event);
};

/** 键盘调整直接提交到 TanStack columnSizing，保持鼠标与键盘共用同一状态源。 */
const handleResizeKeydown = (event: KeyboardEvent) => {
  if (!props.header.column.getCanResize() || !['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    return;
  }
  event.preventDefault();
  const column = props.header.column;
  const step = event.shiftKey ? 1 : 10;
  const minSize = column.columnDef.minSize ?? 20;
  const maxSize = column.columnDef.maxSize ?? Number.MAX_SAFE_INTEGER;
  const direction = event.key === 'ArrowRight' ? 1 : -1;
  const nextSize = Math.min(maxSize, Math.max(minSize, column.getSize() + direction * step));
  props.header.table.setColumnSizing((current) => ({ ...current, [column.id]: nextSize }));
};
</script>
