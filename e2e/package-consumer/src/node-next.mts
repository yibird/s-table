import type {
  STableColumns,
  STableInstance,
  STableProps,
  STableSlots,
} from '@zchengfeng/s-table-vue';

interface RecordRow {
  id: number;
  name: string;
}

export type PackageContracts = {
  columns: STableColumns<RecordRow>;
  instance: STableInstance<RecordRow>;
  props: STableProps<RecordRow>;
  slots: STableSlots<RecordRow>;
};
