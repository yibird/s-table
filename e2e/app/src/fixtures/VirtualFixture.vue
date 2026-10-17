<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import STable, {
  type STableCellEvent,
  type STableColumn,
  type STableExpandable,
  type STableInstance,
  type STablePaginationProps,
  type STableRowSelection,
  type STableVirtualProps,
} from '../../../../packages/vue/src';

interface VirtualRow {
  id: number;
  name: string;
  group: string;
  value: number;
  detail: string;
}

const createRows = (count: number): VirtualRow[] =>
  Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    return {
      id,
      name: `Virtual ${String(id).padStart(5, '0')}`,
      group: `Group ${id % 10}`,
      value: id * 2,
      detail: `Expanded virtual row ${id}`,
    };
  });

const fullRows = createRows(20_000);
// 大数据源按根引用替换，避免 Vue 为 2 万条只读记录创建深层代理。
const rows = shallowRef<VirtualRow[]>(fullRows);
const tableRef = ref<STableInstance<VirtualRow> | null>(null);
const selectedKeys = ref<(string | number)[]>([]);
const expandedKeys = ref<(string | number)[]>([]);
const bottomEvents = shallowRef(0);
const apiStatus = shallowRef('idle');
const wideTableRef = ref<STableInstance<VirtualRow> | null>(null);
const columnApiStatus = shallowRef('idle');
const cellEventStatus = shallowRef('idle');

const columns: STableColumn<VirtualRow>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 90, fixed: 'left' },
  { id: 'name', accessorKey: 'name', header: 'Name', width: 180 },
  { id: 'group', accessorKey: 'group', header: 'Group', width: 130 },
  { id: 'value', accessorKey: 'value', header: 'Value', width: 120 },
];
const rowSelection: STableRowSelection<VirtualRow> = { type: 'checkbox' };
const expandable: STableExpandable<VirtualRow> = {};
const virtualConfig: STableVirtualProps = {
  y: true,
  x: false,
  rowHeight: 36,
  overscan: 6,
  scrollToBottomOffset: 0,
};

const wideColumns: STableColumn<VirtualRow>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 90, fixed: 'left' },
  { id: 'name', accessorKey: 'name', header: 'Name', width: 180, fixed: 'left' },
  ...Array.from({ length: 80 }, (_, index): STableColumn<VirtualRow> => ({
    id: `metric-${index + 1}`,
    header: `Metric ${index + 1}`,
    width: 120,
    accessorFn: (record) => record.value + index,
  })),
  {
    id: 'tail',
    header: 'Tail',
    width: 120,
    fixed: 'right',
    accessorFn: (record) => record.detail,
  },
];
const wideRows = fullRows.slice(0, 500);
const pagedRows = fullRows.slice(0, 65);
const virtualPagination: STablePaginationProps = {
  defaultCurrent: 2,
  defaultPageSize: 20,
};
const wideVirtualConfig: STableVirtualProps = {
  y: true,
  x: true,
  rowHeight: 36,
  overscan: 6,
  columnOverscan: 2,
};

const scrollToTarget = () => {
  tableRef.value?.scrollToRow(15_000);
  apiStatus.value = 'scroll:15000';
};

const selectTarget = () => {
  tableRef.value?.toggleRowSelection(fullRows[14_999]!, true);
  apiStatus.value = 'select:15000';
};

const expandTarget = () => {
  tableRef.value?.expandRow(15_000);
  apiStatus.value = 'expand:15000';
};

const shrinkRows = () => {
  rows.value = fullRows.slice(0, 25);
  apiStatus.value = 'rows:25';
};

const resetRows = () => {
  rows.value = fullRows;
  apiStatus.value = 'rows:20000';
};

const scrollToLastColumn = () => {
  wideTableRef.value?.scrollToColumn('metric-80');
  columnApiStatus.value = 'column:metric-80';
};

const handleWideCellClick = (payload: STableCellEvent<VirtualRow>) => {
  cellEventStatus.value = `${payload.columnId}:${payload.record.id}:${payload.columnIndex}`;
};
</script>

<template>
  <section class="fixture-section" data-testid="virtual-table">
    <h2>Virtual table and public API</h2>
    <div class="fixture-controls">
      <button data-testid="scroll-target" type="button" @click="scrollToTarget">
        Scroll to 15000
      </button>
      <button data-testid="scroll-top" type="button" @click="tableRef?.scrollToTop()">
        Scroll top
      </button>
      <button data-testid="scroll-bottom" type="button" @click="tableRef?.scrollToBottom()">
        Scroll bottom
      </button>
      <button data-testid="select-target" type="button" @click="selectTarget">Select 15000</button>
      <button data-testid="expand-target" type="button" @click="expandTarget">Expand 15000</button>
      <button data-testid="shrink-rows" type="button" @click="shrinkRows">Shrink to 25</button>
      <button data-testid="reset-rows" type="button" @click="resetRows">Reset rows</button>
    </div>
    <output class="fixture-status" data-testid="api-status">{{ apiStatus }}</output>
    <output class="fixture-status" data-testid="virtual-selected">
      {{ selectedKeys.join(',') || 'none' }}
    </output>
    <output class="fixture-status" data-testid="virtual-expanded">
      {{ expandedKeys.join(',') || 'none' }}
    </output>
    <output class="fixture-status" data-testid="bottom-events">{{ bottomEvents }}</output>
    <STable
      ref="tableRef"
      bordered
      row-key="id"
      style="height: 320px"
      :columns="columns"
      :data-source="rows"
      :virtual="virtualConfig"
      :seq="true"
      :row-selection="rowSelection"
      :expandable="expandable"
      :selected-row-keys="selectedKeys"
      :expanded-row-keys="expandedKeys"
      @update:selected-row-keys="selectedKeys = $event"
      @update:expanded-row-keys="expandedKeys = $event"
      @scroll-to-bottom="bottomEvents += 1"
    >
      <template #expandedRowRender="{ record }">
        <div :data-testid="`virtual-expanded-${record.id}`">{{ record.detail }}</div>
      </template>
      <template #scrollToBottom>
        <div data-testid="bottom-slot">Reached bottom</div>
      </template>
    </STable>
  </section>

  <section class="fixture-section" data-testid="bidirectional-virtual-table">
    <h2>Bidirectional virtual table</h2>
    <div class="fixture-controls">
      <button data-testid="scroll-last-column" type="button" @click="scrollToLastColumn">
        Scroll to last column
      </button>
    </div>
    <output class="fixture-status" data-testid="column-api-status">
      {{ columnApiStatus }}
    </output>
    <output class="fixture-status" data-testid="column-cell-event">
      {{ cellEventStatus }}
    </output>
    <STable
      ref="wideTableRef"
      row-key="id"
      style="height: 280px"
      :columns="wideColumns"
      :data-source="wideRows"
      :virtual="wideVirtualConfig"
      @cell-click="handleWideCellClick"
    />
  </section>

  <section class="fixture-section" data-testid="paginated-virtual-table">
    <h2>Paginated virtual table</h2>
    <STable
      bordered
      row-key="id"
      style="height: 220px"
      :columns="columns"
      :data-source="pagedRows"
      :pagination="virtualPagination"
      :virtual="virtualConfig"
    />
  </section>
</template>
