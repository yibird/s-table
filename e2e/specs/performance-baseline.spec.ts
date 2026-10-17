import { expect, openFixture, test } from '../support/test';

/**
 * 浏览器端性能基线：
 * 1. 连续虚拟滚动的帧耗时 / 长任务（全浏览器跑帧耗时，Long Task 仅 Chromium 支持）。
 * 2. 反复挂载 / 卸载后的堆增长（CDP HeapProfiler，仅 Chromium）。
 *
 * 阈值取宽松上界避免 CI 抖动，用途是捕获数量级回归（如渲染热路径被意外放大），
 * 不替代 Node 基准的精确数值测量。
 */
test.describe('性能基线', () => {
  test('连续虚拟滚动帧耗时稳定且 DOM 有界', async ({ page, browserName }) => {
    await openFixture(page, 'virtual');
    const scope = page.getByTestId('virtual-table');
    const container = scope.locator('.s-table-container');
    await expect(scope.locator('.s-table-row[data-row-key]').first()).toBeAttached();

    // rAF 帧耗时采样在 Firefox/WebKit 无头模式下会被节流，不可作为稳定基线；
    // 帧耗时/长任务断言仅 Chromium 生效，其余浏览器只验证 DOM 数量有界。
    if (browserName === 'chromium') {
      const metrics = await container.evaluate(async (element) => {
        const longTasks: number[] = [];
        let observer: PerformanceObserver | undefined;
        if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
          observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) longTasks.push(entry.duration);
          });
          observer.observe({ type: 'longtask' });
        }

        const frameDurations: number[] = [];
        const maxScrollTop = element.scrollHeight - element.clientHeight;
        for (let step = 1; step <= 24; step++) {
          const startedAt = performance.now();
          element.scrollTop = (maxScrollTop * step) / 24;
          element.dispatchEvent(new Event('scroll'));
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          frameDurations.push(performance.now() - startedAt);
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
        observer?.disconnect();

        const sortedFrames = [...frameDurations].sort((left, right) => left - right);
        const p95Index = Math.max(0, Math.ceil(sortedFrames.length * 0.95) - 1);
        return {
          frameP95: sortedFrames[p95Index] ?? 0,
          maxLongTask: Math.max(0, ...longTasks),
        };
      });

      expect(metrics.frameP95).toBeLessThan(100);
      expect(metrics.maxLongTask).toBeLessThan(250);
    }

    const rowCount = await scope.locator('.s-table-row[data-row-key]').count();
    expect(rowCount).toBeLessThan(40);
    expect(rowCount).toBeGreaterThan(0);
  });

  test('反复挂载/卸载不产生堆泄漏', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', '堆测量需要 CDP HeapProfiler。');

    await openFixture(page, 'leak');
    const toggle = page.getByTestId('toggle-table');
    const cycleCount = page.getByTestId('cycle-count');
    await expect(toggle).toBeVisible();

    const session = await page.context().newCDPSession(page);
    await session.send('HeapProfiler.enable');

    const heapUsed = async () => {
      await session.send('HeapProfiler.collectGarbage');
      const usage = await session.send('Runtime.getHeapUsage');
      return usage.usedSize as number;
    };

    // 预热：Vue 运行时与首帧分配在测量前完成。
    for (let index = 0; index < 5; index++) {
      await toggle.click();
      await expect(cycleCount).toHaveText(`cycle:${index + 1}`);
    }
    const heapBefore = await heapUsed();

    // 正式测量：反复挂载/卸载。
    const cycles = 30;
    for (let index = 0; index < cycles; index++) {
      await toggle.click();
      await expect(cycleCount).toHaveText(`cycle:${5 + index + 1}`);
    }
    const heapAfter = await heapUsed();

    // 30 次完整挂载/卸载后的净增长应远小于单次表格的常驻成本。
    const growth = heapAfter - heapBefore;
    expect(growth, `30 次挂载/卸载堆增长 ${(growth / 1024 / 1024).toFixed(2)} MB`).toBeLessThan(
      2 * 1024 * 1024
    );
  });
});
