<script setup lang="ts">
import { reactive } from 'vue';
import STable, { type STableColumn, type STableExpandable } from '../../../packages/vue/src';

interface Project {
  id: number;
  name: string;
  owner: string;
  stage: string;
}

interface ProjectDetail {
  milestone: string;
  risk: string;
}

const columns: STableColumn<Project>[] = [
  { id: 'id', accessorKey: 'id', header: '编号', width: 88 },
  { id: 'name', accessorKey: 'name', header: '项目' },
  { id: 'owner', accessorKey: 'owner', header: '负责人' },
  { id: 'stage', accessorKey: 'stage', header: '阶段', width: 120 },
];

const dataSource: Project[] = [
  { id: 401, name: '客户中心重构', owner: '林嘉', stage: '开发中' },
  { id: 402, name: '财务数据迁移', owner: '周宁', stage: '联调中' },
  { id: 403, name: '权限模型升级', owner: '陈安', stage: '评审中' },
];

const detailSource: Record<number, ProjectDetail> = {
  401: { milestone: '8 月 18 日灰度', risk: '需要兼容旧版客户标签' },
  402: { milestone: '8 月 22 日完成核对', risk: '历史币种精度需要复核' },
  403: { milestone: '8 月 12 日完成评审', risk: '角色继承规则待业务确认' },
};

const expandable: STableExpandable<Project> = { multiple: false };
const details = reactive<Record<number, ProjectDetail>>({});
const loadingIds = reactive(new Set<number>());

const handleExpandChange = async (expanded: boolean, record: Project) => {
  if (!expanded || details[record.id] || loadingIds.has(record.id)) return;
  loadingIds.add(record.id);
  await new Promise((resolve) => setTimeout(resolve, 500));
  details[record.id] = detailSource[record.id]!;
  loadingIds.delete(record.id);
};
</script>

<template>
  <div class="async-expand-demo">
    <STable
      row-key="id"
      bordered
      :columns="columns"
      :data-source="dataSource"
      :expandable="expandable"
      @expand-change="handleExpandChange"
    >
      <template #expandedRowRender="{ record }">
        <div class="async-expand-detail" aria-live="polite">
          <span v-if="loadingIds.has(record.id)">正在加载项目详情...</span>
          <dl v-else-if="details[record.id]">
            <div>
              <dt>里程碑</dt>
              <dd>{{ details[record.id].milestone }}</dd>
            </div>
            <div>
              <dt>当前风险</dt>
              <dd>{{ details[record.id].risk }}</dd>
            </div>
          </dl>
        </div>
      </template>
    </STable>
  </div>
</template>

<style scoped>
.async-expand-demo {
  padding: 16px;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
}

.async-expand-detail {
  min-height: 52px;
  padding: 12px 16px;
  color: var(--vp-c-text-2, rgba(0, 0, 0, 0.65));
}

.async-expand-detail dl {
  display: grid;
  gap: 8px;
  margin: 0;
}

.async-expand-detail dl div {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 8px;
}

.async-expand-detail dt {
  color: var(--vp-c-text-3, rgba(0, 0, 0, 0.45));
}

.async-expand-detail dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}
</style>
