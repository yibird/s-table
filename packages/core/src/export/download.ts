/** 触发浏览器下载；非浏览器环境安全降级为 no-op。 */
export const downloadBlob = (content: Blob, filename: string): boolean => {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return false;
  const url = URL.createObjectURL(content);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // 下一帧释放，避免部分浏览器在 click 同步返回前取消下载。
  if (typeof setTimeout === 'function') setTimeout(() => URL.revokeObjectURL(url), 0);
  else URL.revokeObjectURL(url);
  return true;
};
