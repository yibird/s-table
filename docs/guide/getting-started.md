# 快速开始

## 安装

::: code-group

```sh [pnpm]
pnpm add @zchengfeng/s-table-vue
```

```sh [npm]
npm install @zchengfeng/s-table-vue
```

:::

## 使用

```vue
<script setup lang="ts">
import { STable, type STableColumn } from '@zchengfeng/s-table-vue';
import '@zchengfeng/s-table-vue/style.css';

interface User {
  id: number;
  name: string;
}

const columns: STableColumn<User>[] = [
  { accessorKey: 'id', header: 'ID', sorter: true },
  { accessorKey: 'name', header: '姓名', search: true },
];

const dataSource: User[] = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];
</script>

<template>
  <STable row-key="id" :columns="columns" :data-source="dataSource" />
</template>
```

生产场景中，启用行选择、展开、拖拽或虚拟滚动时应始终提供稳定且唯一的 `row-key`。

## 本地开发与构建

```sh
pnpm install
pnpm build
pnpm test
pnpm docs:build
```
