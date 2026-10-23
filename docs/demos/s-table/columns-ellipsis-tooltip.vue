<script setup lang="ts">
import STable, { type STableColumn } from '../../../packages/vue/src';

interface Article {
  id: number;
  title: string;
  summary: string;
  author: string;
}

const dataSource: Article[] = [
  {
    id: 1,
    title: 'STable 虚拟滚动在大数据场景下的渲染策略与性能优化实践',
    summary:
      '这是一段很长的摘要文本，用于演示 autoHeight、ellipsis 与 tooltip 三种超长内容处理方式的差异。',
    author: 'Ada',
  },
  { id: 2, title: '短标题', summary: '短摘要', author: 'Grace' },
  {
    id: 3,
    title: '表头也可通过 customHeaderCell 添加原生 title',
    summary: '鼠标悬浮到被截断的单元格上可以看到完整内容。',
    author: 'Lin',
  },
];

/** 原生 title 完全交给业务控制。 */
const customHeaderCell = (column: STableColumn<Article>) =>
  column.id === 'title' ? { title: String(column.header) } : undefined;
const customCell = (record: Article, _index: number, column: STableColumn<Article>) =>
  column.id === 'title' ? { title: record.title } : undefined;

const columns: STableColumn<Article>[] = [
  {
    id: 'title',
    accessorKey: 'title',
    header: '标题（ellipsis）',
    width: 220,
    ellipsis: true,
  },
  {
    id: 'summary',
    accessorKey: 'summary',
    header: '摘要（Tooltip）',
    width: 260,
    ellipsis: true,
    tooltip: true,
  },
  {
    id: 'author',
    accessorKey: 'author',
    header: '作者',
    width: 120,
  },
];
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <p style="margin: 0 0 12px; color: #666; font-size: 13px">
      `ellipsis` 只负责单行省略；原生 title 由 `customCell` / `customHeaderCell` 自行提供。
      `tooltip` 使用组件浮层，可自定义内容。
    </p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      row-key="id"
      bordered
      :custom-cell="customCell"
      :custom-header-cell="customHeaderCell"
    />
  </div>
</template>
