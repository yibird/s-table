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

/** 视为“无颜色”的计算样式值，需继续回退或放弃波纹（与 antd isValidWaveColor 一致）。 */
const INVALID_WAVE_COLORS = new Set([
  'transparent',
  'canvastext',
  '#fff',
  '#ffffff',
  'rgb(255, 255, 255)',
  'rgba(255, 255, 255, 1)',
]);

/** 判断计算样式颜色是否可以用于波纹。 */
const isValidWaveColor = (color: string): boolean => {
  if (!color || INVALID_WAVE_COLORS.has(color.toLowerCase())) return false;
  const alphaMatch = color.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/);
  if (alphaMatch && Number(alphaMatch[1]) === 0) return false;
  return true;
};

/**
 * 解析波纹颜色：显式颜色优先，随后使用边框色和背景色。
 *
 * 某些控件（例如 Checkbox）本身没有可用边框，浏览器仍可能返回默认的灰色
 * `border-color`，调用方可以传入当前实例的主题色避免误判。
 */
const resolveWaveColor = (node: HTMLElement, explicitColor?: string): string | null => {
  if (explicitColor && isValidWaveColor(explicitColor)) return explicitColor;
  const style = getOwnerWindow(node)?.getComputedStyle(node);
  if (!style) return null;
  return (
    [style.borderTopColor, style.borderColor, style.backgroundColor].find(isValidWaveColor) ?? null
  );
};

/**
 * 在指定控件上播放一次波纹扩散动画。
 * 动画节点固定定位到目标的视口矩形；目标一旦卸载（如点击后关闭面板），波纹立即清理。
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

  // 与 antd WaveEffect 一致：边框阴影 0.4s 扩散到 6px；透明度用 2s 缓慢淡出，
  // 否则波纹会在几帧内消失，看起来像没有生效。
  const easing = 'cubic-bezier(0.08, 0.82, 0.17, 1)';
  const shadow = wave.animate(
    [{ boxShadow: `0 0 0 0 ${color}` }, { boxShadow: `0 0 0 6px ${color}` }],
    { duration: 400, easing, fill: 'forwards' }
  );
  const fade = wave.animate([{ opacity: 0.2 }, { opacity: 0 }], {
    duration: 2000,
    easing,
    fill: 'forwards',
  });

  let frame: number | null = null;

  /** 清理临时节点：动画结束、卸载或目标失效时都会走到这里。 */
  const cleanup = () => {
    if (frame !== null) ownerWindow.cancelAnimationFrame?.(frame);
    frame = null;
    // 直接移除节点即可停止绘制；不调用 Animation.cancel()，避免部分 DOM 实现
    // 将取消操作变成未处理的 AbortError。
    shadow.onfinish = null;
    shadow.oncancel = null;
    fade.onfinish = null;
    fade.oncancel = null;
    wave.remove();
  };

  /**
   * 目标控件被卸载（例如点击过滤/搜索面板的按钮后面板关闭）时，
   * 波纹不能继续悬停在原位置，需在下一帧立即清理。
   */
  const watchTargetConnection = () => {
    if (!node.isConnected) {
      cleanup();
      return;
    }
    frame = ownerWindow.requestAnimationFrame?.(watchTargetConnection) ?? null;
  };
  frame = ownerWindow.requestAnimationFrame?.(watchTargetConnection) ?? null;

  fade.onfinish = cleanup;
  fade.oncancel = cleanup;
};
