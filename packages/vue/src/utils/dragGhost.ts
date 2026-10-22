import { h, isVNode, render, type VNodeChild } from 'vue';

/**
 * 把自定义 VNode / HTMLElement 设置为原生拖拽预览。
 * VNode 会在离屏容器中渲染，下一帧后销毁；调用方传入的 HTMLElement 不会被移除。
 */
export const applyDragGhost = (
  event: DragEvent,
  ghost: VNodeChild | HTMLElement | null | undefined
): boolean => {
  if (ghost == null || !event.dataTransfer) return false;
  // setDragImage 接受任何 Element（含 SVGElement），不能只判断 HTMLElement。
  if (typeof Element !== 'undefined' && ghost instanceof Element) {
    event.dataTransfer.setDragImage(ghost, 12, 12);
    return true;
  }
  const ownerDocument = (event.currentTarget as Node | null)?.ownerDocument;
  if (!ownerDocument) return false;
  const container = ownerDocument.createElement('div');
  container.style.cssText =
    'position:fixed;top:-9999px;left:-9999px;pointer-events:none;z-index:-1;';
  ownerDocument.body.appendChild(container);
  render(isVNode(ghost) ? ghost : h('span', [ghost as VNodeChild]), container);
  event.dataTransfer.setDragImage(container, 12, 12);
  // 浏览器在下一个事件循环读取 drag image，之后才可以安全移除离屏节点。
  setTimeout(() => {
    render(null, container);
    container.remove();
  }, 0);
  return true;
};
