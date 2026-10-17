import { computed, defineComponent, type PropType } from 'vue';
import { flexRender } from '@tanstack/vue-table';
import type { CachedCellRenderState } from './cellRenderCache';

/**
 * 用 computed 缓存单元格最终渲染结果。它既能跳过父级无关状态更新，也会独立追踪
 * renderer 内读取的 ref/computed/store，避免手写 memo 截断 Vue 响应式依赖。
 */
export default defineComponent({
  name: 'CachedCellContent',
  props: {
    state: { type: Object as PropType<CachedCellRenderState>, required: true },
  },
  setup(props) {
    const content = computed(() => {
      const state = props.state;
      return flexRender(state.render, state.props);
    });
    return () => content.value;
  },
});
