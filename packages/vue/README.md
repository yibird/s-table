# @zchengfeng/s-table-vue

Vue 3 table component built on TanStack Table. It provides typed columns,
slots and events, client or server-side data pipelines, row and column
virtualization, selection, fixed columns and editing.

## Install

```bash
pnpm add @zchengfeng/s-table-vue
```

```ts
import STable from '@zchengfeng/s-table-vue';
import '@zchengfeng/s-table-vue/style.css';

const columns = [{ accessorKey: 'name', header: 'Name' }];

const dataSource = [{ name: 'Ada' }];
```

```vue
<STable :columns="columns" :data-source="dataSource" row-key="name" />
```

The package is ESM-only and requires Node.js 20 or newer. TypeScript declarations
for the component, public instance, slots and events are included.
