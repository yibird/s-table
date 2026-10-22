<script setup lang="ts">
import STable, {
  SummaryCell,
  SummaryRow,
  type STableClasses,
  type STableColumn,
  type STableStyles,
} from '../../../packages/vue/src';

interface Project {
  id: number;
  project: string;
  owner: string;
  progress: number;
  status: '进行中' | '已完成' | '待开始';
}

const columns: STableColumn<Project>[] = [
  { id: 'id', accessorKey: 'id', header: '编号', width: 72 },
  { id: 'project', accessorKey: 'project', header: '项目名称' },
  { id: 'owner', accessorKey: 'owner', header: '负责人', width: 112 },
  {
    id: 'progress',
    accessorKey: 'progress',
    header: '完成度',
    align: 'right',
    cell: ({ row }) => String(row.original.progress) + '%',
  },
  { id: 'status', accessorKey: 'status', header: '状态', width: 104 },
];

const dataSource: Project[] = [
  { id: 101, project: '设计系统升级', owner: '林晓', progress: 82, status: '进行中' },
  { id: 102, project: '统一身份认证', owner: '周宁', progress: 100, status: '已完成' },
  { id: 103, project: '数据看板重构', owner: '陈默', progress: 46, status: '进行中' },
  { id: 104, project: '移动端适配', owner: '苏言', progress: 0, status: '待开始' },
];

const classes: STableClasses = {
  header: 'semantic-header',
  body: 'semantic-body',
  footer: 'semantic-footer',
  summary: 'semantic-summary',
  headerCell: 'semantic-header-cell',
  headerCellTitle: 'semantic-header-title',
  bodyCell: 'semantic-body-cell',
  summaryCell: 'semantic-summary-cell',
};

const styles: STableStyles = {
  header: { backgroundColor: '#f0fdfa' },
  body: { backgroundColor: '#ffffff' },
  footer: { color: '#475569', fontSize: '12px' },
  summary: { backgroundColor: '#f8fafc' },
  headerCell: { fontWeight: 700 },
  headerCellTitle: { color: '#0f766e' },
  bodyCell: { fontVariantNumeric: 'tabular-nums' },
  summaryCell: { fontWeight: 700 },
};
</script>

<template>
  <section class="semantic-demo">
    <STable
      row-key="id"
      bordered
      striped
      :columns="columns"
      :data-source="dataSource"
      :classes="classes"
      :styles="styles"
    >
      <template #summary>
        <SummaryRow>
          <SummaryCell :index="0">合计</SummaryCell>
          <SummaryCell :index="1">{{ dataSource.length }} 个项目</SummaryCell>
          <SummaryCell :index="2">-</SummaryCell>
          <SummaryCell :index="3" align="right"
            >平均
            {{
              Math.round(
                dataSource.reduce((sum, item) => sum + item.progress, 0) / dataSource.length
              )
            }}%</SummaryCell
          >
          <SummaryCell :index="4">持续跟进</SummaryCell>
        </SummaryRow>
      </template>
      <template #footer>
        <div class="semantic-footer-content">
          <span>数据更新时间：2026-08-11</span>
          <span>共 {{ dataSource.length }} 条记录</span>
        </div>
      </template>
    </STable>
  </section>
</template>

<style scoped>
.semantic-demo {
  padding: 16px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
}

.semantic-demo :deep(.semantic-header) {
  box-shadow: inset 0 -1px 0 #99f6e4;
}

.semantic-demo :deep(.semantic-header-cell) {
  border-right-color: #ccfbf1;
}

.semantic-demo :deep(.semantic-header-title) {
  color: #0f766e;
}

.semantic-demo :deep(.semantic-body) {
  background: #ffffff;
}

.semantic-demo :deep(.semantic-body-cell) {
  color: #334155;
}

.semantic-demo :deep(.semantic-summary) {
  border-top: 2px solid #99f6e4;
}

.semantic-demo :deep(.semantic-summary-cell) {
  color: #0f766e;
}

.semantic-demo :deep(.semantic-footer) {
  border-top: 1px solid #e2e8f0;
}

.semantic-footer-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
