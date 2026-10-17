<script setup lang="ts">
import STable, { type STableColumn } from '../../../packages/vue/src';

type UserRecord = {
  id: number;
  name: string;
  age: number;
};

const columns: STableColumn<UserRecord>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  { id: 'name', accessorKey: 'name', header: '姓名' },
  { id: 'age', accessorKey: 'age', header: '年龄' },
];
</script>

<template>
  <div style="display: grid; gap: 20px">
    <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
      <p style="margin: 0 0 12px; font-weight: 600">默认空状态</p>
      <STable :columns="columns" :data-source="[]" />
    </div>

    <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
      <p style="margin: 0 0 12px; font-weight: 600">自定义空状态</p>
      <STable :columns="columns" :data-source="[]">
        <template #empty>
          <div
            style="
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 8px;
              padding: 16px 0;
            "
          >
            <div
              style="
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #e6f4ff;
                color: #1677ff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
              "
            >
              !
            </div>
            <div style="color: rgba(0, 0, 0, 0.65); font-weight: 500">当前没有可展示的数据</div>
            <div style="color: rgba(0, 0, 0, 0.45); font-size: 12px">
              你可以调整筛选条件后重新查看
            </div>
          </div>
        </template>
      </STable>
    </div>
  </div>
</template>
