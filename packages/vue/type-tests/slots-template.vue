<script setup lang="ts">
import STable, { type STableColumns } from '../src';

interface User {
  id: number;
  name: string;
  score: number;
}

const columns = [
  { accessorKey: 'name', header: '姓名' },
  { accessorKey: 'score', header: '分数', sorter: true, editable: true },
] satisfies STableColumns<User>;

const dataSource: User[] = [{ id: 1, name: 'Ada', score: 98.5 }];

// 如果模板插槽的 record 退化为 RowData/any，这里会产生类型错误。
const expectUser = (user: User) => user.name;
</script>

<template>
  <STable
    row-key="id"
    row-drag
    :columns="columns"
    :data-source="dataSource"
    :expandable="{}"
    :pagination="false"
  >
    <template #title="{ currentPageData }">
      {{ currentPageData.length }} / {{ expectUser(currentPageData[0]!) }}
    </template>

    <template #footer="{ currentPageData, currentPage, pageSize, total }">
      {{ expectUser(currentPageData[0]!) }} {{ currentPage }} {{ pageSize }} {{ total }}
    </template>

    <template #expandedRowRender="{ record, index, expanded }">
      {{ expectUser(record) }} {{ record.score.toFixed(1) }} {{ index }} {{ expanded }}
    </template>

    <template #contextMenu="{ row, rowIndex, close }">
      {{ expectUser(row) }} {{ row.score.toFixed(1) }} {{ rowIndex }}
      <button type="button" @click="close">close</button>
    </template>

    <template #rowDragHandle="{ record, index }"> {{ expectUser(record) }} {{ index }} </template>

    <template #cellEditor="{ record, rowKey, columnId, value, setValue, commit, cancel }">
      {{ expectUser(record) }} {{ String(rowKey) }} {{ columnId }} {{ String(value) }}
      <button
        type="button"
        @click="
          setValue(value);
          cancel();
        "
      >
        {{ typeof commit }}
      </button>
    </template>

    <template #filterPanel="{ columnId, selectedKeys, setSelectedKeys, confirm, reset, close }">
      {{ columnId }} {{ selectedKeys.length }}
      <button
        type="button"
        @click="
          setSelectedKeys([]);
          confirm();
          reset();
          close();
        "
      >
        filter
      </button>
    </template>

    <template #groupRow="{ column, groupValue, count, depth, expanded, toggle }">
      {{ column?.id }} {{ String(groupValue) }} {{ count }} {{ depth }} {{ expanded }}
      <button type="button" @click="toggle">toggle</button>
    </template>

    <template #scrollToBottom>加载中</template>
    <template #emptyAction>新增</template>
  </STable>
</template>
