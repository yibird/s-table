import { describe, expect, it } from 'vite-plus/test';
import {
  DEFAULT_SCROLL_TO_BOTTOM_OFFSET,
  computeScrollSpeed,
  normalizeScrollToBottomOffset,
} from '../index';

describe('framework-agnostic scroll utils', () => {
  it('computeScrollSpeed ramps linearly inside the edge zone and clamps to max speed', () => {
    // 贴近起始边：负向滚动，最大 -18。
    expect(computeScrollSpeed(100, 100, 500)).toBe(-18);
    // 边缘区内 87.5% 深度：ceil(0.875 * 18) = 16。
    expect(computeScrollSpeed(105, 100, 500)).toBe(-16);
    // 中间区域不滚动。
    expect(computeScrollSpeed(300, 100, 500)).toBe(0);
    // 贴近结束边：正向滚动。
    expect(computeScrollSpeed(495, 100, 500)).toBe(16);
    expect(computeScrollSpeed(500, 100, 500)).toBe(18);
    // 配置可覆盖感应区宽度与最大速度。
    expect(computeScrollSpeed(495, 100, 500, { edgeThreshold: 10, maxSpeed: 10 })).toBe(5);
    expect(computeScrollSpeed(500, 100, 500, { edgeThreshold: 10, maxSpeed: 10 })).toBe(10);
    expect(computeScrollSpeed(485, 100, 500, { edgeThreshold: 10, maxSpeed: 10 })).toBe(0);
  });

  it('normalizeScrollToBottomOffset only accepts finite non-negative values', () => {
    expect(normalizeScrollToBottomOffset(undefined)).toBe(DEFAULT_SCROLL_TO_BOTTOM_OFFSET);
    expect(normalizeScrollToBottomOffset(NaN)).toBe(DEFAULT_SCROLL_TO_BOTTOM_OFFSET);
    expect(normalizeScrollToBottomOffset(Infinity)).toBe(DEFAULT_SCROLL_TO_BOTTOM_OFFSET);
    expect(normalizeScrollToBottomOffset(-1)).toBe(DEFAULT_SCROLL_TO_BOTTOM_OFFSET);
    expect(normalizeScrollToBottomOffset(0)).toBe(0);
    expect(normalizeScrollToBottomOffset(80)).toBe(80);
  });
});
