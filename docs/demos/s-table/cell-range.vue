<script setup lang="ts">
import { ref } from 'vue';
import STable, {
  type STableColumn,
  type STableCellRange,
  type STableRowSelection,
} from '../../../packages/vue/src';

// ── 测试数据 ──
interface DemoData {
  id: number;
  name: string;
  age: number;
  city: string;
  email: string;
  department: string;
  name1: string;
  age1: number;
  city1: string;
  email1: string;
  department1: string;
}

const cities = ['北京', '上海', '杭州', '深圳', '广州', '成都'];
const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];
const departments = ['工程部', '市场部', '设计部', '产品部', '运营部'];

const data = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  name: `${names[i % names.length]}${i + 1}`,
  age: 22 + (i % 30),
  city: cities[i % cities.length],
  email: `user${i + 1}@example.com`,
  department: departments[i % departments.length],
  name1: `${names[i % names.length]}${i + 1}`,
  age1: 22 + (i % 30),
  city1: cities[i % cities.length],
  email1: `user1${i + 1}@example.com`,
  department1: departments[i % departments.length],
}));

const columns: STableColumn<DemoData>[] = [
  { accessorKey: 'id', header: 'ID', width: 100 },
  { accessorKey: 'name', header: '姓名', width: 100 },
  { accessorKey: 'age', header: '年龄', width: 80 },
  { accessorKey: 'city', header: '城市', width: 100 },
  { accessorKey: 'department', header: '部门', width: 100 },
  { accessorKey: 'email', header: '邮箱', width: 200 },
];

// ── 示例 1：cell 模式拖拽框选 ──
const cellRange1 = ref<STableCellRange | null>(null);
const selectedRecords1 = ref<DemoData[]>([]);

const handleCellRangeChange1 = (range: STableCellRange | null) => {
  cellRange1.value = range;
};

const handleCellRangeSelect1 = (_range: STableCellRange, records: DemoData[]) => {
  selectedRecords1.value = records;
};

// ── 示例 2：row 模式行框选 ──
const cellRange2 = ref<STableCellRange | null>(null);

const handleCellRangeChange2 = (range: STableCellRange | null) => {
  cellRange2.value = range;
};

// ── 示例 3：row 模式 + 行选择联动 ──
const cellRange3 = ref<STableCellRange | null>(null);
const selectedKeys3 = ref<(string | number)[]>([]);

const rowSelection3: STableRowSelection<DemoData> = {
  type: 'checkbox',
};

const handleCellRangeChange3 = (range: STableCellRange | null) => {
  cellRange3.value = range;
};

// ── 示例 4：滚动 + 框选 ──
const cellRange4 = ref<STableCellRange | null>(null);

const scrollColumns: STableColumn<DemoData>[] = [
  { accessorKey: 'id', header: 'ID', width: 100, fixed: 'left' },
  { accessorKey: 'name', header: '姓名', width: 100, fixed: 'left' },
  { accessorKey: 'age', header: '年龄', width: 80 },
  { accessorKey: 'city', header: '城市', width: 100 },
  { accessorKey: 'department', header: '部门', width: 120 },
  { accessorKey: 'email', header: '邮箱', width: 220 },
  { accessorKey: 'city1', header: '城市2', width: 100 },
  { accessorKey: 'department1', header: '部门2', width: 120 },
  { accessorKey: 'email1', header: '邮箱2', width: 220 },
  { accessorKey: 'name1', header: '备注', width: 150, fixed: 'right' },
];

const handleCellRangeChange4 = (range: STableCellRange | null) => {
  cellRange4.value = range;
};

// ── 示例 5：cell 模式 + 选择列联动 ──
const cellRange5 = ref<STableCellRange | null>(null);
const selectedKeys5 = ref<(string | number)[]>([]);

const rowSelection5: STableRowSelection<DemoData> = {
  type: 'checkbox',
};

const handleCellRangeChange5 = (range: STableCellRange | null) => {
  cellRange5.value = range;
};

const formatRange = (range: STableCellRange | null): string => {
  if (!range) return '无';
  const minRow = Math.min(range.startRow, range.endRow);
  const maxRow = Math.max(range.startRow, range.endRow);
  const minCol = Math.min(range.startCol, range.endCol);
  const maxCol = Math.max(range.startCol, range.endCol);
  return `行 ${minRow + 1}–${maxRow + 1}，列 ${minCol + 1}–${maxCol + 1}（共 ${(maxRow - minRow + 1) * (maxCol - minCol + 1)} 个单元格）`;
};
</script>

<template>
  <h2>示例 1：单元格框选（cell 模式）</h2>
  <p>拖拽鼠标框选单元格区域，类似 Excel 操作体验。</p>
  <p class="range-info">
    <strong>当前范围：</strong>{{ formatRange(cellRange1) }}
    <span v-if="selectedRecords1.length > 0"> | 涉及 {{ selectedRecords1.length }} 行数据</span>
  </p>
  <STable
    bordered
    :data-source="data"
    :columns="columns"
    :row-key="'id'"
    style="height: 400px"
    :cell-range-selection="{ mode: 'cell' }"
    @cell-range-change="handleCellRangeChange1"
    @cell-range-select="handleCellRangeSelect1"
  />

  <h2 style="margin-top: 48px">示例 2：行框选（row 模式）</h2>
  <p>单击任意行即可高亮整行，适合需要逐行查看的场景。</p>
  <p class="range-info"><strong>当前范围：</strong>{{ formatRange(cellRange2) }}</p>
  <STable
    bordered
    :data-source="data"
    :columns="columns"
    :row-key="'id'"
    :cell-range-selection="{ mode: 'row' }"
    @cell-range-change="handleCellRangeChange2"
  />

  <h2 style="margin-top: 48px">示例 3：行框选 + 行选择联动</h2>
  <p>
    单击行同时触发框选高亮和 Checkbox 选中（<code>selectRowOnClick: true</code>）。
    <span v-if="selectedKeys3.length > 0"> | 已选 {{ selectedKeys3.length }} 行</span>
  </p>
  <p class="range-info"><strong>当前范围：</strong>{{ formatRange(cellRange3) }}</p>
  <STable
    bordered
    :data-source="data"
    :columns="columns"
    :row-key="'id'"
    :row-selection="rowSelection3"
    v-model:selected-row-keys="selectedKeys3"
    :cell-range-selection="{ mode: 'row', selectRowOnClick: true }"
    @cell-range-change="handleCellRangeChange3"
  />
  <h2 style="margin-top: 48px">示例 4：表格滚动 + 框选</h2>
  <p>
    表格同时存在横向和纵向滚动时，拖拽框选仍然正常工作。
    包含左右固定列，验证固定列与框选高亮的协同表现。
  </p>
  <p class="range-info"><strong>当前范围：</strong>{{ formatRange(cellRange4) }}</p>
  <STable
    bordered
    :data-source="data"
    :columns="scrollColumns"
    :row-key="'id'"
    style="height: 300px"
    :cell-range-selection="{ mode: 'cell' }"
    @cell-range-change="handleCellRangeChange4"
  />

  <h2 style="margin-top: 48px">示例 5：单元格框选联动选择列</h2>
  <p>框选单元格后，范围内未选中的行会被选中，已选中的行会被取消选中（仅 checkbox 模式）。</p>
  <p class="range-info">
    <strong>当前范围：</strong>{{ formatRange(cellRange5) }}
    <span v-if="selectedKeys5.length > 0"> | 已选 {{ selectedKeys5.length }} 行</span>
  </p>
  <STable
    bordered
    :data-source="data"
    :columns="columns"
    :row-key="'id'"
    :row-selection="rowSelection5"
    v-model:selected-row-keys="selectedKeys5"
    :cell-range-selection="{ mode: 'cell' }"
    @cell-range-change="handleCellRangeChange5"
  />
</template>

<style scoped>
.range-info {
  padding: 8px 12px;
  background-color: #f5f5f5;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 12px;
}
</style>
