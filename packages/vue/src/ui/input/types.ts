import type { SComponentSize } from '../../context/size';

export type InputType = 'text' | 'password' | 'number' | 'textarea';

export interface InputProps {
  /** 输入值（v-model） */
  modelValue?: string;
  /** 尺寸（Context Size > 此属性） */
  size?: SComponentSize;
  /** 禁用 */
  disabled?: boolean;
  /** 占位文本 */
  placeholder?: string;
  /** 输入框类型 */
  type?: InputType;
  /** 是否显示清除按钮 */
  allowClear?: boolean;
  /** 只读 */
  readonly?: boolean;
  /** 最大长度 */
  maxlength?: number;
}
