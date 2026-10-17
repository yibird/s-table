import type { SComponentSize } from '../../context/size';

export interface CheckboxProps {
  /** 选中状态（v-model） */
  modelValue?: boolean;
  /** 禁用 */
  disabled?: boolean;
  /** 半选状态 */
  indeterminate?: boolean;
  /** 尺寸（Context Size > 此属性） */
  size?: SComponentSize;
}

export interface CheckboxOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface CheckboxGroupProps {
  /** 选中值集合（v-model） */
  modelValue?: (string | number)[];
  /** 选项列表 */
  options?: CheckboxOption[];
  /** 禁用全部 */
  disabled?: boolean;
  /** 尺寸 */
  size?: SComponentSize;
}
