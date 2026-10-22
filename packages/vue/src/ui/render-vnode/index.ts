import { defineComponent, type PropType, type VNodeChild } from 'vue';

/**
 * 渲染任意 VNodeChild（VNode、字符串、数组等）。
 *
 * 用于把插槽/prop 传入的动态内容放进模板，避免在各组件里重复定义同样的
 * `defineComponent({ props: { value } })`。
 */
export const RenderVNode = defineComponent({
  name: 'STableRenderVNode',
  props: {
    value: { type: null as unknown as PropType<VNodeChild>, required: true },
  },
  setup: (props) => () => props.value,
});
