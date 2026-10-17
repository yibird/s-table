import { PerformanceObserver, performance } from 'node:perf_hooks';
import {
  columnFilteringFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  constructTable,
  createExpandedRowModel,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_includesString,
  rowExpandingFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_basic,
  tableFeatures,
} from '@tanstack/table-core';
import { storeReactivityBindings } from '@tanstack/table-core/store-reactivity-bindings';

const scenario = JSON.parse(process.argv[2]);
const samples = new Map();
let observedMeasures = 0;
let sequence = 0;

const observer = new PerformanceObserver((list) => {
  observedMeasures += list.getEntries().length;
});
observer.observe({ entryTypes: ['measure'] });

const measure = (name, operation) => {
  const id = sequence++;
  const start = `${name}:start:${id}`;
  const end = `${name}:end:${id}`;
  performance.mark(start);
  const value = operation();
  performance.mark(end);
  const entry = performance.measure(name, start, end);
  const values = samples.get(name) ?? [];
  values.push(entry.duration);
  samples.set(name, values);
  performance.clearMarks(start);
  performance.clearMarks(end);
  performance.clearMeasures(name);
  return value;
};

const forceGc = () => globalThis.gc?.();
const heapMb = () => process.memoryUsage().heapUsed / 1024 / 1024;
const round = (value) => Math.round(value * 100) / 100;
const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;
};
const summarize = (values) => ({
  samples: values.length,
  p50: round(percentile(values, 50)),
  p95: round(percentile(values, 95)),
  p99: round(percentile(values, 99)),
  max: round(Math.max(...values)),
});

const createFlatData = (count, denseColumns) => {
  const data = Array.from({ length: count });
  for (let rowIndex = 0; rowIndex < count; rowIndex++) {
    const values = Array.from({ length: denseColumns });
    for (let columnIndex = 0; columnIndex < denseColumns; columnIndex++) {
      values[columnIndex] =
        columnIndex === 2
          ? `group-${rowIndex % 1_000}`
          : (rowIndex * 31 + columnIndex * 17) % 1_000_003;
    }
    data[rowIndex] = { id: `r-${rowIndex}`, values };
  }
  return data;
};

const createTreeData = (count, denseColumns, maxDepth) => {
  const roots = [];
  const nodes = [];
  const branchFactor = 4;
  for (let index = 0; index < count; index++) {
    const parentIndex = index === 0 ? -1 : Math.floor((index - 1) / branchFactor);
    const parent = parentIndex >= 0 ? nodes[parentIndex] : undefined;
    const depth = parent ? parent.depth + 1 : 0;
    if (depth >= maxDepth) throw new Error(`Tree generator exceeded maxDepth=${maxDepth}`);
    const row = {
      id: `tree-${index}`,
      values: Array.from(
        { length: denseColumns },
        (_, columnIndex) => (index * 31 + columnIndex * 17) % 1_000_003
      ),
      children: [],
      depth,
    };
    if (parent) parent.children.push(row);
    else roots.push(row);
    nodes.push(row);
  }
  return roots;
};

const createColumns = (count, denseColumns) =>
  Array.from({ length: count }, (_, columnIndex) => ({
    id: `c${columnIndex}`,
    header: `Column ${columnIndex}`,
    accessorFn: (row) =>
      columnIndex < denseColumns
        ? row.values[columnIndex]
        : (Number(row.id.match(/\d+$/)?.[0] ?? 0) * 31 + columnIndex * 17) % 1_000_003,
    sortFn: 'basic',
    filterFn: 'includesString',
    size: 120,
  }));

const features = tableFeatures({
  coreReactivityFeature: storeReactivityBindings(),
  columnFilteringFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  rowExpandingFeature,
  rowSelectionFeature,
  rowSortingFeature,
  expandedRowModel: createExpandedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { basic: sortFn_basic },
});

forceGc();
const heapStartMb = heapMb();
const estimatedDensePayloadBytes = scenario.rows * scenario.columns * 8;
const data = measure('dataAllocation', () =>
  scenario.kind === 'tree'
    ? createTreeData(scenario.rows, scenario.denseColumns, scenario.maxDepth)
    : createFlatData(scenario.rows, scenario.denseColumns)
);
forceGc();
const heapAfterDataMb = heapMb();
const columns = measure('columnDefinition', () =>
  createColumns(scenario.columns, scenario.denseColumns)
);

const table = measure('tableConstruction', () =>
  constructTable({
    features,
    data,
    columns,
    getRowId: (row) => row.id,
    getSubRows: scenario.kind === 'tree' ? (row) => row.children : undefined,
    autoResetExpanded: false,
    autoResetSorting: false,
  })
);

const coreModel = measure('coreRowModel', () => table.getCoreRowModel());
forceGc();
const heapAfterCoreMb = heapMb();
measure('coreRowModelCacheHit', () => table.getCoreRowModel());
measure('headerModel', () => table.getHeaderGroups());

const visibleRows = coreModel.flatRows.slice(0, Math.min(40, coreModel.flatRows.length));
const materializedCells = measure('visibleCellIndexCold', () => {
  let count = 0;
  for (const row of visibleRows) count += Object.keys(row.getVisibleCellsByColumnId()).length;
  return count;
});
measure('visibleCellIndexCacheHit', () => {
  let count = 0;
  for (const row of visibleRows) count += Object.keys(row.getVisibleCellsByColumnId()).length;
  return count;
});

const hotSamples = scenario.samples;
for (let index = 0; index < hotSamples; index++) {
  forceGc();
  measure('sort', () => {
    table.setSorting([{ id: 'c1', desc: index % 2 === 1 }]);
    return table.getRowModel().rows.length;
  });
}
table.setSorting([]);
table.getRowModel();

for (let index = 0; index < hotSamples; index++) {
  forceGc();
  measure('filter', () => {
    table.setColumnFilters([{ id: 'c2', value: String(index % 1_000) }]);
    return table.getRowModel().rows.length;
  });
}
table.setColumnFilters([]);
table.getRowModel();

for (let index = 0; index < hotSamples; index++) {
  forceGc();
  measure('selectAll', () => {
    table.toggleAllRowsSelected(true);
    return table.getSelectedRowIds().length;
  });
  table.toggleAllRowsSelected(false, { deselectAll: true });
}

const editSamples = Math.min(hotSamples, scenario.rows >= 1_000_000 ? 2 : 5);
let currentData = data;
for (let index = 0; index < editSamples; index++) {
  forceGc();
  measure('immutableCellCommit', () => {
    const targetIndex = Math.floor(currentData.length / 2);
    const next = currentData.slice();
    const current = next[targetIndex];
    next[targetIndex] = {
      ...current,
      values: current.values.with(1, Number(current.values[1]) + 1),
    };
    currentData = next;
    table.setOptions((previous) => ({ ...previous, data: currentData }));
    return table.getCoreRowModel().rowsById[current.id];
  });
}

const resizeFrames = Math.max(30, hotSamples * 10);
for (let frame = 0; frame < resizeFrames; frame++) {
  measure('columnResizeState', () => {
    table.setColumnSizing((current) => ({ ...current, c1: 120 + (frame % 80) }));
    return table.getColumn('c1')?.getSize();
  });
}

if (scenario.kind === 'tree') {
  for (let index = 0; index < hotSamples; index++) {
    forceGc();
    measure('expandAll', () => {
      table.setExpanded(true);
      return table.getRowModel().flatRows.length;
    });
    table.setExpanded({});
    table.getRowModel();
  }
}

forceGc();
const heapFinalMb = heapMb();
await new Promise((resolve) => setImmediate(resolve));
observer.disconnect();

const metrics = Object.fromEntries(
  [...samples.entries()].map(([name, values]) => [name, summarize(values)])
);

process.stdout.write(
  JSON.stringify({
    scenario,
    status: 'ok',
    caveats: [
      scenario.denseColumns < scenario.columns
        ? `Only ${scenario.denseColumns}/${scenario.columns} values are physically stored per row; remaining accessors are computed.`
        : null,
      scenario.rows >= 1_000_000
        ? 'Cold initialization has one sample because retaining repeated million-row models would distort memory pressure.'
        : null,
    ].filter(Boolean),
    counts: {
      rootRows: coreModel.rows.length,
      flatRows: coreModel.flatRows.length,
      rowsById: Object.keys(coreModel.rowsById).length,
      columns: table.getAllLeafColumns().length,
      virtualWindowRows: visibleRows.length,
      materializedCellsForVirtualWindow: materializedCells,
      theoreticalDenseValues: scenario.rows * scenario.columns,
    },
    preflight: {
      estimatedDensePayloadBytes,
      estimatedDensePayloadGiB: round(estimatedDensePayloadBytes / 1024 ** 3),
      denseAllocationExecuted: scenario.denseColumns === scenario.columns,
    },
    memory: {
      heapStartMb: round(heapStartMb),
      heapAfterDataMb: round(heapAfterDataMb),
      heapAfterCoreMb: round(heapAfterCoreMb),
      heapFinalMb: round(heapFinalMb),
      dataHeapDeltaMb: round(heapAfterDataMb - heapStartMb),
      coreHeapDeltaMb: round(heapAfterCoreMb - heapAfterDataMb),
    },
    instrumentation: { performanceObserverMeasures: observedMeasures },
    metrics,
  })
);
