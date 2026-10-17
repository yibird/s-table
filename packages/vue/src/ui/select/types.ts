import type { SComponentSize } from '../../context/size';

export type SelectValue = string | number | (string | number)[];

export interface SelectOption {
  /** 显示文本 */
  label: string;
  /** 选项值 */
  value: string | number;
  /** 禁用 */
  disabled?: boolean;
}

export type SelectMode = 'single' | 'multiple';

export interface SelectProps {
  /** 选中值（v-model） */
  modelValue?: SelectValue;
  /** 选项列表 */
  options?: SelectOption[];
  /** 尺寸（Context Size > 此属性） */
  size?: SComponentSize;
  /** 禁用 */
  disabled?: boolean;
  /** 占位文本 */
  placeholder?: string;
  /** 无选项时的提示文本 */
  emptyText?: string;
  /** 是否显示清除按钮 */
  allowClear?: boolean;
  /** 选择模式 */
  mode?: SelectMode;
  /** 辅助技术读取的控件名称，默认回退到 placeholder。 */
  ariaLabel?: string;
}
