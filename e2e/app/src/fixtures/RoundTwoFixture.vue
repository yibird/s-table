<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import STable, {
  type STableColumn,
  type STableInstance,
  type STablePinnedRowKeys,
  type STablePaginationProps,
} from '../../../../packages/vue/src';

interface Order {
  id: number;
  department: string;
  name: string;
  amount: number;
}

const orders: Order[] = [
  { id: 1, department: 'Engineering', name: 'Ada', amount: 10 },
  { id: 2, department: 'Engineering', name: 'Grace', amount: 20 },
  { id: 3, department: 'Design', name: 'Linus', amount: 30 },
  { id: 4, department: 'Design', name: 'Ken', amount: 40 },
  { id: 5, department: 'Sales', name: 'Margaret', amount: 50 },
  { id: 6, department: 'Sales', name: 'Dennis', amount: 60 },
];

const groupedColumns: STableColumn<Order>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 70 },
  { id: 'department', accessorKey: 'department', header: 'Department', groupable: true },
  { id: 'name', accessorKey: 'name', header: 'Name' },
  {
    id: 'amount',
    accessorKey: 'amount',
    header: 'Amount',
    width: 130,
    aggregation: 'sum',
    aggregatedCell: ({ cell }) => `Total ${cell.getValue()}`,
  },
];
const groupedTableRef = ref<STableInstance<Order> | null>(null);
const groupEvent = shallowRef('idle');
const groupedSelectedKeys = ref<(string | number)[]>([]);

const menuFilterColumns: STableColumn<Order>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 70 },
  { id: 'name', accessorKey: 'name', header: 'Name' },
  {
    id: 'department',
    accessorKey: 'department',
    header: 'Department',
    filters: ['Engineering', 'Design', 'Sales'].map((department) => ({
      text: department,
      value: department,
    })),
    onFilter: (value, record) => record.department === value,
    filterMultiple: false,
  },
];
const menuFilterEvent = shallowRef('idle');

const tallRows: Order[] = Array.from({ length: 40 }, (_, index) => ({
  id: index + 1,
  department: ['Engineering', 'Design', 'Sales'][index % 3]!,
  name: `Tall ${index + 1}`,
  amount: (index + 1) * 10,
}));
const tallPinnedKeys = ref<Required<STablePinnedRowKeys>>({ top: [2], bottom: [39] });

const pinningColumns: STableColumn<Order>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 70 },
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'amount', accessorKey: 'amount', header: 'Amount', width: 110 },
];
const pinnedKeys = ref<Required<STablePinnedRowKeys>>({ top: [2], bottom: [5] });
const pinningTableRef = ref<STableInstance<Order> | null>(null);
const pinEvent = shallowRef('idle');

const radioColumns: STableColumn<Order>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 70 },
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'department', accessorKey: 'department', header: 'Department' },
];
const radioSelected = ref<(string | number)[]>([2]);
const radioEvent = shallowRef('idle');

const customFilterColumns: STableColumn<Order>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 70 },
  { id: 'name', accessorKey: 'name', header: 'Name' },
  {
    id: 'department',
    accessorKey: 'department',
    header: 'Department',
    filterMode: 'custom',
    onFilter: (value, record) => record.department === value,
  },
];
const customFilterEvent = shallowRef('idle');

const rowEditColumns: STableColumn<Order>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 70 },
  { id: 'name', accessorKey: 'name', header: 'Name', editable: true },
  { id: 'amount', accessorKey: 'amount', header: 'Amount', editable: true, editor: 'number' },
];
const editableRows = ref<Order[]>(orders.map((row) => ({ ...row })));
const editTableRef = ref<STableInstance<Order> | null>(null);
const rowEditEvent = shallowRef('idle');

const manualPage = ref(1);
const manualPageSize = ref(5);
const manualTotal = 23;
const allManualRows: Order[] = Array.from({ length: manualTotal }, (_, index) => ({
  id: index + 1,
  department: ['Engineering', 'Design', 'Sales'][index % 3]!,
  name: `Manual ${index + 1}`,
  amount: index + 1,
}));
const manualRows = computed(() =>
  allManualRows.slice(
    (manualPage.value - 1) * manualPageSize.value,
    manualPage.value * manualPageSize.value
  )
);
const manualPagination = computed<STablePaginationProps>(() => ({
  current: manualPage.value,
  pageSize: manualPageSize.value,
  total: manualTotal,
  showSizeChanger: true,
  showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
  pageSizeOptions: [5, 10],
  onChange: (page, pageSize) => {
    manualPage.value = page;
    manualPageSize.value = pageSize;
  },
}));
const manualEvent = shallowRef('idle');

const nestedColumns: STableColumn<Order>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 70 },
  {
    id: 'person',
    header: 'Person',
    columns: [
      { id: 'name', accessorKey: 'name', header: 'Name' },
      { id: 'department', accessorKey: 'department', header: 'Department' },
    ],
  },
  {
    id: 'money',
    header: 'Money',
    columns: [{ id: 'amount', accessorKey: 'amount', header: 'Amount', width: 120 }],
  },
];

const apiPinTop = () => {
  pinningTableRef.value?.pinRow(3, 'top');
  pinEvent.value = 'pin:3:top';
};
const apiPinBottom = () => {
  pinningTableRef.value?.pinRow(1, 'bottom');
  pinEvent.value = 'pin:1:bottom';
};
const apiUnpin = () => {
  pinningTableRef.value?.pinRow(2, false);
  pinEvent.value = 'pin:2:off';
};

const handleRadioChange = (keys: (string | number)[]) => {
  radioEvent.value = keys.join(',');
};

const handleCustomFilter = (payload: {
  filters: Record<string, (string | number | boolean)[]>;
}) => {
  customFilterEvent.value = JSON.stringify(payload.filters);
};

const handleRowEditCommit = (editing: { rowKey: string | number }) => {
  rowEditEvent.value = `commit:${editing.rowKey}`;
};
</script>

<template>
  <section class="fixture-section" data-testid="grouped-table">
    <h2>Grouping and aggregation</h2>
    <div class="fixture-controls">
      <button
        data-testid="collapse-groups"
        type="button"
        @click="groupedTableRef?.collapseAllGroups()"
      >
        Collapse groups
      </button>
      <button data-testid="expand-groups" type="button" @click="groupedTableRef?.expandAllGroups()">
        Expand groups
      </button>
      <button
        data-testid="group-by-name"
        type="button"
        @click="groupedTableRef?.setGroupBy(['name'])"
      >
        Group by name
      </button>
    </div>
    <output class="fixture-status" data-testid="group-event">{{ groupEvent }}</output>
    <output class="fixture-status" data-testid="group-selected">
      {{ groupedSelectedKeys.join(',') }}
    </output>
    <STable
      ref="groupedTableRef"
      bordered
      row-key="id"
      :columns="groupedColumns"
      :data-source="orders"
      :default-group-by="['department']"
      :row-selection="{ type: 'checkbox' }"
      :selected-row-keys="groupedSelectedKeys"
      @update:selected-row-keys="groupedSelectedKeys = $event"
      @group-by-change="groupEvent = $event.join(',')"
    />
  </section>

  <section class="fixture-section" data-testid="pinned-row-table">
    <h2>Pinned rows</h2>
    <div class="fixture-controls">
      <button data-testid="pin-top" type="button" @click="apiPinTop">Pin 3 top</button>
      <button data-testid="pin-bottom" type="button" @click="apiPinBottom">Pin 1 bottom</button>
      <button data-testid="unpin" type="button" @click="apiUnpin">Unpin 2</button>
    </div>
    <output class="fixture-status" data-testid="pin-event">{{ pinEvent }}</output>
    <output class="fixture-status" data-testid="pinned-keys">
      {{ pinnedKeys.top.join(',') }}|{{ pinnedKeys.bottom.join(',') }}
    </output>
    <STable
      ref="pinningTableRef"
      bordered
      row-key="id"
      :columns="pinningColumns"
      :data-source="orders"
      :pinned-row-keys="pinnedKeys"
      @update:pinned-row-keys="pinnedKeys = $event"
    />
  </section>

  <section class="fixture-section" data-testid="tall-pinned-table">
    <h2>Tall pinned rows</h2>
    <output class="fixture-status" data-testid="tall-pinned-keys">
      {{ tallPinnedKeys.top.join(',') }}|{{ tallPinnedKeys.bottom.join(',') }}
    </output>
    <STable
      bordered
      row-key="id"
      style="height: 240px"
      :columns="pinningColumns"
      :data-source="tallRows"
      :pinned-row-keys="tallPinnedKeys"
      @update:pinned-row-keys="tallPinnedKeys = $event"
    />
  </section>

  <section class="fixture-section" data-testid="menu-filter-table">
    <h2>Menu filter</h2>
    <output class="fixture-status" data-testid="menu-filter-event">
      {{ menuFilterEvent }}
    </output>
    <STable
      bordered
      row-key="id"
      :columns="menuFilterColumns"
      :data-source="orders"
      @filter-change="menuFilterEvent = JSON.stringify($event.filters)"
    />
  </section>

  <section class="fixture-section" data-testid="radio-table">
    <h2>Radio selection</h2>
    <output class="fixture-status" data-testid="radio-selected">
      {{ radioSelected.join(',') }}
    </output>
    <output class="fixture-status" data-testid="radio-event">{{ radioEvent }}</output>
    <STable
      bordered
      row-key="id"
      :columns="radioColumns"
      :data-source="orders"
      :row-selection="{
        type: 'radio',
        getCheckboxProps: (record) => ({ disabled: record.id === 3 }),
      }"
      :selected-row-keys="radioSelected"
      @update:selected-row-keys="radioSelected = $event"
      @select-change="handleRadioChange"
    />
  </section>

  <section class="fixture-section" data-testid="custom-filter-table">
    <h2>Custom filter panel</h2>
    <output class="fixture-status" data-testid="custom-filter-event">
      {{ customFilterEvent }}
    </output>
    <STable
      bordered
      row-key="id"
      :columns="customFilterColumns"
      :data-source="orders"
      @filter-change="handleCustomFilter"
    >
      <template #filterPanel="{ selectedKeys, setSelectedKeys, confirm, reset, close }">
        <div class="custom-filter" data-testid="custom-filter">
          <input
            data-testid="custom-filter-input"
            :value="selectedKeys[0] ?? ''"
            @input="setSelectedKeys([($event.target as HTMLInputElement).value])"
          />
          <button data-testid="custom-filter-apply" type="button" @click="confirm">Apply</button>
          <button
            data-testid="custom-filter-reset"
            type="button"
            @click="
              reset();
              close();
            "
          >
            Reset
          </button>
        </div>
      </template>
    </STable>
  </section>

  <section class="fixture-section" data-testid="row-edit-table">
    <h2>Row editing</h2>
    <div class="fixture-controls">
      <button data-testid="commit-row-edit" type="button" @click="editTableRef?.commitEdit()">
        Commit edit
      </button>
      <button data-testid="cancel-row-edit" type="button" @click="editTableRef?.cancelEdit()">
        Cancel edit
      </button>
    </div>
    <output class="fixture-status" data-testid="row-edit-event">{{ rowEditEvent }}</output>
    <STable
      ref="editTableRef"
      v-model:data-source="editableRows"
      bordered
      row-key="id"
      :columns="rowEditColumns"
      :edit-config="{ mode: 'row', trigger: 'dblclick' }"
      @edit-commit="handleRowEditCommit"
    />
  </section>

  <section class="fixture-section" data-testid="manual-pagination-table">
    <h2>Manual (server) pagination</h2>
    <output class="fixture-status" data-testid="manual-page">
      {{ manualPage }}|{{ manualPageSize }}|{{ manualEvent }}
    </output>
    <STable
      bordered
      row-key="id"
      :columns="pinningColumns"
      :data-source="manualRows"
      :pagination="manualPagination"
      :manual-pagination="true"
      @page-change="(payload) => (manualEvent = `page:${payload.page}`)"
    />
  </section>

  <section class="fixture-section" data-testid="nested-header-table">
    <h2>Nested column headers</h2>
    <STable bordered row-key="id" :columns="nestedColumns" :data-source="orders.slice(0, 3)" />
  </section>
</template>
