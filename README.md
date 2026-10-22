# S-Table

<p align="center">
  <strong>A high-performance data grid for Vue 3</strong>
  <br>
  Built on TanStack Table with virtualization, editing, selection and more
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@zchengfeng/s-table-vue"><img src="https://img.shields.io/npm/v/@zchengfeng/s-table-vue.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@zchengfeng/s-table-vue"><img src="https://img.shields.io/npm/dm/@zchengfeng/s-table-vue.svg" alt="npm downloads"></a>
  <a href="https://github.com/zchengfeng/s-table/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@zchengfeng/s-table-vue.svg" alt="license"></a>
</p>

<p align="center">
  English | <a href="./README.zh-CN.md">简体中文</a>
</p>

## Features

- **High-performance virtualization** — vertical and horizontal virtualization with dynamic row measurement; handles 100K+ rows
- **Feature complete** — sorting, filtering, pagination, editing, expandable rows, grouping, pinned/fixed columns, drag-and-drop, cell range selection and summaries
- **Type safe** — public types do not leak TanStack internals; column accessors infer value types from `TData`
- **Reusable core** — column pipeline, editing, selection and other core logic live in a framework-agnostic core package
- **Internationalization** — built-in English and Chinese dictionaries, with custom locale overrides

## Installation

```bash
npm install @zchengfeng/s-table-vue
# or pnpm add @zchengfeng/s-table-vue
```

## Quick start

```vue
<script setup lang="ts">
import { ref } from 'vue';
import STable from '@zchengfeng/s-table-vue';
import '@zchengfeng/s-table-vue/style.css';

interface User {
  id: number;
  name: string;
  age: number;
  email: string;
}

const columns = [
  { accessorKey: 'id', header: 'ID', width: 80 },
  { accessorKey: 'name', header: 'Name', width: 120 },
  { accessorKey: 'age', header: 'Age', width: 100 },
  { accessorKey: 'email', header: 'Email' },
];

const dataSource = ref<User[]>([
  { id: 1, name: 'Alice', age: 25, email: 'alice@example.com' },
  { id: 2, name: 'Bob', age: 30, email: 'bob@example.com' },
]);
</script>

<template>
  <STable :columns="columns" :data-source="dataSource" row-key="id" />
</template>
```

More examples covering virtualization, editing, selection and other features live in `docs/demos/`.

## Documentation

The documentation site is built with VitePress from `docs/`:

```bash
pnpm docs:dev      # local development
pnpm docs:build    # production build
```

It includes 20+ guides and 70+ runnable demos covering basics, virtualization, editing, tree data, grouping, cell range selection, theming and more.

## Architecture

```
packages/core   @zchengfeng/s-table-core   Framework-agnostic core: column pipeline, editing, selection
packages/vue    @zchengfeng/s-table-vue    Vue 3 adapter: reactivity, component rendering, DOM interaction
packages/react                              Planned; follow core module boundaries and the Vue adapter's composition patterns
```

Dependencies are strictly one-directional: `vue → core`. The core package has no framework dependencies.

The core is organized by domain: `columns/` (column normalization and ordering), `state/` (pagination, sorting and selection state machines), `clipboard/` (RFC 4180 escaping and formula-injection protection), `interaction/`, `scroll/`, `editing/` and `utils/`.

Vue adapter layers: `setup/` is the single composition root; `adapter/` bridges TanStack reactivity; `presets/` holds injected internal columns; `hooks/` contains state and interaction hooks only (no component dependencies); `components/` must not depend on hooks/setup; `locales/`, `theme/` and `types/` are shared domain modules. Dependency boundaries are statically enforced by `pnpm check:boundaries`.

## Benchmarks

The numbers below are Node.js row-model benchmarks (`pnpm bench:performance`), not browser frame rates:

| Rows | Row model | Sort  | Filter | Recommended usage                                            |
| ---- | --------- | ----- | ------ | ------------------------------------------------------------ |
| 1K   | 1.6 ms    | 3 ms  | 2 ms   | All features run smoothly                                    |
| 10K  | 14 ms     | 9 ms  | 9 ms   | Recommended baseline                                         |
| 100K | 99 ms     | 86 ms | 67 ms  | Requires virtualization, fixed row height and server sorting |
| 1M   | 2.2 s     | 1.7 s | 1.1 s  | Requires server-side pagination/sorting/filtering            |

Bundle budgets (`pnpm check:bundle-size`): main bundle ≤ 64 KB gzip, styles ≤ 10 KB gzip.

## API stability

| Layer      | Description                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Stable     | Component props / events / slots / instance methods not marked `experimental`                                                   |
| Experiment | Features annotated with `@experimental` in JSDoc: editing, cell range, row/column drag, grouping, pinned rows, selection intent |
| Internal   | Non-public exports such as `setup/` and `hooks/`; compatibility is not guaranteed                                               |

Breaking changes in the 0.x series are documented in `CHANGELOG.md`.

## Development

```bash
pnpm install
pnpm docs:dev            # docs development
pnpm test                # unit tests (core + vue)
pnpm test:e2e            # Playwright E2E
pnpm typecheck:all       # typecheck the whole repo (including e2e)
pnpm build               # build core + vue
pnpm check               # full CI check
```

Test suite: 376 unit tests (48 core + 328 vue) and 151 E2E scenarios, plus performance benchmarks and bundle-size budgets.

## Browser support

Modern browsers (latest two major versions of Chrome, Firefox, Safari and Edge), Node.js ≥ 20. Vue 3 no longer supports IE11.

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md). Commit messages follow Conventional Commits.

## License

[ISC](./LICENSE)
