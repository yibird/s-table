import type { SComponentSize } from '../../context/size';

export type ButtonType = 'primary' | 'default' | 'text' | 'link' | 'dashed';

export interface ButtonProps {
  /** 按钮类型 */
  type?: ButtonType;
  /** 按钮尺寸（Context Size > 此属性） */
  size?: SComponentSize;
  /** 危险按钮 */
  danger?: boolean;
  /** 幽灵按钮（背景透明） */
  ghost?: boolean;
  /** 禁用状态 */
  disabled?: boolean;
  /** 加载中状态 */
  loading?: boolean;
  /** 撑满父容器 */
  block?: boolean;
  /** 原生 button type */
  htmlType?: 'button' | 'submit' | 'reset';
}
