import './wave.less';
import { getOwnerDocument, getOwnerWindow } from '../utils/dom';

/**
 * antd 风格的激活波纹（Wave）效果。
 *
 * 交互激活（点击 / 键盘触发）时，从控件边缘向外扩散一圈渐隐的光晕，
 * 颜色取自控件当前的边框色（透明时回退背景色），与 antd WaveEffect 视觉一致。
 * 实现基于 Web Animations API：在 body 中插入一个按控件视口位置定位的临时节点，
 * 播放 box-shadow 扩散动画后移除，不污染控件自身的样式与过渡。
 * 波纹独立于控件 DOM，因此按钮点击后即使菜单立即关闭、控件被卸载，动画仍可完整播放。
 */

/** 视为“无颜色”的计算样式值，需继续回退或放弃波纹。 */
const TRANSPARENT_COLORS = new Set(['transparent', 'rgba(0, 0, 0, 0)']);

/**
 * 解析波纹颜色：显式颜色优先，随后使用边框色和背景色。
 *
 * 某些控件（例如 Checkbox）本身没有可用边框，浏览器仍可能返回默认的灰色
 * `border-color`，调用方可以传入当前实例的主题色避免误判。
 */
const resolveWaveColor = (node: HTMLElement, explicitColor?: string): string | null => {
  if (explicitColor && !TRANSPARENT_COLORS.has(explicitColor)) return explicitColor;
  const style = getOwnerWindow(node)?.getComputedStyle(node);
  if (!style) return null;
  if (!TRANSPARENT_COLORS.has(style.borderColor)) return style.borderColor;
  if (!TRANSPARENT_COLORS.has(style.backgroundColor)) return style.backgroundColor;
  return null;
};

/**
 * 在指定控件上播放一次波纹扩散动画。
 * 动画节点固定定位到目标的视口矩形，不响应指针事件，也不依赖目标继续留在 DOM 中。
 */
export const showWave = (node: HTMLElement, explicitColor?: string): void => {
  const ownerDocument = getOwnerDocument(node);
  const ownerWindow = getOwnerWindow(node);
  if (!ownerDocument?.body || !ownerWindow) return;
  // 尊重系统减弱动效设置（WCAG 2.3.3）
  if (ownerWindow.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const color = resolveWaveColor(node, explicitColor);
  if (!color) return;

  const rect = node.getBoundingClientRect();
  const wave = ownerDocument.createElement('span');
  wave.className = 's-wave-effect';
  Object.assign(wave.style, {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    borderRadius: ownerWindow.getComputedStyle(node).borderRadius,
  });
  ownerDocument.body.appendChild(wave);

  if (typeof wave.animate !== 'function') {
    wave.remove();
    return;
  }

  const animation = wave.animate(
    [
      { boxShadow: `0 0 0 0 ${color}`, opacity: 0.4 },
      { boxShadow: `0 0 0 6px ${color}`, opacity: 0 },
    ],
    { duration: 400, easing: 'cubic-bezier(0.08, 0.82, 0.17, 1)' }
  );

  /** 动画结束或被取消（节点卸载）后都清理临时节点。 */
  const cleanup = () => wave.remove();
  animation.onfinish = cleanup;
  animation.oncancel = cleanup;
};
