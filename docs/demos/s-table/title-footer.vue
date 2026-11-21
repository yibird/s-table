<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue';
import STable, { type STableColumn, type STableInstance } from '../../../packages/vue/src';
import { generateEmployees, type Employee } from '../shared';

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 80 },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'department', accessorKey: 'department', header: '部门' },
  { id: 'salary', accessorKey: 'salary', header: '月薪', align: 'right', width: 120 },
];

const dataSource = shallowRef(generateEmployees(23));
const slotTableRef = useTemplateRef<STableInstance<Employee>>('slotTable');

const titleText = ({ currentPageData }: { currentPageData: Employee[] }) =>
  `员工列表 · 当前页 ${currentPageData.length} 人`;

const footerText = ({
  currentPage,
  pageSize,
  total,
}: {
  currentPage: number;
  pageSize: number;
  total: number;
}) => `第 ${currentPage} 页 · ${pageSize} 条/页 · 共 ${total} 条`;

const exportPage = () => {
  slotTableRef.value?.exportCsv({
    dataSource: 'currentPage',
    filename: 'employees-page.csv',
    download: true,
  });
};
</script>

<template>
  <div class="title-footer-demo">
    <section>
      <h4>函数属性</h4>
      <STable
        :columns="columns"
        :data-source="dataSource"
        row-key="id"
        :title="titleText"
        :footer="footerText"
        :pagination="{ defaultPageSize: 5 }"
        bordered
      />
    </section>

    <section>
      <h4>插槽</h4>
      <STable
        ref="slotTable"
        :columns="columns"
        :data-source="dataSource"
        row-key="id"
        :pagination="{ defaultPageSize: 5 }"
        bordered
      >
        <template #title="{ currentPageData }">
          <div class="demo-title">
            <strong>员工列表</strong>
            <span class="demo-muted">当前页 {{ currentPageData.length }} 人</span>
            <button type="button" class="demo-button" @click="exportPage">导出当前页</button>
          </div>
        </template>
        <template #footer="{ currentPage, pageSize, total }">
          <div class="demo-footer">
            <span class="demo-muted">第 {{ currentPage }} 页 · {{ pageSize }} 条/页</span>
            <span>共 {{ total }} 条</span>
          </div>
        </template>
      </STable>
    </section>
  </div>
</template>

<style scoped>
.title-footer-demo {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 12px;
}

.title-footer-demo h4 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.demo-title,
.demo-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.demo-footer {
  justify-content: space-between;
}

.demo-muted {
  color: var(--vp-c-text-2);
}

.demo-title .demo-button {
  margin-left: auto;
}

.demo-button {
  padding: 4px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 12px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s;
}

.demo-button:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
</style>
