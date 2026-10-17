<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import STable, {
  zh_CN,
  type STableCellRange,
  type STableCellRangeCopyEvent,
  type STableColumn,
  type STableColumnResizeEvent,
  type STableExpandable,
  type STableInstance,
  type STableRowSelection,
} from '../../../../packages/vue/src';

interface Person {
  id: number;
  name: string;
  department: string;
  score: number;
  detail: string;
}

const baseRows: Person[] = Array.from({ length: 5 }, (_, index) => ({
  id: index + 1,
  name: `Person ${index + 1}`,
  department: ['Engineering', 'Design', 'Sales'][index % 3]!,
  score: 90 - index * 3,
  detail: `Details for person ${index + 1}`,
}));

const columns: STableColumn<Person>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 70 },
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'department', accessorKey: 'department', header: 'Department' },
  { id: 'score', accessorKey: 'score', header: 'Score', width: 100 },
];

const selectionTableRef = ref<STableInstance<Person> | null>(null);
const selectedKeys = ref<(string | number)[]>([2]);
const expandedKeys = ref<(string | number)[]>([]);
const selectionEvent = shallowRef('idle');
const expansionEvent = shallowRef('idle');

const rowSelection: STableRowSelection<Person> = {
  type: 'checkbox',
  getCheckboxProps: (record) => ({ disabled: record.id === 3 }),
};
const expandable: STableExpandable<Person> = {
  isRowExpandable: (record) => record.id !== 4,
};

const selectAllFromApi = () => selectionTableRef.value?.selectAll();
const clearSelectionFromApi = () => selectionTableRef.value?.clearSelection();
const expandAllFromApi = () => selectionTableRef.value?.expandAll();
const collapseAllFromApi = () => selectionTableRef.value?.collapseAll();

const rangeTableRef = ref<STableInstance<Person> | null>(null);
const rangeValue = shallowRef('none');
const rangeRecords = shallowRef('none');
const rangeCopyEvent = shallowRef('none');
const blockRangeCopy = shallowRef(false);
const contextAction = shallowRef('none');
const rangeColumns: STableColumn<Person>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 70, fixed: 'left' },
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'department', accessorKey: 'department', header: 'Department' },
  { id: 'score', accessorKey: 'score', header: 'Score', width: 100, fixed: 'right' },
];

const handleRangeChange = (range: STableCellRange | null) => {
  rangeValue.value = range ? JSON.stringify(range) : 'none';
};

const clearRange = () => rangeTableRef.value?.clearCellRange();

const handleRangeCopy = (payload: STableCellRangeCopyEvent) => {
  rangeCopyEvent.value = `${payload.source}:${payload.text.replace(/\r?\n/g, '|')}`;
  return !blockRangeCopy.value;
};

const dragRows = ref<Person[]>(baseRows.map((row) => ({ ...row })));
const dragEvent = shallowRef('idle');
const columnEvent = shallowRef('idle');
const resizeEvent = shallowRef('idle');
const dragColumns: STableColumn<Person>[] = [
  {
    id: 'id',
    accessorKey: 'id',
    header: 'ID',
    width: 90,
    minWidth: 70,
    maxWidth: 180,
    resizable: true,
    draggable: true,
  },
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Name',
    width: 160,
    minWidth: 100,
    maxWidth: 260,
    resizable: true,
    draggable: true,
  },
  {
    id: 'score',
    accessorKey: 'score',
    header: 'Score',
    width: 120,
    minWidth: 80,
    maxWidth: 200,
    resizable: true,
    draggable: true,
  },
];

const handleRowOrderChange = (payload: {
  dataSource: Person[];
  fromIndex: number;
  toIndex: number;
}) => {
  dragRows.value = payload.dataSource;
  dragEvent.value = `${payload.fromIndex}->${payload.toIndex}`;
};

const handleColumnOrderChange = (payload: {
  columnOrder: string[];
  fromIndex: number;
  toIndex: number;
}) => {
  columnEvent.value = `${payload.fromIndex}->${payload.toIndex}:${payload.columnOrder.join(',')}`;
};

const handleResizeEnd = (payload: STableColumnResizeEvent<Person>) => {
  resizeEvent.value = `${payload.columnId}:${Math.round(payload.width)}`;
};
</script>

<template>
  <section class="fixture-section" data-testid="selection-expand-table">
    <h2>Selection and expansion</h2>
    <div class="fixture-controls">
      <button data-testid="api-select-all" type="button" @click="selectAllFromApi">
        API select all
      </button>
      <button data-testid="api-clear-selection" type="button" @click="clearSelectionFromApi">
        API clear selection
      </button>
      <button data-testid="api-expand-all" type="button" @click="expandAllFromApi">
        API expand all
      </button>
      <button data-testid="api-collapse-all" type="button" @click="collapseAllFromApi">
        API collapse all
      </button>
    </div>
    <output class="fixture-status" data-testid="selected-keys">{{ selectedKeys.join(',') }}</output>
    <output class="fixture-status" data-testid="expanded-keys">{{ expandedKeys.join(',') }}</output>
    <output class="fixture-status" data-testid="selection-event">{{ selectionEvent }}</output>
    <output class="fixture-status" data-testid="expansion-event">{{ expansionEvent }}</output>
    <STable
      ref="selectionTableRef"
      bordered
      row-key="id"
      :columns="columns"
      :data-source="baseRows"
      :row-selection="rowSelection"
      :expandable="expandable"
      :selected-row-keys="selectedKeys"
      :expanded-row-keys="expandedKeys"
      :locale="zh_CN"
      @update:selected-row-keys="selectedKeys = $event"
      @update:expanded-row-keys="expandedKeys = $event"
      @select-change="selectionEvent = `${$event.join(',')}`"
      @expand-change="expansionEvent = `${$event ? 'open' : 'close'}`"
    >
      <template #expandedRowRender="{ record }">
        <div :data-testid="`expanded-${record.id}`">{{ record.detail }}</div>
      </template>
    </STable>
  </section>

  <section class="fixture-section" data-testid="range-context-table">
    <h2>Cell range and context menu</h2>
    <div class="fixture-controls">
      <button data-testid="clear-range" type="button" @click="clearRange">Clear range</button>
      <button
        data-testid="toggle-copy-block"
        type="button"
        @click="blockRangeCopy = !blockRangeCopy"
      >
        {{ blockRangeCopy ? 'Allow copy' : 'Block copy' }}
      </button>
    </div>
    <output class="fixture-status" data-testid="range-value">{{ rangeValue }}</output>
    <output class="fixture-status" data-testid="range-records">{{ rangeRecords }}</output>
    <output class="fixture-status" data-testid="range-copy-event">{{ rangeCopyEvent }}</output>
    <output class="fixture-status" data-testid="context-action">{{ contextAction }}</output>
    <STable
      ref="rangeTableRef"
      bordered
      row-key="id"
      :columns="rangeColumns"
      :data-source="baseRows"
      :cell-range-selection="{ mode: 'cell' }"
      @cell-range-change="handleRangeChange"
      @cell-range-copy="handleRangeCopy"
      @cell-range-select="
        (_range, records) => (rangeRecords = records.map((row) => row.id).join(','))
      "
    >
      <template #contextMenu="{ row, rowIndex, close }">
        <div data-testid="context-menu">
          <span data-testid="context-row">{{ row?.id }}:{{ rowIndex }}</span>
          <button
            class="s-table-context-menu-item"
            data-testid="context-confirm"
            type="button"
            @click="
              contextAction = `confirmed:${row?.id}`;
              close();
            "
          >
            Confirm
          </button>
        </div>
      </template>
    </STable>
  </section>

  <section class="fixture-section" data-testid="drag-resize-table">
    <h2>Row drag, column drag and resize</h2>
    <output class="fixture-status" data-testid="drag-event">{{ dragEvent }}</output>
    <output class="fixture-status" data-testid="column-event">{{ columnEvent }}</output>
    <output class="fixture-status" data-testid="resize-event">{{ resizeEvent }}</output>
    <STable
      bordered
      :row-drag="{ animation: true }"
      :column-drag="{ animation: true }"
      row-key="id"
      column-resize-mode="onEnd"
      :columns="dragColumns"
      :data-source="dragRows"
      @row-order-change="handleRowOrderChange"
      @column-order-change="handleColumnOrderChange"
      @column-resize-end="handleResizeEnd"
    >
      <template #rowDragHandle="{ record }">
        <span :data-testid="`row-drag-${record.id}`">drag</span>
      </template>
    </STable>
  </section>
</template>
