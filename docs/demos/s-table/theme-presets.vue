<script setup lang="ts">
import { shallowRef } from 'vue';
import STable, { type STableColumn, type STableRowSelection } from '../../../packages/vue/src';

type ThemePreset = 'jade' | 'rose' | 'graphite';

interface Deployment {
  id: number;
  service: string;
  version: string;
  environment: '生产' | '预发';
  result: '成功' | '待发布';
}

const presets = [
  { value: 'jade', label: '青黛', color: '#0f766e' },
  { value: 'rose', label: '胭脂', color: '#be123c' },
  { value: 'graphite', label: '石墨', color: '#334155' },
] as const;

const activePreset = shallowRef<ThemePreset>('jade');

const columns: STableColumn<Deployment>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID', width: 68 },
  { id: 'service', accessorKey: 'service', header: '服务', width: 112 },
  { id: 'version', accessorKey: 'version', header: '版本', width: 96 },
  { id: 'environment', accessorKey: 'environment', header: '环境', width: 88 },
  { id: 'result', accessorKey: 'result', header: '结果', width: 96 },
];

const dataSource: Deployment[] = [
  { id: 1, service: '用户中心', version: 'v3.8.2', environment: '生产', result: '成功' },
  { id: 2, service: '订单服务', version: 'v2.6.0', environment: '预发', result: '待发布' },
  { id: 3, service: '支付网关', version: 'v4.1.3', environment: '生产', result: '成功' },
  { id: 4, service: '搜索服务', version: 'v1.9.5', environment: '预发', result: '待发布' },
];

const rowSelection: STableRowSelection<Deployment> = {
  type: 'checkbox',
  hideSelectAll: true,
};
</script>

<template>
  <section class="theme-presets-demo" :class="`theme-presets-demo--${activePreset}`">
    <div class="theme-presets-toolbar">
      <strong>主题预设</strong>
      <div class="theme-presets-control" role="group" aria-label="主题预设">
        <button
          v-for="preset in presets"
          :key="preset.value"
          type="button"
          :class="{ active: activePreset === preset.value }"
          :aria-pressed="activePreset === preset.value"
          @click="activePreset = preset.value"
        >
          <span class="theme-preset-swatch" :style="{ backgroundColor: preset.color }" />
          {{ preset.label }}
        </button>
      </div>
    </div>

    <STable
      row-key="id"
      bordered
      striped
      :columns="columns"
      :data-source="dataSource"
      :row-selection="rowSelection"
      :default-selected-row-keys="[2]"
    />
  </section>
</template>

<style scoped>
.theme-presets-demo {
  --demo-surface: #ffffff;
  --demo-toolbar-border: #cbd5e1;

  padding: 16px;
  border: 1px solid var(--s-color-border);
  border-radius: 8px;
  background: var(--demo-surface);
  color: var(--s-color-text);
  transition:
    background-color var(--s-duration-normal),
    border-color var(--s-duration-normal),
    color var(--s-duration-normal);
}

.theme-presets-demo--jade {
  --s-primary-color: #0f766e;
  --s-color-bg-header: #ecfdf5;
  --s-color-bg-cell: #ffffff;
  --s-color-bg-row-hover: #f0fdfa;
  --s-color-bg-row-selected: #ccfbf1;
  --s-color-bg-row-selected-hover: #99f6e4;
  --s-color-bg-row-striped: #f8fafc;
  --s-color-border: #a7f3d0;
  --s-color-border-control: #5eead4;
  --s-color-text: #134e4a;
  --s-color-text-secondary: #376a66;
  --s-radius-sm: 2px;
  --s-radius-md: 4px;
  --s-radius-lg: 6px;
  --s-shadow-dropdown: 0 10px 24px rgba(15, 118, 110, 0.16);
}

.theme-presets-demo--rose {
  --s-primary-color: #be123c;
  --s-color-bg-header: #fff1f2;
  --s-color-bg-cell: #ffffff;
  --s-color-bg-row-hover: #fff1f2;
  --s-color-bg-row-selected: #ffe4e6;
  --s-color-bg-row-selected-hover: #fecdd3;
  --s-color-bg-row-striped: #fffafa;
  --s-color-border: #fecdd3;
  --s-color-border-control: #fda4af;
  --s-color-text: #4c0519;
  --s-color-text-secondary: #881337;
  --s-radius-sm: 6px;
  --s-radius-md: 8px;
  --s-radius-lg: 8px;
  --s-shadow-dropdown: 0 10px 24px rgba(190, 18, 60, 0.16);
}

.theme-presets-demo--graphite {
  --s-primary-color: #334155;
  --s-color-bg-header: #f1f5f9;
  --s-color-bg-cell: #ffffff;
  --s-color-bg-row-hover: #f8fafc;
  --s-color-bg-row-selected: #e2e8f0;
  --s-color-bg-row-selected-hover: #cbd5e1;
  --s-color-bg-row-striped: #f8fafc;
  --s-color-border: #cbd5e1;
  --s-color-border-control: #94a3b8;
  --s-color-text: #0f172a;
  --s-color-text-secondary: #475569;
  --s-radius-sm: 0;
  --s-radius-md: 2px;
  --s-radius-lg: 4px;
  --s-shadow-dropdown: 0 10px 24px rgba(15, 23, 42, 0.18);
}

.theme-presets-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
  font-size: 14px;
}

.theme-presets-control {
  display: inline-flex;
  overflow: hidden;
  border: 1px solid var(--demo-toolbar-border);
  border-radius: var(--s-radius-md);
  background: var(--s-color-bg-cell);
}

.theme-presets-control button {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 0;
  background: transparent;
  color: var(--s-color-text-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
}

.theme-presets-control button + button {
  border-left: 1px solid var(--demo-toolbar-border);
}

.theme-presets-control button:hover {
  background: var(--s-color-bg-row-hover);
}

.theme-presets-control button.active {
  background: var(--s-color-bg-row-selected);
  color: var(--s-primary-color);
  font-weight: 600;
}

.theme-preset-swatch {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 50%;
}

@media (max-width: 520px) {
  .theme-presets-control {
    width: 100%;
  }

  .theme-presets-control button {
    min-width: 0;
    flex: 1;
    justify-content: center;
  }
}
</style>
