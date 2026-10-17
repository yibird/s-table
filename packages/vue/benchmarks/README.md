# STable performance benchmarks

The benchmark isolates data allocation, TanStack Table row models, cell
materialization, sorting, filtering, selection, immutable edits, expansion and
column sizing. Each scenario runs in a separate Node process with forced GC and
an explicit heap limit.

```bash
pnpm bench:performance:quick
pnpm bench:performance
```

Results are written to `packages/vue/benchmarks/results/latest.json` and include
nearest-rank P50/P95/P99/Max values. The 1M x 500 scenario intentionally stores
only eight values per row while still creating 500 column definitions. Its
dense payload would contain 500 million values before TanStack creates any Row
objects, so the harness reports that estimate instead of risking an OOM.

Node timings cover the data and row-model pipeline, not browser layout, paint,
scroll FPS or DOM memory. Those require the browser benchmark described in the
performance audit.
