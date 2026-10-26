<template>
  <nav
    v-if="visible"
    :class="[
      's-pagination',
      `s-pagination-${size}`,
      {
        's-pagination-disabled': disabled,
        's-pagination-compact': compact,
        's-pagination-simple': simple,
      },
    ]"
    :aria-label="pageText"
  >
    <span v-if="showTotal" class="s-pagination-total-text">
      {{ showTotal(total, range) }}
    </span>

    <button
      type="button"
      class="s-pagination-item s-pagination-prev"
      :class="{ 's-pagination-item-disabled': current <= 1 }"
      :disabled="disabled || current <= 1"
      :aria-label="`${pageText} ${Math.max(1, current - 1)}`"
      @click="handlePageClick($event, current - 1)"
    >
      <RenderVNode v-if="itemRender" :value="resolveItem(current - 1, 'prev', prevIcon)" />
      <RenderVNode v-else :value="prevIcon" />
    </button>

    <template v-if="simple">
      <span class="s-pagination-simple-pager">
        <span class="s-pagination-simple-current">{{ current }}</span>
        <span class="s-pagination-simple-separator">/</span>
        <span class="s-pagination-simple-total">{{ totalPages }}</span>
      </span>
    </template>

    <template v-else>
      <template v-for="page in pageList" :key="page.key">
        <button
          v-if="page.type === 'jump-prev'"
          type="button"
          class="s-pagination-item s-pagination-jump-prev"
          :disabled="disabled"
          :aria-label="`${jumpToText} ${Math.max(1, current - 5)} ${pageText}`"
          @click="handlePageClick($event, current - 5)"
        >
          <RenderVNode
            v-if="itemRender"
            :value="resolveItem(current - 5, 'jump-prev', jumpPrevIcon)"
          />
          <RenderVNode v-else :value="jumpPrevIcon" />
        </button>
        <button
          v-else-if="page.type === 'jump-next'"
          type="button"
          class="s-pagination-item s-pagination-jump-next"
          :disabled="disabled"
          :aria-label="`${jumpToText} ${Math.min(totalPages, current + 5)} ${pageText}`"
          @click="handlePageClick($event, current + 5)"
        >
          <RenderVNode
            v-if="itemRender"
            :value="resolveItem(Math.min(totalPages, current + 5), 'jump-next', jumpNextIcon)"
          />
          <RenderVNode v-else :value="jumpNextIcon" />
        </button>
        <button
          v-else
          type="button"
          class="s-pagination-item"
          :class="{ 's-pagination-item-active': page.page === current }"
          :disabled="disabled"
          :aria-current="page.page === current ? 'page' : undefined"
          @click="handlePageClick($event, page.page!)"
        >
          <RenderVNode
            v-if="itemRender"
            :value="resolveItem(page.page!, 'page', String(page.page))"
          />
          <template v-else>{{ page.page }}</template>
        </button>
      </template>
    </template>

    <button
      type="button"
      class="s-pagination-item s-pagination-next"
      :class="{ 's-pagination-item-disabled': current >= totalPages }"
      :disabled="disabled || current >= totalPages"
      :aria-label="`${pageText} ${Math.min(totalPages, current + 1)}`"
      @click="handlePageClick($event, current + 1)"
    >
      <RenderVNode v-if="itemRender" :value="resolveItem(current + 1, 'next', nextIcon)" />
      <RenderVNode v-else :value="nextIcon" />
    </button>

    <Select
      v-if="showSizeChanger && !simple"
      class="s-pagination-size-changer"
      :model-value="pageSize"
      :options="pageSizeSelectOptions"
      :size="size"
      :disabled="disabled"
      :placeholder="selectPlaceholder"
      :empty-text="selectEmptyText"
      :aria-label="itemsPerPageText"
      @update:model-value="handleSizeChange"
    />

    <span v-if="showQuickJumper && !simple" class="s-pagination-quick-jumper">
      {{ jumpToText }}
      <input
        type="text"
        class="s-pagination-quick-jumper-input"
        :disabled="disabled"
        :aria-label="jumpToText"
        @keydown.enter="handleJump"
      />
      {{ pageText }}
    </span>
  </nav>
</template>

<script setup lang="ts">
import { computed, h, type VNodeChild } from 'vue';
import { RenderVNode } from '../render-vnode';
import { useComponentSize } from '../useComponentSize';
import { Select } from '../select';
import { showWave } from '../wave';
import { DoubleArrowIcon } from '../../components/icon';
import type { PaginationProps, STablePaginationItemType } from './types';
import './styles.less';

const props = withDefaults(defineProps<PaginationProps>(), {
  current: 1,
  pageSize: 10,
  total: 0,
  disabled: false,
  compact: false,
  showQuickJumper: false,
  showSizeChanger: false,
  pageSizeOptions: () => [10, 20, 50, 100],
  jumpToText: 'Go to',
  pageText: 'Page',
  itemsPerPageText: 'items/page',
  selectPlaceholder: 'Please select',
  selectEmptyText: 'No data',
  simple: false,
  showLessItems: false,
  hideOnSinglePage: false,
  itemRender: undefined,
});

const emit = defineEmits<{
  'update:current': [page: number];
  'update:pageSize': [size: number];
  change: [page: number, pageSize: number];
}>();

const size = useComponentSize(() => props.size);

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));

const visible = computed(() => {
  if (props.total <= 0) return false;
  return !props.hideOnSinglePage || totalPages.value > 1;
});

const range = computed<[number, number]>(() => {
  if (props.total <= 0) return [0, 0];
  const start = (props.current - 1) * props.pageSize + 1;
  const end = Math.min(props.current * props.pageSize, props.total);
  return [start, end];
});

const prevIcon = h(
  'svg',
  { viewBox: '64 64 896 896', width: '1em', height: '1em', fill: 'currentColor' },
  [
    h('path', {
      d: 'M724 218.3V141c0-6.7-7.7-10.4-12.9-6.3L260.3 486.8a31.86 31.86 0 000 50.3l450.8 352.1c5.3 4.1 12.9.4 12.9-6.3v-77.3c0-4.9-2.3-9.6-6.1-12.6l-360-281 360-281.1c3.8-3 6.1-7.7 6.1-12.6z',
    }),
  ]
);
const nextIcon = h(
  'svg',
  { viewBox: '64 64 896 896', width: '1em', height: '1em', fill: 'currentColor' },
  [
    h('path', {
      d: 'M765.7 486.8L314.9 134.7A7.97 7.97 0 00302 141v77.3c0 4.9 2.3 9.6 6.1 12.6l360 281.1-360 281c-3.9 3-6.1 7.7-6.1 12.6V882c0 6.7 7.7 10.4 12.9 6.3l450.8-352.1a31.96 31.96 0 000-50.4z',
    }),
  ]
);
/** 省略号项：默认显示 •••，悬浮时替换为双箭头图标。 */
const createJumpIcon = (direction: 'left' | 'right') =>
  h('span', { class: 's-pagination-jump-content' }, [
    h('span', { class: 's-pagination-jump-icon' }, '•••'),
    h(DoubleArrowIcon, { direction, class: 's-pagination-jump-arrow' }),
  ]);
const jumpPrevIcon = createJumpIcon('left');
const jumpNextIcon = createJumpIcon('right');

interface PageItem {
  key: string;
  type: 'page' | 'jump-prev' | 'jump-next';
  page?: number;
}

const pageList = computed<PageItem[]>(() => {
  const total = totalPages.value;
  const cur = props.current;
  const pages: PageItem[] = [];
  const fullThreshold = props.showLessItems ? 5 : 7;

  if (total <= fullThreshold) {
    for (let i = 1; i <= total; i++) {
      pages.push({ key: `page-${i}`, type: 'page', page: i });
    }
    return pages;
  }

  // 始终显示第一页
  pages.push({ key: 'page-1', type: 'page', page: 1 });

  if (cur > 3) {
    pages.push({ key: 'jump-prev', type: 'jump-prev' });
  }

  const start = Math.max(2, cur - 1);
  const end = Math.min(total - 1, cur + 1);

  for (let i = start; i <= end; i++) {
    pages.push({ key: `page-${i}`, type: 'page', page: i });
  }

  if (cur < total - 2) {
    pages.push({ key: 'jump-next', type: 'jump-next' });
  }

  // 始终显示最后一页
  pages.push({ key: `page-${total}`, type: 'page', page: total });

  return pages;
});

const paginationInfo = computed(() => ({
  current: props.current,
  totalPages: totalPages.value,
}));

/** itemRender 返回 undefined 时回退默认节点。 */
const resolveItem = (
  page: number,
  type: STablePaginationItemType,
  fallback: VNodeChild
): VNodeChild => {
  const rendered = props.itemRender?.(page, type, fallback, paginationInfo.value);
  return rendered === undefined ? fallback : rendered;
};

const pageSizeSelectOptions = computed(() =>
  props.pageSizeOptions.map((n) => ({ label: `${n} ${props.itemsPerPageText}`, value: n }))
);

/** 跳转到边界内的目标页，并发出页码变更事件。 */
const goTo = (page: number) => {
  if (props.disabled) return;
  const clamped = Math.max(1, Math.min(page, totalPages.value));
  if (clamped === props.current) return;
  emit('update:current', clamped);
  emit('change', clamped, props.pageSize);
};

/** 页码项点击：播放 antd 风格波纹后跳转。 */
const handlePageClick = (event: MouseEvent, page: number) => {
  if (event.currentTarget instanceof HTMLElement) showWave(event.currentTarget);
  goTo(page);
};

/** 更新每页条数，并同步修正可能越界的当前页。 */
const handleSizeChange = (newSize: string | number | (string | number)[]) => {
  const size = Number(newSize);
  emit('update:pageSize', size);
  // 调整 current 防止越界
  const maxPage = Math.max(1, Math.ceil(props.total / size));
  const newCurrent = Math.min(props.current, maxPage);
  emit('update:current', newCurrent);
  emit('change', newCurrent, size);
};

/** 处理快速跳页输入，并在提交后清空输入框。 */
const handleJump = (event: KeyboardEvent) => {
  const input = event.target as HTMLInputElement;
  const page = parseInt(input.value, 10);
  if (!isNaN(page)) {
    goTo(page);
  }
  input.value = '';
};
</script>
