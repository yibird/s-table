<script setup lang="ts">
import { ref, computed } from 'vue';
import STable, {
  type STableColumn,
  en_US,
  zh_CN,
  type STableLocale,
} from '../../../packages/vue/src';

type UserRecord = {
  id: number;
  name: string;
  age: number;
  status: string;
};

const dataSource: UserRecord[] = [];

const columns: STableColumn<UserRecord>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 100 },
  { id: 'name', accessorKey: 'name', header: 'Name', width: 150 },
  { id: 'age', accessorKey: 'age', header: 'Age', width: 100 },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    width: 150,
    filters: [
      { text: 'Active', value: 'active' },
      { text: 'Inactive', value: 'inactive' },
    ],
    onFilter: (value, record) => record.status === value,
  },
];

const currentLocale = ref<STableLocale>(en_US);
const currentLang = computed(() =>
  currentLocale.value.localeName === 'zh_CN' ? '简体中文' : 'English'
);

const setLocale = (locale: STableLocale) => {
  currentLocale.value = locale;
};
</script>

<template>
  <div style="display: grid; gap: 20px">
    <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px">
        <p style="margin: 0; font-weight: 600">Locale Switcher</p>
        <span style="margin: 0; font-size: 13px; color: rgba(0, 0, 0, 0.45)"
          >当前语言：{{ currentLang }}</span
        >
        <button
          @click="setLocale(en_US)"
          :style="[
            'padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; transition: all 0.2s;',
            currentLocale === en_US
              ? 'background: #1677ff; color: #fff; border: 1px solid #1677ff;'
              : 'background: #fff; color: rgba(0,0,0,0.88); border: 1px solid #d9d9d9;',
          ]"
        >
          English
        </button>
        <button
          @click="setLocale(zh_CN)"
          :style="[
            'padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; transition: all 0.2s;',
            currentLocale === zh_CN
              ? 'background: #1677ff; color: #fff; border: 1px solid #1677ff;'
              : 'background: #fff; color: rgba(0,0,0,0.88); border: 1px solid #d9d9d9;',
          ]"
        >
          简体中文
        </button>
      </div>
      <STable :columns="columns" :data-source="dataSource" :locale="currentLocale" />
    </div>

    <div style="padding: 16px; border: 1px dashed #d9d9d9; border-radius: 12px">
      <p style="margin: 0 0 12px; font-weight: 600">{{ currentLang }}</p>
      <STable :columns="columns" :data-source="dataSource" :locale="currentLocale" />
    </div>
  </div>
</template>
