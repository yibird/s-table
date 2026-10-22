<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import STable, {
  SummaryCell,
  SummaryRow,
  zh_CN,
  type STableColumn,
  type STableInstance,
  type STablePaginationProps,
} from '../../../../packages/vue/src';

interface Employee {
  id: number;
  name: string;
  department: 'Engineering' | 'Design' | 'Sales' | 'Support';
  score: number;
}

const departments = ['Engineering', 'Design', 'Sales', 'Support'] as const;

const createRows = (count: number): Employee[] =>
  Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    return {
      id,
      name: `User ${String(id).padStart(2, '0')}`,
      department: departments[index % departments.length],
      score: 101 - id,
    };
  });

const pipelineRows = createRows(12);
const pipelineColumns: STableColumn<Employee>[] = [
  {
    id: 'id',
    accessorKey: 'id',
    header: 'ID',
    width: 70,
    sorter: (a, b) => a.id - b.id,
  },
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Name',
    search: true,
  },
  {
    id: 'department',
    accessorKey: 'department',
    header: 'Department',
    filters: departments.map((department) => ({ text: department, value: department })),
    onFilter: (value, record) => record.department === value,
  },
  {
    id: 'score',
    accessorKey: 'score',
    header: 'Score',
    width: 100,
    sorter: (a, b) => a.score - b.score,
  },
];

const equalWidthColumns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'department', accessorKey: 'department', header: 'Department' },
  { id: 'score', accessorKey: 'score', header: 'Score' },
];

const pipelineTableRef = ref<STableInstance<Employee> | null>(null);
const pipelineEvent = shallowRef('idle');

const paginationRows = createRows(32);
const paginationColumns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 70 },
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'department', accessorKey: 'department', header: 'Department' },
  { id: 'score', accessorKey: 'score', header: 'Score', width: 100 },
];
const pagination: STablePaginationProps = {
  defaultPageSize: 10,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: [5, 10, 20],
  showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
};

const combinedRows = createRows(45);
const combinedSelectedKeys = ref<(string | number)[]>([]);
const combinedPagination: STablePaginationProps = { defaultPageSize: 10 };
const combinedColumns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 70 },
  { id: 'name', accessorKey: 'name', header: 'Name', search: true },
  {
    id: 'department',
    accessorKey: 'department',
    header: 'Department',
    filters: departments.map((department) => ({ text: department, value: department })),
    onFilter: (value, record) => record.department === value,
  },
  {
    id: 'score',
    accessorKey: 'score',
    header: 'Score',
    width: 100,
    sorter: (a, b) => a.score - b.score,
  },
];

const originalStateRows: Employee[] = [
  { id: 1, name: '=2+2', department: 'Engineering', score: 99 },
  { id: 2, name: 'Mixed Case', department: 'Design', score: 88 },
  { id: 3, name: 'Third Row', department: 'Sales', score: 77 },
];
const stateRows = ref<Employee[]>(originalStateRows.map((row) => ({ ...row })));
const loading = shallowRef(false);
const uppercaseRenderer = shallowRef(false);

const stateColumns = computed<STableColumn<Employee>[]>(() => [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 70 },
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Name',
    cell: ({ getValue }) => {
      const value = String(getValue());
      return uppercaseRenderer.value ? value.toUpperCase() : value;
    },
  },
  { id: 'department', accessorKey: 'department', header: 'Department' },
  { id: 'score', accessorKey: 'score', header: 'Score', width: 100 },
]);

const resetStateRows = () => {
  stateRows.value = originalStateRows.map((row) => ({ ...row }));
};

const replaceFirstRow = () => {
  stateRows.value = stateRows.value.map((row) =>
    row.id === 1 ? { ...row, name: 'Replaced Row' } : row
  );
};

const updateFirstRow = () => {
  stateRows.value = stateRows.value.map((row) =>
    row.id === 1 ? { ...row, name: 'Updated Row' } : row
  );
};

const clearPipelineState = () => {
  pipelineTableRef.value?.clearSort();
  pipelineTableRef.value?.clearFilter();
  pipelineTableRef.value?.clearSearch();
  pipelineEvent.value = 'cleared';
};
</script>

<template>
  <section class="fixture-section" data-testid="equal-width-table">
    <h2>Equal width columns</h2>
    <STable
      bordered
      row-key="id"
      :columns="equalWidthColumns"
      :data-source="pipelineRows"
      :pagination="false"
    />
  </section>

  <section class="fixture-section" data-testid="pipeline-table">
    <h2>Sort, filter and search pipeline</h2>
    <div class="fixture-controls">
      <button data-testid="clear-pipeline" type="button" @click="clearPipelineState">
        Clear pipeline
      </button>
    </div>
    <output class="fixture-status" data-testid="pipeline-event">{{ pipelineEvent }}</output>
    <STable
      ref="pipelineTableRef"
      bordered
      row-key="id"
      :columns="pipelineColumns"
      :data-source="pipelineRows"
      :locale="zh_CN"
      @sort-change="pipelineEvent = `sort:${$event.columnId}:${$event.order}`"
      @filter-change="pipelineEvent = `filter:${JSON.stringify($event)}`"
    />
  </section>

  <section class="fixture-section" data-testid="pagination-table">
    <h2>Pagination</h2>
    <STable
      bordered
      row-key="id"
      :columns="paginationColumns"
      :data-source="paginationRows"
      :pagination="pagination"
      :locale="zh_CN"
    />
  </section>

  <section class="fixture-section" data-testid="combined-table">
    <h2>Pagination with filter and selection</h2>
    <output class="fixture-status" data-testid="combined-selected">
      {{ combinedSelectedKeys.join(',') }}
    </output>
    <STable
      bordered
      row-key="id"
      :columns="combinedColumns"
      :data-source="combinedRows"
      :pagination="combinedPagination"
      :row-selection="{ type: 'checkbox' }"
      :locale="zh_CN"
      :selected-row-keys="combinedSelectedKeys"
      @update:selected-row-keys="combinedSelectedKeys = $event"
    />
  </section>

  <section class="fixture-section" data-testid="state-table">
    <h2>State, slots and export</h2>
    <div class="fixture-controls">
      <button data-testid="toggle-loading" type="button" @click="loading = !loading">
        Toggle loading
      </button>
      <button data-testid="clear-data" type="button" @click="stateRows = []">Clear data</button>
      <button data-testid="reset-data" type="button" @click="resetStateRows">Reset data</button>
      <button data-testid="replace-row" type="button" @click="replaceFirstRow">Replace row</button>
      <button data-testid="update-row" type="button" @click="updateFirstRow">Update row</button>
      <button
        data-testid="toggle-renderer"
        type="button"
        @click="uppercaseRenderer = !uppercaseRenderer"
      >
        Toggle renderer
      </button>
    </div>
    <STable
      bordered
      row-key="id"
      :columns="stateColumns"
      :data-source="stateRows"
      :loading="loading"
      :locale="zh_CN"
      @update:data-source="stateRows = $event"
    >
      <template #empty>
        <div data-testid="custom-empty">No fixture rows</div>
      </template>
      <template #loading>
        <div data-testid="custom-loading">Fixture loading</div>
      </template>
      <template #summary>
        <SummaryRow>
          <SummaryCell :index="0" :col-span="3">Summary</SummaryCell>
          <SummaryCell :index="3">{{ stateRows.length }}</SummaryCell>
        </SummaryRow>
      </template>
      <template #footer>
        <span data-testid="custom-footer">Fixture footer</span>
      </template>
    </STable>
  </section>
</template>
