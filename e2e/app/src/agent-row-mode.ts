import { createApp, h, ref } from 'vue';
import STable, { type STableCellRange, type STableColumn } from '../../../packages/vue/src';
import '../../../packages/vue/src/styles';
import './styles.css';

interface Row {
  id: number;
  name: string;
  department: string;
  score: number;
}

const rows: Row[] = [
  { id: 1, name: 'Row 1', department: 'Engineering', score: 90 },
  { id: 2, name: 'Row 2', department: 'Design', score: 80 },
  { id: 3, name: 'Row 3', department: 'Sales', score: 70 },
];

const columns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 70 },
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'department', accessorKey: 'department', header: 'Department' },
];

const app = createApp({
  setup() {
    const rangeText = ref('none');
    const onCellRangeChange = (range: STableCellRange | null) => {
      rangeText.value = range ? JSON.stringify(range) : 'none';
    };
    return () =>
      h('main', { class: 'e2e-app' }, [
        h('section', { class: 'fixture-section', 'data-testid': 'agent-row-mode-table' }, [
          h('h2', 'Row mode cell range'),
          h(
            'output',
            { class: 'fixture-status', 'data-testid': 'agent-range-value' },
            rangeText.value
          ),
          h(
            STable as never,
            {
              rowKey: 'id',
              bordered: true,
              columns,
              dataSource: rows,
              cellRangeSelection: { mode: 'row' },
              onCellRangeChange,
            } as never
          ),
        ]),
      ]);
  },
});

app.mount('#agent-row-mode');
