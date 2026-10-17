import { Comment, Fragment, Text, type Slot, type VNode } from 'vue';

/**
 * 判断插槽树中是否存在实际可见内容。
 * 透传的空插槽通常会被 Vue 包装成 Fragment / Text，统一递归处理可避免各状态组件重复判断。
 */
const hasRenderableChild = (child: unknown): boolean => {
  if (child == null || typeof child === 'boolean') return false;
  if (typeof child === 'string' || typeof child === 'number') {
    return String(child).trim().length > 0;
  }
  if (Array.isArray(child)) return child.some(hasRenderableChild);
  if (typeof child !== 'object') return false;

  const vnode = child as VNode;
  if (vnode.type === Comment) return false;
  if (vnode.type === Fragment || vnode.type === Text) {
    return hasRenderableChild(vnode.children);
  }
  return true;
};

export const hasRenderableSlot = (slot: Slot | undefined): boolean => hasRenderableChild(slot?.());
