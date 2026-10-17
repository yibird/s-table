<script setup lang="ts">
import { shallowRef } from 'vue';
import STable, { type STableColumn, type STableVirtualProps } from '../../../packages/vue/src';

interface MatrixRow {
  id: number;
  name: string;
  values: number[];
}

const metricCount = 60;
const columns: STableColumn<MatrixRow>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100, fixed: 'left' },
  { id: 'name', accessorKey: 'name', header: '名称', width: 140, fixed: 'left' },
  ...Array.from(
    { length: metricCount },
    (_, index): STableColumn<MatrixRow> => ({
      id: `metric-${index + 1}`,
      header: `指标 ${index + 1}`,
      width: 120,
      accessorFn: (record) => record.values[index],
    })
  ),
  {
    id: 'total',
    header: '合计',
    width: 140,
    fixed: 'right',
    accessorFn: (record) => record.values.reduce((sum, value) => sum + value, 0),
  },
];

// 大矩阵保持浅响应式，单元格值由 TanStack 按当前虚拟窗口读取。
const dataSource = shallowRef<MatrixRow[]>(
  Array.from({ length: 10_000 }, (_, rowIndex) => ({
    id: rowIndex + 1,
    name: `记录 ${rowIndex + 1}`,
    values: Array.from(
      { length: metricCount },
      (_, columnIndex) => ((rowIndex + 1) * (columnIndex + 3)) % 10_000
    ),
  }))
);

const virtual: STableVirtualProps = {
  y: true,
  x: true,
  rowHeight: 47,
  overscan: 20,
  columnOverscan: 3,
  columnEstimateSize: 120,
};
</script>

<template>
  <STable
    :columns="columns"
    :data-source="dataSource"
    :virtual="virtual"
    row-key="id"
    style="height: 420px"
  />
</template>
