import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const root = dirname(fileURLToPath(import.meta.url));
const worker = resolve(root, 'table-core-worker.mjs');
const quick = process.argv.includes('--quick');
const resultPath = resolve(root, 'results', quick ? 'latest-quick.json' : 'latest.json');

const performanceBudgets = {
  '1k-x-20': {
    'metrics.coreRowModel.p50': 25,
    'metrics.sort.p95': 50,
    'metrics.filter.p95': 50,
    'metrics.selectAll.p95': 30,
    'metrics.immutableCellCommit.p95': 30,
    'memory.heapAfterCoreMb': 40,
  },
  '10k-x-50': {
    'metrics.coreRowModel.p50': 100,
    'metrics.sort.p95': 150,
    'metrics.filter.p95': 150,
    'metrics.selectAll.p95': 100,
    'metrics.immutableCellCommit.p95': 100,
    'memory.heapAfterCoreMb': 100,
  },
  '100k-x-100': {
    'metrics.coreRowModel.p50': 500,
    'metrics.sort.p95': 600,
    'metrics.filter.p95': 500,
    'metrics.selectAll.p95': 300,
    'metrics.immutableCellCommit.p95': 1200,
    'memory.heapAfterCoreMb': 400,
  },
};

const readPath = (value, path) => path.split('.').reduce((current, key) => current?.[key], value);

const applyPerformanceBudget = (result) => {
  const limits = performanceBudgets[result.scenario.id];
  if (result.status !== 'ok' || !limits) return result;

  const violations = [];
  for (const [metric, maximum] of Object.entries(limits)) {
    const actual = readPath(result, metric);
    if (typeof actual !== 'number' || !Number.isFinite(actual)) {
      violations.push({ metric, maximum, actual: null, reason: 'missing' });
    } else if (actual > maximum) {
      violations.push({ metric, maximum, actual, reason: 'exceeded' });
    }
  }
  return {
    ...result,
    budget: {
      status: violations.length === 0 ? 'ok' : 'failed',
      limits,
      violations,
    },
  };
};

const scenarios = [
  { id: '1k-x-20', rows: 1_000, columns: 20, denseColumns: 20, samples: 15, heapMb: 1_024 },
  {
    id: '10k-x-50',
    rows: 10_000,
    columns: 50,
    denseColumns: 50,
    samples: 11,
    heapMb: 2_048,
  },
  {
    id: '100k-x-100',
    rows: 100_000,
    columns: 100,
    denseColumns: 100,
    samples: 7,
    heapMb: 4_096,
  },
  {
    id: '1m-x-100',
    rows: 1_000_000,
    columns: 100,
    denseColumns: 100,
    samples: 3,
    heapMb: 6_144,
    timeoutMs: 12 * 60_000,
  },
  {
    id: '1m-x-500-sparse',
    rows: 1_000_000,
    columns: 500,
    denseColumns: 8,
    samples: 3,
    heapMb: 6_144,
    timeoutMs: 12 * 60_000,
    note: 'Sparse-row engine test; a dense 500-field payload is rejected by preflight.',
  },
  {
    id: 'tree-100k-depth-10',
    kind: 'tree',
    rows: 100_000,
    columns: 20,
    denseColumns: 8,
    maxDepth: 10,
    samples: 5,
    heapMb: 4_096,
  },
];

const activeScenarios = quick ? scenarios.slice(0, 3) : scenarios;
const results = [];

for (const scenario of activeScenarios) {
  process.stderr.write(`[bench] ${scenario.id}\n`);
  const child = spawnSync(
    process.execPath,
    ['--expose-gc', `--max-old-space-size=${scenario.heapMb}`, worker, JSON.stringify(scenario)],
    {
      cwd: dirname(root),
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      timeout: scenario.timeoutMs ?? 5 * 60_000,
    }
  );

  if (child.status === 0) {
    results.push(JSON.parse(child.stdout));
    continue;
  }

  results.push({
    scenario,
    status: child.error?.code === 'ETIMEDOUT' ? 'timeout' : 'failed',
    exitCode: child.status,
    signal: child.signal,
    error: (child.stderr || child.error?.message || 'Unknown worker failure').trim(),
  });
}

const evaluatedResults = results.map(applyPerformanceBudget);

const output = {
  generatedAt: new Date().toISOString(),
  runtime: {
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
    cpu: os.cpus()[0]?.model,
    logicalCpus: os.cpus().length,
    totalMemoryBytes: os.totalmem(),
  },
  mode: quick ? 'quick' : 'full',
  methodology: {
    isolation: 'One child process per scenario',
    gc: 'Forced before memory checkpoints and hot-operation samples',
    percentiles: 'Nearest-rank over measured samples',
    denseGuard:
      'The 1M x 500 case uses 8 materialized values per row. Dense payload memory is estimated separately and rejected before allocation.',
    budgets:
      'Regression guards use generous absolute ceilings so shared CI runner variance does not masquerade as a product regression.',
  },
  results: evaluatedResults,
};

mkdirSync(dirname(resultPath), { recursive: true });
writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`);

const summary = evaluatedResults.map((result) => ({
  scenario: result.scenario.id,
  status: result.status,
  budgetStatus: result.budget?.status ?? 'not-configured',
  budgetViolations: result.budget?.violations ?? [],
  coreRowModelMs: result.metrics?.coreRowModel?.p50,
  sortP95Ms: result.metrics?.sort?.p95,
  filterP95Ms: result.metrics?.filter?.p95,
  selectAllP95Ms: result.metrics?.selectAll?.p95,
  heapAfterCoreMb: result.memory?.heapAfterCoreMb,
}));
process.stdout.write(`${JSON.stringify(summary, null, 2)}\nResults: ${resultPath}\n`);

if (
  evaluatedResults.some((result) => result.status !== 'ok' || result.budget?.status === 'failed')
) {
  process.exitCode = 1;
}
