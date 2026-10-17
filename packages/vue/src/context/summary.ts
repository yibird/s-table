import type { CSSProperties, InjectionKey, Ref } from 'vue';
import type { STableFixedColumnStyle } from '../utils/columnMetrics';

/** Summary 上下文，提供固定列样式和可见叶子列信息 */
export interface SummaryContext {
  fixedColumnStyles: Readonly<Ref<Map<string, STableFixedColumnStyle>>>;
  visibleLeafColumns: Readonly<Ref<Array<{ id: string }>>>;
  /** 语义化 summary 单元格样式。 */
  summaryCellStyles?: Readonly<Ref<CSSProperties | undefined>>;
  /** 语义化 summary 单元格类名。 */
  summaryCellClasses?: Readonly<Ref<string | undefined>>;
}

export const SummaryContextKey: InjectionKey<SummaryContext> = Symbol('STableSummary');
