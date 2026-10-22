<script setup lang="ts">
import { h, ref, shallowRef } from 'vue';
import STable, {
  type STableColumn,
  type STableInstance,
  type STablePaginationProps,
} from '../../../../packages/vue/src';

interface Row {
  id: number;
  name: string;
  notes: string;
  department: string;
  score: number;
}

const rows: Row[] = [
  {
    id: 1,
    name: '=SUM(A1:A2)',
    notes: 'A very long note that must be truncated inside the narrow column',
    department: 'Engineering',
    score: 90,
  },
  {
    id: 2,
    name: 'A, "quoted" name',
    notes: 'Another long note used to verify the ellipsis title attribute behavior',
    department: 'Design',
    score: 80,
  },
  {
    id: 3,
    name: 'Short',
    notes: 'tiny',
    department: 'Sales',
    score: 70,
  },
  ...Array.from({ length: 9 }, (_, index) => {
    const id = index + 4;
    return {
      id,
      name: `Row ${id} with a long display name`,
      notes: `Row ${id} notes`,
      department: ['Engineering', 'Design', 'Sales'][index % 3]!,
      score: 90 - id,
    };
  }),
];

// ── Tooltip / ellipsis ─────────────────────────────────────────────
const tooltipRows = rows;
const tooltipColumns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 60 },
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Name',
    width: 120,
    ellipsis: true,
    tooltip: true,
    sorter: (a, b) => a.id - b.id,
  },
  {
    id: 'notes',
    accessorKey: 'notes',
    header: 'Notes',
    width: 110,
    ellipsis: { showTitle: true },
  },
  {
    id: 'department',
    accessorKey: 'department',
    header: 'Department',
    width: 60,
    ellipsis: true,
    tooltip: (context) => `Custom tooltip for row ${context.record.id}`,
  },
  { id: 'short', accessorFn: () => 'ok', header: 'Short', width: 70, tooltip: true },
];

const virtualTooltipRows = Array.from({ length: 1000 }, (_, index) => ({
  ...rows[index % rows.length]!,
  id: index + 1,
  name: `Virtual row ${index + 1} long name for tooltip`,
  notes: `Virtual note ${index + 1}`,
}));
const virtualTooltipColumns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 70, fixed: 'left' },
  { id: 'name', accessorKey: 'name', header: 'Name', width: 140, ellipsis: true, tooltip: true },
  { id: 'notes', accessorKey: 'notes', header: 'Notes', width: 220 },
];

// ── Header menu ────────────────────────────────────────────────────
const menuEvent = shallowRef('idle');
const menuColumns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 60 },
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Name',
    sorter: (a, b) => a.id - b.id,
    showMenu: true,
    menuPopup: (context) =>
      h(
        'div',
        { class: 'fixture-header-menu' },
        h(
          'button',
          {
            type: 'button',
            'data-testid': 'header-menu-action',
            onClick: () => {
              menuEvent.value = `action:${context.columnId}`;
              context.close();
            },
          },
          'Column action'
        )
      ),
  },
  { id: 'department', accessorKey: 'department', header: 'Department' },
];

// ── Export ─────────────────────────────────────────────────────────
const exportRows = rows;
const exportColumns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 60 },
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'department', accessorKey: 'department', header: 'Department' },
  { id: 'score', accessorKey: 'score', header: 'Score', width: 90 },
];
const exportTableRef = ref<STableInstance<Row> | null>(null);
const exportSelected = ref<(string | number)[]>([1]);
const exportOutput = shallowRef('');
const exportError = shallowRef('');
const exportPagination: STablePaginationProps = { defaultPageSize: 5 };

const exportAll = () => {
  exportOutput.value = exportTableRef.value!.exportCsv({ download: false });
};
const exportPage = () => {
  exportOutput.value = exportTableRef.value!.exportCsv({
    download: false,
    dataSource: 'currentPage',
  });
};
const exportSelectedCsv = () => {
  exportOutput.value = exportTableRef.value!.exportCsv({
    download: false,
    dataSource: 'selected',
  });
};
const exportCustom = () => {
  exportOutput.value = exportTableRef.value!.exportCsv({
    download: false,
    dataSource: [exportRows[1]!],
    columns: [
      { columnId: 'name', header: 'Name' },
      { columnId: 'double', header: 'Double', getValue: (row) => row.score * 2 },
    ],
  });
};
const exportAsync = async () => {
  const blob = await exportTableRef.value!.exportCsvAsync({ download: false });
  exportOutput.value = `${blob.type}:${blob.size}`;
};
const exportExcel = async () => {
  exportError.value = '';
  try {
    await exportTableRef.value!.exportExcel();
  } catch (error) {
    exportError.value = error instanceof Error ? error.message : String(error);
  }
};
const exportFormat = () => {
  exportOutput.value = exportTableRef.value!.exportCsv({
    download: false,
    dataSource: [exportRows[1]!],
    columns: [
      {
        columnId: 'score',
        header: 'Score',
        format: (value) => `#${String(value)}`,
      },
    ],
  });
};
const exportEmpty = () => {
  exportOutput.value = exportTableRef.value!.exportCsv({ download: false, dataSource: [] });
};
const exportDownload = () => {
  exportTableRef.value!.exportCsv({
    download: true,
    filename: 'orders.csv',
    dataSource: 'currentPage',
  });
};
const exportExcelAdapter = async () => {
  const result = await exportTableRef.value!.exportExcel({
    dataSource: [exportRows[0]!],
    adapter: {
      extension: 'xlsx',
      mimeType: 'application/vnd.ms-excel',
      write: (sheet) => {
        exportOutput.value = `${sheet.name}:${sheet.rows.length}:${sheet.columns.length}`;
        return new Uint8Array([1]);
      },
    },
  });
  exportError.value = `size:${(result as Uint8Array).length}`;
};
const exportRowsInfo = () => {
  const table = exportTableRef.value!;
  exportOutput.value = `${table.getExportRows('all').length}|${table
    .getExportColumns()
    .map((column) => column.columnId)
    .join(',')}`;
};

// ── Pagination ─────────────────────────────────────────────────────
const simplePagination: STablePaginationProps = { defaultPageSize: 5, simple: true };
const singlePagePagination: STablePaginationProps = {
  defaultPageSize: 10,
  hideOnSinglePage: true,
};
const footerPagination: STablePaginationProps = { defaultPageSize: 5 };
const basicColumns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 60 },
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'score', accessorKey: 'score', header: 'Score', width: 90 },
];

// ── Column footer / summary ────────────────────────────────────────
const footerColumns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 60, footer: 'Total' },
  { id: 'name', accessorKey: 'name', header: 'Name', footer: '12 rows' },
  { id: 'score', accessorKey: 'score', header: 'Score', width: 90, footer: '---' },
];

// ── Responsive ─────────────────────────────────────────────────────
const responsiveColumns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 60 },
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Name (lg+)',
    responsive: ['lg', 'xl', 'xxl'],
  },
  {
    id: 'department',
    accessorKey: 'department',
    header: 'Department (xl+)',
    responsive: ['xl', 'xxl'],
  },
  { id: 'score', accessorKey: 'score', header: 'Score', width: 90 },
];
const responsiveBreakpoints = { lg: 700, xl: 1100 };

const titleRender = (context: { currentPageData: Row[] }) =>
  `Rows ${context.currentPageData.length}`;
const footerRender = (context: {
  currentPageData: Row[];
  currentPage: number;
  pageSize: number;
  total: number;
}) =>
  `page ${context.currentPage}/${context.pageSize}/${context.total}/${context.currentPageData.length}`;

// ── 选择细节 / 浮层容器 / 自定义属性 ───────────────────────────────
const cancelRadioSelected = ref<(string | number)[]>([1]);
const popupHost = ref<HTMLElement | null>(null);
const popupColumns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 60 },
  {
    id: 'department',
    accessorKey: 'department',
    header: 'Department',
    filters: [{ text: 'Engineering', value: 'Engineering' }],
    onFilter: (value, record) => record.department === value,
  },
];
const attrsEvent = shallowRef('idle');
const attrsColumns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: 'Name' },
];
const customRow = (record: Row) => ({
  'data-custom-row': `r${record.id}`,
  class: 'custom-row',
  onClick: () => (attrsEvent.value = `row:${record.id}`),
  'data-row-id': 'hijacked',
});
const customCell = (_record: Row, rowIndex: number, column: STableColumn<Row>) =>
  column.id === 'name'
    ? {
        'data-custom-cell': String(rowIndex),
        class: 'custom-cell',
        onClick: () => (attrsEvent.value = 'cell'),
      }
    : undefined;
const customHeaderCell = (column: STableColumn<Row>) =>
  column.id === 'name' ? { 'data-custom-header': 'yes' } : undefined;
</script>

<template>
  <section class="fixture-section" data-testid="tooltip-table">
    <h2>Ellipsis and tooltip</h2>
    <STable
      bordered
      row-key="id"
      style="width: 480px"
      :columns="tooltipColumns"
      :data-source="tooltipRows"
    />
  </section>

  <section class="fixture-section" data-testid="virtual-tooltip-table">
    <h2>Virtual tooltip</h2>
    <STable
      bordered
      row-key="id"
      style="width: 480px; height: 260px"
      :columns="virtualTooltipColumns"
      :data-source="virtualTooltipRows"
      :virtual="{ y: true, rowHeight: 36, overscan: 4 }"
    />
  </section>

  <section class="fixture-section" data-testid="header-menu-table">
    <h2>Header menu</h2>
    <output class="fixture-status" data-testid="menu-event">{{ menuEvent }}</output>
    <STable bordered row-key="id" :columns="menuColumns" :data-source="rows.slice(0, 3)" />
  </section>

  <section class="fixture-section" data-testid="export-table">
    <h2>Export</h2>
    <div class="fixture-controls">
      <button data-testid="export-all" type="button" @click="exportAll">Export all</button>
      <button data-testid="export-page" type="button" @click="exportPage">Export page</button>
      <button data-testid="export-selected" type="button" @click="exportSelectedCsv">
        Export selected
      </button>
      <button data-testid="export-custom" type="button" @click="exportCustom">Export custom</button>
      <button data-testid="export-async" type="button" @click="exportAsync">Export async</button>
      <button data-testid="export-excel" type="button" @click="exportExcel">Export Excel</button>
      <button data-testid="export-rows" type="button" @click="exportRowsInfo">Rows info</button>
      <button data-testid="export-format" type="button" @click="exportFormat">Export format</button>
      <button data-testid="export-empty" type="button" @click="exportEmpty">Export empty</button>
      <button data-testid="export-download" type="button" @click="exportDownload">Download</button>
      <button data-testid="export-excel-adapter" type="button" @click="exportExcelAdapter">
        Excel adapter
      </button>
    </div>
    <output class="fixture-status" data-testid="export-error">{{ exportError }}</output>
    <pre class="fixture-status" data-testid="export-output">{{ exportOutput }}</pre>
    <STable
      ref="exportTableRef"
      bordered
      row-key="id"
      :columns="exportColumns"
      :data-source="exportRows"
      :pagination="exportPagination"
      :row-selection="{ type: 'checkbox' }"
      :selected-row-keys="exportSelected"
      @update:selected-row-keys="exportSelected = $event"
    />
  </section>

  <section class="fixture-section" data-testid="simple-pagination-table">
    <h2>Simple pagination</h2>
    <STable
      bordered
      row-key="id"
      :columns="basicColumns"
      :data-source="rows"
      :pagination="simplePagination"
    />
  </section>

  <section class="fixture-section" data-testid="single-page-table">
    <h2>Hide on single page</h2>
    <STable
      bordered
      row-key="id"
      :columns="basicColumns"
      :data-source="rows.slice(0, 3)"
      :pagination="singlePagePagination"
    />
  </section>

  <section class="fixture-section" data-testid="scope-table">
    <h2>Title and footer scope</h2>
    <STable
      bordered
      row-key="id"
      :columns="basicColumns"
      :data-source="rows"
      :pagination="footerPagination"
      :title="titleRender"
      :footer="footerRender"
    />
  </section>

  <section class="fixture-section" data-testid="column-footer-table">
    <h2>Column footer</h2>
    <STable
      bordered
      row-key="id"
      style="height: 180px"
      summary-fixed
      :columns="footerColumns"
      :data-source="rows"
    />
  </section>

  <section class="fixture-section" data-testid="cancel-radio-table">
    <h2>Cancellable radio</h2>
    <output class="fixture-status" data-testid="cancel-radio-selected">
      {{ cancelRadioSelected.join(',') || 'none' }}
    </output>
    <STable
      bordered
      row-key="id"
      :columns="basicColumns"
      :data-source="rows.slice(0, 3)"
      :row-selection="{ type: 'radio', allowCancelRadio: true }"
      :selected-row-keys="cancelRadioSelected"
      @update:selected-row-keys="cancelRadioSelected = $event"
    />
  </section>

  <section class="fixture-section" data-testid="popup-container-table">
    <h2>Popup container</h2>
    <div ref="popupHost" class="popup-host" data-testid="popup-host" />
    <STable
      bordered
      row-key="id"
      :columns="popupColumns"
      :data-source="rows.slice(0, 3)"
      :get-popup-container="() => popupHost"
    />
  </section>

  <section class="fixture-section" data-testid="custom-attrs-table">
    <h2>Custom row/cell/header attributes</h2>
    <output class="fixture-status" data-testid="attrs-event">{{ attrsEvent }}</output>
    <STable
      bordered
      row-key="id"
      :columns="attrsColumns"
      :data-source="rows.slice(0, 2)"
      :custom-row="customRow"
      :custom-cell="customCell"
      :custom-header-cell="customHeaderCell"
    />
  </section>

  <section class="fixture-section" data-testid="responsive-table">
    <h2>Responsive columns</h2>
    <STable
      bordered
      row-key="id"
      :columns="responsiveColumns"
      :data-source="rows.slice(0, 3)"
      :breakpoints="responsiveBreakpoints"
    />
  </section>
</template>
