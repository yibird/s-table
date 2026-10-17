<template>
  <div ref="triggerRef" class="s-table-filter-trigger-wrapper">
    <button
      ref="triggerButtonRef"
      type="button"
      :class="['s-table-filter-trigger', { 's-table-filter-trigger-active': isActive }]"
      :aria-label="`${locale.accessibility.filterColumn}: ${columnId}`"
      :aria-expanded="isOpen"
      :aria-controls="dropdownId"
      aria-haspopup="dialog"
      @click.stop="toggleDropdown"
    >
      <FilterIcon />
    </button>

    <Teleport v-if="teleportTarget" :to="teleportTarget">
      <div
        v-if="isOpen"
        :id="dropdownId"
        ref="floatingRef"
        class="s-table-filter-dropdown"
        :style="floatingStyles"
        role="dialog"
        :aria-label="`${locale.accessibility.filterColumn}: ${columnId}`"
        @keydown.esc.stop.prevent="closeDropdown(true)"
      >
        <div
          v-if="filterMode === 'custom'"
          class="s-table-filter-dropdown-content s-table-filter-dropdown-custom"
        >
          <slot
            name="custom"
            :selected-keys="localValues"
            :set-selected-keys="setSelectedKeys"
            :confirm="handleConfirm"
            :reset="handleReset"
            :close="closeDropdown"
          />
        </div>
        <div v-else-if="filterMode === 'checkbox'" class="s-table-filter-dropdown-content">
          <div class="s-table-filter-dropdown-list">
            <label
              v-for="item in renderFilterOptions"
              :key="item.key"
              class="s-table-filter-dropdown-checkbox"
              :class="{
                's-table-filter-dropdown-checkbox-checked': isChecked(item.option.value),
              }"
              :style="item.depth > 0 ? { paddingLeft: `${item.depth * 16 + 12}px` } : undefined"
              role="checkbox"
              :aria-checked="isChecked(item.option.value)"
              tabindex="0"
              @click.stop="toggleOption(item.option.value)"
              @keydown.enter.prevent="toggleOption(item.option.value)"
              @keydown.space.prevent="toggleOption(item.option.value)"
            >
              <span
                class="s-table-filter-checkbox-box"
                :class="{ checked: isChecked(item.option.value) }"
              >
                <CheckIcon v-if="isChecked(item.option.value)" :size="12" />
              </span>
              <span class="s-table-filter-checkbox-label">{{ item.option.text }}</span>
            </label>
          </div>
          <div class="s-table-filter-dropdown-footer">
            <Button
              class="s-table-filter-dropdown-btn s-table-filter-dropdown-btn-reset"
              @click="handleReset"
            >
              {{ locale.filter.reset }}
            </Button>
            <Button
              type="primary"
              class="s-table-filter-dropdown-btn s-table-filter-dropdown-btn-confirm"
              @click="handleConfirm"
            >
              {{ locale.filter.confirm }}
            </Button>
          </div>
        </div>

        <div v-else class="s-table-filter-dropdown-content s-table-filter-dropdown-menu">
          <div
            v-for="item in renderFilterOptions"
            :key="item.key"
            class="s-table-filter-dropdown-menu-item"
            :class="{
              's-table-filter-dropdown-menu-item-selected': isChecked(item.option.value),
            }"
            :style="item.depth > 0 ? { paddingLeft: `${item.depth * 16 + 12}px` } : undefined"
            role="menuitemradio"
            :aria-checked="isChecked(item.option.value)"
            tabindex="0"
            @click.stop="handleMenuSelect(item.option.value)"
            @keydown.enter.prevent="handleMenuSelect(item.option.value)"
            @keydown.space.prevent="handleMenuSelect(item.option.value)"
          >
            {{ item.option.text }}
          </div>
          <div class="s-table-filter-dropdown-footer">
            <Button
              class="s-table-filter-dropdown-btn s-table-filter-dropdown-btn-reset"
              @click="handleReset"
            >
              {{ locale.filter.reset }}
            </Button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, shallowRef, useId, useTemplateRef, watch } from 'vue';
import type { STableFilterMode, STableFilterOption } from '../../types';
import { useLocales } from '../../hooks/useLocales';
import { Button } from '../../ui/button';
import { FilterIcon, CheckIcon } from '../icon';
import { useFloatingDropdown } from './useFloatingDropdown';

const locale = useLocales();

type FilterValue = string | number | boolean;

const props = withDefaults(
  defineProps<{
    /** 列 ID。 */
    columnId: string;
    /** 过滤器选项列表。 */
    filters?: STableFilterOption[];
    /** 当前已确认的过滤值。 */
    filteredValues?: FilterValue[];
    /** 过滤模式。 */
    filterMode?: STableFilterMode;
    /** 是否多选过滤。 */
    filterMultiple?: boolean;
    /** 确认过滤回调。 */
    onConfirm?: (values: FilterValue[]) => void;
    /** 重置过滤回调。 */
    onReset?: () => void;
  }>(),
  {
    filteredValues: () => [],
    filters: () => [],
    filterMode: 'checkbox',
    filterMultiple: true,
  }
);

const triggerRef = useTemplateRef<HTMLElement>('triggerRef');
const triggerButtonRef = useTemplateRef<HTMLButtonElement>('triggerButtonRef');
const floatingRef = useTemplateRef<HTMLElement>('floatingRef');
const teleportTarget = computed(() => triggerRef.value?.ownerDocument.body ?? null);
const dropdownId = `s-table-filter-${useId()}`;
const { isOpen, floatingStyles } = useFloatingDropdown(triggerRef, floatingRef);

// 本地临时选择状态（打开面板时编辑，确认时提交）
const localValues = shallowRef<FilterValue[]>([...props.filteredValues]);

// 同步外部 filteredValues 到本地。
// 上游状态 Map 重建时相同内容也可能换新数组引用（受控列每轮都复制副本）；
// 只有外部内容真实变化时才覆盖，避免面板打开期间用户未确认的勾选被无关更新清空。
watch(
  () => props.filteredValues,
  (next, prev) => {
    if (
      prev &&
      next.length === prev.length &&
      next.every((value, index) => Object.is(value, prev[index]))
    ) {
      return;
    }
    localValues.value = [...next];
  }
);

// 是否有活跃过滤（已确认的过滤值非空）
const isActive = computed(() => props.filteredValues.length > 0);

// 选中集合只在 localValues 变化时重建，长列表渲染时每项均为 O(1) 查询。
const localValueSet = computed(() => new Set(localValues.value));

interface RenderFilterOption {
  key: string;
  option: STableFilterOption;
  depth: number;
}

/**
 * 将级联选项预编译为带层级的渲染列表。
 * 过滤配置变化时只遍历一次，模板不再递归求值；路径进入 key，允许不同分支复用相同 value。
 */
const renderFilterOptions = computed<RenderFilterOption[]>(() => {
  const result: RenderFilterOption[] = [];
  const walk = (options: readonly STableFilterOption[], depth: number, parentPath: string) => {
    for (let index = 0; index < options.length; index++) {
      const option = options[index]!;
      const path = `${parentPath}${index}:${typeof option.value}:${String(option.value)}`;
      result.push({ key: path, option, depth });
      if (option.children?.length) walk(option.children, depth + 1, `${path}/`);
    }
  };
  walk(props.filters, 0, '');
  return result;
});

/** 判断指定过滤值是否处于本地选中状态。 */
const isChecked = (value: FilterValue): boolean => localValueSet.value.has(value);

/** 按单选或多选模式切换本地过滤值。 */
const toggleOption = (value: FilterValue) => {
  if (props.filterMultiple) {
    if (localValueSet.value.has(value)) {
      localValues.value = localValues.value.filter((v) => v !== value);
    } else {
      localValues.value = [...localValues.value, value];
    }
  } else {
    localValues.value = [value];
  }
};

/** 提交菜单模式下选中的单个过滤值。 */
const handleMenuSelect = (value: FilterValue) => {
  props.onConfirm?.([value]);
  isOpen.value = false;
};

/** 提交复选模式下的全部本地过滤值。 */
const handleConfirm = () => {
  props.onConfirm?.([...localValues.value]);
  isOpen.value = false;
};
const setSelectedKeys = (values: FilterValue[]) => {
  localValues.value = [...values];
};
const closeDropdown = (restoreFocus = false) => {
  isOpen.value = false;
  if (restoreFocus) nextTick(() => triggerButtonRef.value?.focus());
};

/** 清空过滤值并通知外部重置。 */
const handleReset = () => {
  localValues.value = [];
  props.onReset?.();
  isOpen.value = false;
};

/** 切换过滤浮层，并在打开时同步外部状态。 */
const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    // 重新打开时同步外部状态到本地
    localValues.value = [...props.filteredValues];
  }
};
</script>
