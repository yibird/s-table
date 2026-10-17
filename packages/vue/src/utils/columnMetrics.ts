import type { CSSProperties, Ref } from 'vue';

/** 固定列的稳定样式（header/body 各自持有 sticky 偏移）。 */
export type STableFixedColumnStyle = {
  className: string;
  headerStyle: CSSProperties;
  bodyStyle: CSSProperties;
};

/**
 * 创建固定列样式查找器。偏移已由模型预计算，渲染热路径只做一次 Map 查询。
 * 这是无状态闭包而非 Vue Hook，使用 `create` 明确它不注册响应式副作用或生命周期。
 */
export const createFixedColumnStyleAccessors = (
  fixedColumnStyles: Readonly<Ref<Map<string, STableFixedColumnStyle>>>,
  layer: 'header' | 'body'
) => {
  const styleKey = layer === 'header' ? 'headerStyle' : 'bodyStyle';
  const getFixedClassName = (columnId: string) => fixedColumnStyles.value.get(columnId)?.className;
  const getFixedStyle = (columnId: string): CSSProperties | undefined =>
    fixedColumnStyles.value.get(columnId)?.[styleKey];
  return { getFixedClassName, getFixedStyle };
};
