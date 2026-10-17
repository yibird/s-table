<script setup lang="ts">
import { computed, ref } from 'vue';
import STable, {
  type STableColumn,
  type STablePaginationProps,
  type PaginationPlacement,
} from '../../../packages/vue/src';
import { RadioGroup } from '../../../packages/vue/src/ui/radio';
import { generateEmployees, type Employee } from '../shared';

const columns: STableColumn<Employee>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'age', accessorKey: 'age', header: '年龄', width: 80 },
  { id: 'department', accessorKey: 'department', header: '部门' },
  { id: 'salary', accessorKey: 'salary', header: '月薪' },
];

const dataSource = generateEmployees(86);

// 示例1：基础分页（底部右对齐）
const pagination1 = ref<STablePaginationProps>({
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total) => `共 ${total} 条`,
});

// 示例2：受控分页
const current = ref(1);
const pageSize = ref(10);
const pagination2 = computed<STablePaginationProps>(() => ({
  current: current.value,
  pageSize: pageSize.value,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
  onChange(page: number, size: number) {
    current.value = page;
    pageSize.value = size;
  },
}));

// 示例3：分页位置切换
const placementOptions = [
  { label: '顶部居左', value: 'topStart' },
  { label: '顶部居中', value: 'topCenter' },
  { label: '顶部居右', value: 'topEnd' },
  { label: '底部居左', value: 'bottomStart' },
  { label: '底部居中', value: 'bottomCenter' },
  { label: '底部居右', value: 'bottomEnd' },
];
const currentPlacement = ref<PaginationPlacement>('bottomEnd');
const pagination3 = ref<STablePaginationProps>({
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 条`,
});
</script>

<template>
  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px; margin-bottom: 24px">
    <p style="margin: 0 0 12px; font-weight: 600">基础分页（非受控，bottomEnd）</p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      :pagination="pagination1"
      style="max-height: 560px"
    />
  </div>

  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px; margin-bottom: 24px">
    <p style="margin: 0 0 12px; font-weight: 600">
      受控分页（当前第 {{ current }} 页，每页 {{ pageSize }} 条）
    </p>
    <STable
      :columns="columns"
      :data-source="dataSource"
      :pagination="pagination2"
      pagination-placement="bottomStart"
      style="max-height: 560px"
    />
  </div>

  <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
    <div style="margin-bottom: 12px">
      <p style="margin: 0 0 8px; font-weight: 600">分页位置切换</p>
      <RadioGroup v-model="currentPlacement" :options="placementOptions" />
    </div>
    <STable
      :columns="columns"
      :data-source="dataSource"
      :pagination="pagination3"
      :pagination-placement="currentPlacement"
      style="max-height: 560px"
    />
  </div>
</template>
