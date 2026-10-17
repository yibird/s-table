<script setup lang="ts">
import { shallowRef } from 'vue';
import STable, {
  type STableCellEvent,
  type STableColumn,
  type STableEditingState,
} from '../../../../packages/vue/src';

interface Person {
  id: number;
  name: string;
  score: number;
  children?: Person[];
}

const editableRows = shallowRef<Person[]>([
  { id: 1, name: 'Ada', score: 90 },
  { id: 2, name: 'Grace', score: 88 },
]);
const editEvent = shallowRef('idle');
const editableColumns: STableColumn<Person>[] = [
  { accessorKey: 'id', header: 'ID', width: 80 },
  { accessorKey: 'name', header: 'Name', editable: true },
  {
    accessorKey: 'score',
    header: 'Score',
    editable: true,
    editor: 'number',
    valueParser: Number,
  },
];
const onEditCommit = (editing: STableEditingState, _record: Person, nextRecord: Person) => {
  editEvent.value = `${editing.mode}:${nextRecord.id}:${nextRecord.name}:${nextRecord.score}`;
};

const treeRows: Person[] = [
  {
    id: 10,
    name: 'Platform',
    score: 100,
    children: [
      { id: 11, name: 'Runtime', score: 92 },
      { id: 12, name: 'Tooling', score: 91 },
    ],
  },
  { id: 20, name: 'Product', score: 95 },
];
const treeEvent = shallowRef('idle');
const treeColumns: STableColumn<Person>[] = [
  { accessorKey: 'name', header: 'Team', width: 180 },
  { accessorKey: 'score', header: 'Score', width: 100 },
];
const onTreeCell = (kind: string, payload: STableCellEvent<Person, MouseEvent>) => {
  if (kind === 'context') payload.event.preventDefault();
  treeEvent.value = `${kind}:${payload.rowKey}:${payload.columnId}:${payload.rowIndex}`;
};
</script>

<template>
  <section class="fixture-section" data-testid="editing-table">
    <h2>Cell and row editing</h2>
    <output class="fixture-status" data-testid="edit-event">{{ editEvent }}</output>
    <STable
      v-model:data-source="editableRows"
      row-key="id"
      bordered
      :columns="editableColumns"
      :edit-config="{ mode: 'cell', trigger: 'dblclick' }"
      @edit-commit="onEditCommit"
    />
  </section>

  <section class="fixture-section" data-testid="tree-event-table">
    <h2>Tree data and native events</h2>
    <output class="fixture-status" data-testid="tree-event">{{ treeEvent }}</output>
    <STable
      row-key="id"
      bordered
      default-expand-all-rows
      keyboard-navigation
      :columns="treeColumns"
      :data-source="treeRows"
      :tree="{}"
      @cell-click="(payload) => onTreeCell('click', payload)"
      @cell-context-menu="(payload) => onTreeCell('context', payload)"
      @cell-mouseenter="(payload) => onTreeCell('enter', payload)"
      @cell-mouseleave="(payload) => onTreeCell('leave', payload)"
      @cell-keydown="(payload) => (treeEvent = `key:${payload.rowKey}:${payload.event.key}`)"
    />
  </section>
</template>
