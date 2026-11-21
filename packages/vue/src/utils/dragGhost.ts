import { h, isVNode, render, type VNodeChild } from 'vue';
import { getOwnerWindow } from './dom';

export type DragPreviewOptions = {
  kind: 'row' | 'column';
  label?: string;
  count?: number;
  ghost?: VNodeChild | HTMLElement | null;
};

/** 原生与鼠标桥接共用的轻量预览；只挂载一个节点，不克隆整行表格。 */
export const createDragPreview = (source: HTMLElement, options: DragPreviewOptions) => {
  const doc = source.ownerDocument;
  const win = getOwnerWindow(source)!;
  const style = win.getComputedStyle(source);
  const preview = doc.createElement('div');
  preview.className = `s-table-drag-preview s-table-${options.kind === 'column' ? 'header-cell' : 'row'}-drag-preview`;
  preview.setAttribute('aria-hidden', 'true');
  // 挂到 body 后仍保留实例局部主题，自定义 ghost 也能使用这些 token。
  for (let index = 0; index < style.length; index++) {
    const name = style.item(index);
    if (name.startsWith('--s-')) preview.style.setProperty(name, style.getPropertyValue(name));
  }
  Object.assign(preview.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    zIndex: '2147483647',
    pointerEvents: 'none',
    userSelect: 'none',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: '80px',
    maxWidth: 'min(320px, 80vw)',
    padding: '8px 12px',
    opacity: '1',
    border: '1px solid var(--s-color-border, #e5e7eb)',
    borderRadius: 'var(--s-radius-lg, 8px)',
    backgroundColor: '#fff',
    color: '#1f1f1f',
    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.06)',
    fontFamily: style.fontFamily,
    fontSize: '13px',
    fontWeight: '500',
    lineHeight: '20px',
  });
  const ghost = options.ghost;
  const isElement = ghost != null && typeof ghost === 'object' && 'nodeType' in ghost;
  if (isElement) {
    // 鼠标桥接没有原生快照：只复制展示内容，不移动调用者持有的元素。
    preview.appendChild((ghost as HTMLElement).cloneNode(true));
  } else if (ghost != null) {
    render(isVNode(ghost) ? ghost : h('span', [ghost as VNodeChild]), preview);
  } else {
    const label = doc.createElement('span');
    label.style.cssText =
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;color:#1f1f1f;';
    label.textContent =
      options.label ??
      source.querySelector('.s-table-cell-title')?.textContent?.trim() ??
      source.textContent?.trim() ??
      '';
    preview.append(label);
    if ((options.count ?? 0) > 1) {
      const badge = doc.createElement('span');
      badge.textContent = String(options.count);
      badge.style.cssText =
        'flex:none;min-width:22px;padding:0 5px;border-radius:11px;text-align:center;background:var(--s-primary-color);color:#fff;font-size:12px;';
      preview.appendChild(badge);
    }
  }
  doc.body.appendChild(preview);
  let disposed = false;
  return {
    element: preview,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      if (ghost != null && !isElement) render(null, preview);
      preview.remove();
    },
  };
};

/** 浏览器读取可见节点作为拖拽影像后，下一帧卸载；返回提前清理函数。 */
export const setNativeDragPreview = (
  event: DragEvent,
  source: HTMLElement,
  options: DragPreviewOptions
): (() => void) => {
  if (!event.dataTransfer) return () => {};
  const ghost = options.ghost;
  if (ghost != null && typeof ghost === 'object' && 'nodeType' in ghost) {
    event.dataTransfer.setDragImage(ghost as HTMLElement, 12, 12);
    return () => {};
  }
  const doc = source.ownerDocument;
  const preview = createDragPreview(source, options);

  // 原生拖拽影像会被浏览器叠加透明度，无法通过 CSS 覆盖；改为隐藏原生影像，
  // 由跟随 dragover 的不透明浮层承担视觉反馈。
  const emptyImage = doc.createElement('canvas');
  emptyImage.width = 1;
  emptyImage.height = 1;
  emptyImage.style.cssText =
    'position:fixed;top:0;left:0;width:1px;height:1px;pointer-events:none;';
  doc.body.appendChild(emptyImage);

  const rect = source.getBoundingClientRect();
  let pointerX = event.clientX || rect.left;
  let pointerY = event.clientY || rect.top;
  const positionPreview = () => {
    preview.element.style.transform = `translate3d(${pointerX + 12}px, ${pointerY + 12}px, 0)`;
  };
  const handleDragOver = (dragEvent: DragEvent) => {
    // 部分浏览器在拖拽开始时派发 clientX/Y 为 0 的占位事件。
    if (dragEvent.clientX === 0 && dragEvent.clientY === 0) return;
    pointerX = dragEvent.clientX;
    pointerY = dragEvent.clientY;
    positionPreview();
  };
  positionPreview();

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    doc.removeEventListener('dragover', handleDragOver, true);
    doc.removeEventListener('dragend', dispose, true);
    doc.removeEventListener('drop', dispose, true);
    emptyImage.remove();
    preview.dispose();
  };
  try {
    event.dataTransfer.setDragImage(emptyImage, 0, 0);
  } catch (error) {
    dispose();
    throw error;
  }
  doc.addEventListener('dragover', handleDragOver, true);
  doc.addEventListener('dragend', dispose, true);
  doc.addEventListener('drop', dispose, true);
  return dispose;
};
