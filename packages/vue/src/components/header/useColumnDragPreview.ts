import { onBeforeUnmount, type Ref } from 'vue';
import { getOwnerWindow } from '../../utils/dom';

type UseColumnDragPreviewOptions = {
  /** 源表头 th 元素 ref。 */
  thRef: Readonly<Ref<HTMLTableCellElement | null>>;
};

/**
 * 列拖拽的自定义预览管理。
 *
 * 生成不透明的自定义拖拽预览，替代浏览器默认的半透明镜像：
 * 默认情况下浏览器会把被拖元素的半透明快照作为拖拽镜像（表现为“透明度降低”），
 * 这里生成与当前表头主题一致的不透明预览，通过 setDragImage 接管拖拽影像。
 */
export const useColumnDragPreview = ({ thRef }: UseColumnDragPreviewOptions) => {
  /** 当前使用的自定义拖拽预览元素。 */
  let dragPreviewEl: HTMLElement | null = null;
  let dragPreviewCleanupFrame: number | null = null;
  let dragPreviewWindow: Window | null = null;

  /** 生成自定义拖拽预览并通过 setDragImage 接管拖拽影像。 */
  const setCustomDragImage = (event: DragEvent) => {
    const source = thRef.value;
    if (!event.dataTransfer || !source) return;
    const ownerDocument = source.ownerDocument;
    const ownerWindow = getOwnerWindow(source);
    if (!ownerDocument.body || !ownerWindow) return;

    const rect = source.getBoundingClientRect();
    const sourceStyle = ownerWindow.getComputedStyle(source);

    // 用 <div>（而非克隆 <th>）承载预览：<th> 是 display:table-cell，脱离 <table> 上下文
    // 放到 body 下会布局塌陷，导致 setDragImage 截到空白图像（表现为“透明看不见”）。
    const preview = ownerDocument.createElement('div');
    preview.textContent = source.textContent?.trim() ?? '';

    // 预览必须定位在视口内且可见，否则部分浏览器会忽略 setDragImage 回退到原生半透明镜像。
    // 首帧覆盖源表头，避免浏览器截图前真实节点短暂出现在视口左上角。
    preview.style.position = 'fixed';
    preview.style.top = `${rect.top}px`;
    preview.style.left = `${rect.left}px`;
    // 负 z-index 会让 Chrome/Firefox 忽略这个节点，然后回退到默认半透明 drag image。
    preview.style.zIndex = '2147483647';
    preview.style.boxSizing = 'border-box';
    preview.style.width = `${rect.width}px`;
    preview.style.height = `${rect.height}px`;
    preview.style.display = 'flex';
    preview.style.alignItems = 'center';
    preview.style.padding = '0 16px';
    preview.style.margin = '0';
    preview.style.opacity = '1';
    preview.style.pointerEvents = 'none';
    preview.style.fontWeight = '600';
    preview.style.fontSize = '14px';
    // 预览挂到 body 后不再继承表格实例变量，复制计算值才能保留局部暗色或品牌主题。
    preview.style.color = sourceStyle.color;
    preview.style.background = sourceStyle.backgroundColor;
    preview.style.borderRadius = '6px';
    preview.style.boxShadow = sourceStyle.getPropertyValue('--s-shadow-menu').trim();
    preview.classList.add('s-table-header-cell-drag-preview');

    ownerDocument.body.appendChild(preview);
    dragPreviewEl = preview;
    dragPreviewWindow = ownerWindow;

    // 让预览跟随光标在原单元格内的相对位置
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    event.dataTransfer.setDragImage(preview, offsetX, offsetY);

    // 拖拽影像会在 dragstart 事件结束后由浏览器持有；下一帧移除真实节点，避免它停留在页面上。
    dragPreviewCleanupFrame = ownerWindow.requestAnimationFrame(() => {
      dragPreviewCleanupFrame = null;
      if (dragPreviewEl === preview) {
        preview.remove();
        dragPreviewEl = null;
        dragPreviewWindow = null;
      }
    });
  };

  /** 移除自定义拖拽预览元素。 */
  const clearCustomDragImage = () => {
    if (dragPreviewCleanupFrame !== null) {
      dragPreviewWindow?.cancelAnimationFrame(dragPreviewCleanupFrame);
      dragPreviewCleanupFrame = null;
    }
    if (dragPreviewEl) {
      dragPreviewEl.remove();
      dragPreviewEl = null;
    }
    dragPreviewWindow = null;
  };

  onBeforeUnmount(clearCustomDragImage);

  return { setCustomDragImage, clearCustomDragImage };
};
