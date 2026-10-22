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
      <RenderVNode v-if="filterIcon !== undefined" :value="filterIcon" />
      <FilterIcon v-else />
    </button>

    <Teleport v-if="teleportTarget" :to="teleportTarget">
      <Transition name="scale-down" @after-leave="handleAfterLeave">
        <div
          v-if="isOpen"
          :id="dropdownId"
          ref="floatingRef"
          class="s-table-filter-dropdown"
          :style="floatingStyles"
          :data-placement="placement"
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
          <div v-else class="s-table-filter-dropdown-menu">
            <component
              :is="effectiveMultiple ? Checkbox : Radio"
              v-for="item in renderFilterOptions"
              :key="item.key"
              class="s-table-filter-dropdown-menu-item"
              :class="{
                's-table-filter-dropdown-menu-item-selected': isChecked(item.option.value),
              }"
              :style="item.depth > 0 ? { paddingLeft: `${item.depth * 16 + 12}px` } : undefined"
              :model-value="effectiveMultiple ? isChecked(item.option.value) : selectedValue"
              :value="effectiveMultiple ? undefined : item.option.value"
              @update:model-value="handleItemUpdate(item.option.value)"
            >
              {{ item.option.text }}
            </component>
            <div v-if="effectiveMultiple" class="s-table-filter-dropdown-footer">
              <Button
                size="small"
                class="s-table-filter-dropdown-btn s-table-filter-dropdown-btn-reset"
                @click="handleReset"
              >
                {{ locale.filter.reset }}
              </Button>
              <Button
                size="small"
                type="primary"
                class="s-table-filter-dropdown-btn s-table-filter-dropdown-btn-confirm"
                @click="handleConfirm"
              >
                {{ locale.filter.confirm }}
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { computed, shallowRef, useId, useTemplateRef, watch, type VNodeChild } from 'vue';
import type { STableFilterMode, STableFilterOption } from '../../types';
import { useLocales } from '../../locales/useLocales';
import { injectTableHeaderContext, injectTablePresentationContext } from '../../context/table';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { Radio } from '../../ui/radio';
import { FilterIcon } from '../icon';
import { useFloatingDropdown } from './useFloatingDropdown';
import { useDropdownFocus } from './useDropdownFocus';
import { RenderVNode } from '../../ui/render-vnode';

const locale = useLocales();

type FilterValue = string | number | boolean;

/** 自定义筛选面板插槽（由 HeaderCell 补充 column / columnId 后转发为公开 `filterPanel`）。 */
interface FilterCustomSlotContext {
  selectedKeys: FilterValue[];
  setSelectedKeys: (values: FilterValue[]) => void;
  confirm: () => void;
  reset: () => void;
  close: () => void;
}

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
    /** 自定义筛选图标（由 HeaderCell 按列配置求值）。 */
    filterIcon?: VNodeChild;
    /** 单列受控打开状态。 */
    filterDropdownOpen?: boolean;
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
    filterDropdownOpen: undefined,
  }
);

defineSlots<{
  custom?: (scope: FilterCustomSlotContext) => unknown;
}>();

const triggerRef = useTemplateRef<HTMLElement>('triggerRef');
const triggerButtonRef = useTemplateRef<HTMLButtonElement>('triggerButtonRef');
const floatingRef = useTemplateRef<HTMLElement>('floatingRef');
const dropdownId = `s-table-filter-${useId()}`;
const { getPopupContainer } = injectTablePresentationContext();
const { filterDropdownOpenKeys, onFilterDropdownOpenChange } = injectTableHeaderContext();

// 受控优先级：列级 filterDropdownOpen > 表格级 filterDropdownOpenKeys > 内部状态。
const controlledOpen = computed<boolean | undefined>(() => {
  if (props.filterDropdownOpen !== undefined) return props.filterDropdownOpen;
  const keys = filterDropdownOpenKeys.value;
  return keys ? keys.includes(props.columnId) : undefined;
});

const { isOpen, floatingStyles, placement, teleportTarget } = useFloatingDropdown(
  triggerRef,
  floatingRef,
  {
    open: controlledOpen,
    onOpenChange: (open) => onFilterDropdownOpenChange(props.columnId, open),
    getContainer: () => (triggerRef.value ? getPopupContainer(triggerRef.value) : null),
  }
);

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

/** 单选过滤模式下当前选中的值。 */
const selectedValue = computed<FilterValue | undefined>(() => localValues.value[0]);

/** menu 模式固定单选；checkbox 模式由 `filterMultiple` 决定。 */
const effectiveMultiple = computed(() => props.filterMode === 'checkbox' && props.filterMultiple);

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

/** 多选模式下切换本地过滤值。 */
const toggleOption = (value: FilterValue) => {
  if (localValueSet.value.has(value)) {
    localValues.value = localValues.value.filter((v) => v !== value);
  } else {
    localValues.value = [...localValues.value, value];
  }
};

/**
 * 聚焦浮层内第一个可交互元素。
 *
 * 面板通过 Teleport 渲染到 body 末尾，若不主动移动焦点，键盘用户按 Tab
 * 会先走完页面其余控件才到面板，等于无法使用。role="dialog" 也要求焦点进入面板。
 */
const { focusInitial, closeWithFocus, closeWithoutFocus, resetRestoreFocus, handleAfterLeave } =
  useDropdownFocus({
    triggerRef: triggerButtonRef,
    floatingRef,
    isOpen,
    getInitialFocus: (root) =>
      root.querySelector<HTMLElement>(
        '[role="checkbox"][tabindex], [role="menuitemradio"][tabindex], input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ),
  });

const closeDropdown = (restoreFocus = false) => {
  if (restoreFocus) closeWithFocus();
  else closeWithoutFocus();
};

/** 多选切换 / 单选立即提交，两种模式的差异只保留在这里。 */
const handleItemUpdate = (value: FilterValue) => {
  if (effectiveMultiple.value) {
    toggleOption(value);
    return;
  }
  localValues.value = [value];
  props.onConfirm?.([value]);
  closeDropdown(true);
};

/** 提交复选模式下的全部本地过滤值。 */
const handleConfirm = () => {
  props.onConfirm?.([...localValues.value]);
  closeDropdown(true);
};
const setSelectedKeys = (values: FilterValue[]) => {
  localValues.value = [...values];
};

/** 清空过滤值并通知外部重置。 */
const handleReset = () => {
  localValues.value = [];
  props.onReset?.();
  closeDropdown(true);
};

/** 切换过滤浮层，并在打开时同步外部状态。 */
const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    resetRestoreFocus();
    // 重新打开时同步外部状态到本地
    localValues.value = [...props.filteredValues];
    focusInitial();
  }
};
</script>
