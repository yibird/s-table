import type { SComponentSize } from '../../context/size';

export type RadioValue = string | number | boolean;

export interface RadioProps {
  /** 当前选中的值（v-model 在 RadioGroup 上使用） */
  modelValue?: RadioValue;
  /** 当前 radio 的值 */
  value?: RadioValue;
  /** 禁用 */
  disabled?: boolean;
  /** 尺寸（Context Size > 此属性） */
  size?: SComponentSize;
}

export interface RadioOption {
  label: string;
  value: RadioValue;
  disabled?: boolean;
}

export interface RadioGroupProps {
  /** 选中值（v-model） */
  modelValue?: RadioValue;
  /** 选项列表 */
  options?: RadioOption[];
  /** 禁用全部 */
  disabled?: boolean;
  /** 尺寸 */
  size?: SComponentSize;
}
