import type { Locator, Page } from '@playwright/test';
import { expect, openFixture, test } from '../support/test';
import { publicRowKeys } from '../support/table';

/**
 * 性能与响应式压力测试（补充 performance-baseline / round2 的基础断言）：
 * - 100k x 40 首屏、滚动帧、长任务；连续排序/搜索后的 DOM。
 * - 20 轮排序 + 极值滚动后的 DOM / 堆增长（CDP）。
 * - 20k 虚拟表快速滚动、数据骤减/恢复、展开/选中行高、固定列。
 * - 390→1600 宽度下的页面/容器横向溢出。
 * - 100 次 viewport resize 后的监听器数量与布局。
 *
 * 只读取运行时状态，不修改任何产品代码或 fixture。
 */

test.describe.configure({ timeout: 120_000 });

const rowsOf = (scope: Locator): Locator => scope.locator('tbody .s-table-row[data-row-key]');

const waitFrames = (page: Page, count = 1): Promise<void> =>
  page.evaluate(
    (frames) =>
      new Promise<void>((resolve) => {
        let remaining = frames;
        const tick = () => {
          remaining -= 1;
          if (remaining <= 0) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    count
  );

interface DomSnapshot {
  rows: number;
  cells: number;
  headers: number;
  tableWidth: number;
}

const snapshotDom = (scope: Locator): Promise<DomSnapshot> =>
  scope.evaluate((element) => {
    const table = element.querySelector<HTMLElement>('.s-table');
    return {
      rows: element.querySelectorAll('tbody .s-table-row[data-row-key]').length,
      cells: element.querySelectorAll('tbody td').length,
      headers: element.querySelectorAll('thead th[data-column-id]').length,
      tableWidth: table?.getBoundingClientRect().width ?? 0,
    };
  });

interface FrameMetrics {
  p50: number;
  p95: number;
  max: number;
  longTaskCount: number;
  maxLongTask: number;
}

/** 在滚动容器内连续滚动并采样 rAF 帧耗时与长任务（仅 Chromium 有 longtask）。 */
const measureScrollFrames = (container: Locator, steps: number): Promise<FrameMetrics> =>
  container.evaluate(async (element, count) => {
    const longTasks: number[] = [];
    let observer: PerformanceObserver | undefined;
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) longTasks.push(entry.duration);
      });
      observer.observe({ type: 'longtask' });
    }

    const durations: number[] = [];
    const maxScrollTop = Math.max(1, element.scrollHeight - element.clientHeight);
    for (let step = 1; step <= count; step++) {
      const startedAt = performance.now();
      element.scrollTop = (maxScrollTop * step) / count;
      element.dispatchEvent(new Event('scroll'));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      durations.push(performance.now() - startedAt);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
    observer?.disconnect();

    const sorted = [...durations].sort((left, right) => left - right);
    const percentile = (ratio: number) => sorted[Math.ceil(sorted.length * ratio) - 1] ?? 0;
    return {
      p50: percentile(0.5),
      p95: percentile(0.95),
      max: sorted.at(-1) ?? 0,
      longTaskCount: longTasks.length,
      maxLongTask: longTasks.length > 0 ? Math.max(...longTasks) : 0,
    };
  }, steps);

const pushMetrics = (
  testInfo: { annotations: { type: string; description?: string }[] },
  payload: unknown
) => {
  testInfo.annotations.push({
    type: 'agent-performance',
    description: JSON.stringify(payload),
  });
};

const createHeapProbe = async (page: Page) => {
  const session = await page.context().newCDPSession(page);
  await session.send('HeapProfiler.enable');
  await session.send('Performance.enable');

  const readMetrics = async () => {
    const { metrics } = await session.send('Performance.getMetrics');
    return Object.fromEntries(metrics.map((metric) => [metric.name, metric.value]));
  };

  /** 连续两次 GC 后读取 usedSize，降低测量抖动。 */
  const heapUsed = async () => {
    await session.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(40);
    await session.send('HeapProfiler.collectGarbage');
    const usage = await session.send('Runtime.getHeapUsage');
    return usage.usedSize as number;
  };

  return { session, readMetrics, heapUsed };
};

test.describe('agent 性能压力', () => {
  test('round2perf：首屏、DOM、滚动帧/长任务与连续排序/搜索', async ({
    page,
    browserName,
  }, testInfo) => {
    test.skip(browserName !== 'chromium', '帧耗时与 longtask 仅 Chromium 稳定。');

    const startedAt = Date.now();
    await openFixture(page, 'round2perf');
    const scope = page.getByTestId('perf-table');
    await expect(rowsOf(scope).first()).toBeAttached({ timeout: 20_000 });
    const mountMs = Date.now() - startedAt;

    const initial = await snapshotDom(scope);
    expect(mountMs, `首屏挂载 ${mountMs}ms`).toBeLessThan(8_000);
    expect(initial.rows, 'DOM 行数').toBeLessThan(60);
    expect(initial.rows).toBeGreaterThan(0);
    expect(initial.cells, 'DOM 单元格数').toBeLessThan(900);
    expect(initial.headers, 'DOM 表头数').toBeLessThan(30);

    const container = scope.locator('.s-table-container');
    const frames = await measureScrollFrames(container, 40);
    expect(frames.p95, `滚动帧 p95 ${frames.p95}ms`).toBeLessThan(150);
    expect(frames.maxLongTask, `最长任务 ${frames.maxLongTask}ms`).toBeLessThan(400);

    // 回顶部，避免排序/搜索在远端滚动位置执行。
    await container.evaluate((element) => {
      element.scrollTop = 0;
      element.scrollLeft = 0;
      element.dispatchEvent(new Event('scroll'));
    });

    // 连续排序：8 次点击覆盖 ascend → descend → cancel 的完整循环。
    const idHeader = scope.locator('th[data-column-id="id"]');
    const idTitle = idHeader.locator('.s-table-cell-title');
    for (let index = 0; index < 8; index++) {
      await idTitle.click();
      const expected = ['ascending', 'descending', 'none'][index % 3];
      await expect
        .poll(() => idHeader.getAttribute('aria-sort'), {
          message: `第 ${index + 1} 次排序状态`,
        })
        .toBe(expected);
    }

    // 连续搜索（搜索即列级过滤）：宽泛与精确关键词交替。
    const searchTrigger = scope.locator('th[data-column-id="name"] .s-table-search-trigger');
    for (let index = 0; index < 4; index++) {
      await searchTrigger.click();
      const input = page.locator('.s-table-search-input');
      await expect(input).toBeVisible();
      await input.fill(index % 2 === 0 ? 'Perf Row' : 'Perf Row 0000');
      await input.press('Enter');
      await expect(page.locator('.s-table-search-input')).toHaveCount(0);
      await expect(rowsOf(scope).first()).toBeAttached({ timeout: 10_000 });
    }
    // 清理搜索，验证 DOM 回到有界状态。
    await searchTrigger.click();
    await page.locator('.s-table-search-dropdown-btn-reset').click();
    await expect(page.locator('.s-table-search-input')).toHaveCount(0);
    await expect(rowsOf(scope).first()).toBeAttached();

    const afterStress = await snapshotDom(scope);
    expect(afterStress.rows, '排序/搜索后 DOM 行数').toBeLessThan(60);
    expect(afterStress.cells, '排序/搜索后 DOM 单元格数').toBeLessThan(900);
    expect(afterStress.headers, '排序/搜索后 DOM 表头数').toBeLessThan(30);

    pushMetrics(testInfo, {
      mountMs,
      frameP50: Math.round(frames.p50 * 100) / 100,
      frameP95: Math.round(frames.p95 * 100) / 100,
      frameMax: Math.round(frames.max * 100) / 100,
      longTaskCount: frames.longTaskCount,
      maxLongTask: Math.round(frames.maxLongTask * 100) / 100,
      initialDom: initial,
      afterStressDom: afterStress,
    });
  });

  test('round2perf：20 轮排序 + 极值滚动后 DOM/堆无持续增长', async ({
    page,
    browserName,
  }, testInfo) => {
    test.skip(browserName !== 'chromium', 'CDP HeapProfiler 仅 Chromium。');

    await openFixture(page, 'round2perf');
    const scope = page.getByTestId('perf-table');
    await expect(rowsOf(scope).first()).toBeAttached({ timeout: 20_000 });

    const { readMetrics, heapUsed } = await createHeapProbe(page);

    const runCycle = (target: Locator) =>
      target.evaluate(async (element) => {
        const nextFrame = () =>
          new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const container = element.querySelector<HTMLElement>('.s-table-container');
        if (!container) throw new Error('container not found');
        const title = element.querySelector<HTMLElement>(
          'th[data-column-id="id"] .s-table-cell-title'
        );

        title?.click();
        await nextFrame();
        await nextFrame();

        const maxY = Math.max(0, container.scrollHeight - container.clientHeight);
        const maxX = Math.max(0, container.scrollWidth - container.clientWidth);
        const scrollSequence: Array<[number, number]> = [
          [maxY, 0],
          [0, 0],
          [0, maxX],
          [0, 0],
        ];
        for (const [top, left] of scrollSequence) {
          container.scrollTop = top;
          container.scrollLeft = left;
          container.dispatchEvent(new Event('scroll'));
          await nextFrame();
        }

        return {
          rows: element.querySelectorAll('tbody .s-table-row[data-row-key]').length,
          cells: element.querySelectorAll('tbody td').length,
          maxY,
          maxX,
        };
      });

    // 预热：覆盖首次排序缓存与首轮滚动渲染。
    for (let index = 0; index < 3; index++) await runCycle(scope);

    const metricsBefore = await readMetrics();
    const heapBefore = await heapUsed();
    let maxRows = 0;
    let maxCells = 0;
    let lastScroll = { maxY: 0, maxX: 0 };
    let heapAtHalf = heapBefore;

    for (let index = 0; index < 20; index++) {
      const cycle = await runCycle(scope);
      maxRows = Math.max(maxRows, cycle.rows);
      maxCells = Math.max(maxCells, cycle.cells);
      lastScroll = { maxY: cycle.maxY, maxX: cycle.maxX };
      if (index === 9) heapAtHalf = await heapUsed();
    }

    const heapAfter = await heapUsed();
    const metricsAfter = await readMetrics();
    const growth = heapAfter - heapBefore;
    const secondHalfGrowth = heapAfter - heapAtHalf;

    expect(maxRows, '20 轮中的最大 DOM 行数').toBeLessThan(60);
    expect(maxCells, '20 轮中的最大 DOM 单元格数').toBeLessThan(900);
    expect(growth, `20 轮堆增长 ${(growth / 1024 / 1024).toFixed(2)} MB`).toBeLessThan(
      16 * 1024 * 1024
    );

    pushMetrics(testInfo, {
      cycles: 20,
      heapBeforeMB: Math.round((heapBefore / 1024 / 1024) * 100) / 100,
      heapAtHalfMB: Math.round((heapAtHalf / 1024 / 1024) * 100) / 100,
      heapAfterMB: Math.round((heapAfter / 1024 / 1024) * 100) / 100,
      growthMB: Math.round((growth / 1024 / 1024) * 100) / 100,
      secondHalfGrowthMB: Math.round((secondHalfGrowth / 1024 / 1024) * 100) / 100,
      maxRows,
      maxCells,
      scrollableY: lastScroll.maxY,
      scrollableX: lastScroll.maxX,
      layoutCountDelta: (metricsAfter.LayoutCount ?? 0) - (metricsBefore.LayoutCount ?? 0),
      recalcStyleDelta:
        (metricsAfter.RecalcStyleCount ?? 0) - (metricsBefore.RecalcStyleCount ?? 0),
    });
  });

  test('20k 虚拟表：快速滚动、数据骤减/恢复、展开/选中行高与固定列', async ({ page }, testInfo) => {
    await openFixture(page, 'virtual');
    const scope = page.getByTestId('virtual-table');
    await expect(rowsOf(scope).first()).toBeAttached();

    // 快速滚动：60 次跳转之间不等待帧，只依赖 scroll 事件合并。
    const burst = await scope.evaluate(async (element) => {
      const container = element.querySelector<HTMLElement>('.s-table-container');
      if (!container) throw new Error('container not found');
      const max = Math.max(0, container.scrollHeight - container.clientHeight);
      for (let index = 0; index < 60; index++) {
        container.scrollTop = (index * 7919) % (max + 1);
        container.dispatchEvent(new Event('scroll'));
      }
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
      const keys = Array.from(
        element.querySelectorAll<HTMLElement>('tbody .s-table-row[data-row-key]')
      ).map((row) => Number(row.dataset.rowKey));
      return { keys, maxScrollTop: max, scrollTop: container.scrollTop };
    });

    expect(burst.maxScrollTop).toBeGreaterThan(0);
    expect(burst.keys.length).toBeGreaterThan(0);
    expect(burst.keys.length, '快速滚动后 DOM 行数').toBeLessThan(40);
    expect(burst.keys.every((key) => key >= 1 && key <= 20_000)).toBe(true);

    // 数据骤减：只允许 1..25 的行模型进入 DOM。
    await page.getByTestId('shrink-rows').click();
    await expect(page.getByTestId('api-status')).toHaveText('rows:25');
    await expect
      .poll(async () => {
        const keys = (await publicRowKeys(scope)).map(Number);
        return keys.length > 0 && keys.every((key) => key >= 1 && key <= 25);
      })
      .toBe(true);
    expect(await rowsOf(scope).count()).toBeLessThanOrEqual(25);

    // 恢复 2 万行并定位底部。
    await page.getByTestId('reset-rows').click();
    await page.getByTestId('scroll-bottom').click();
    await expect(scope.locator('.s-table-row[data-row-key="20000"]')).toBeVisible();
    expect(await rowsOf(scope).count()).toBeLessThan(40);

    // 展开/选中：选中不应改变行高，展开应增加逻辑行块高度且不重叠下一行。
    await page.getByTestId('scroll-target').click();
    const target = scope.locator('.s-table-row[data-row-key="15000"]');
    await expect(target).toBeVisible();
    const baseHeight = await target.evaluate((element) => element.getBoundingClientRect().height);

    await page.getByTestId('select-target').click();
    await expect(target).toHaveClass(/s-table-row-selected/);
    const selectedHeight = await target.evaluate(
      (element) => element.getBoundingClientRect().height
    );
    expect(Math.abs(selectedHeight - baseHeight)).toBeLessThan(1);

    await page.getByTestId('expand-target').click();
    await expect(target).toHaveClass(/s-table-row-expanded/);
    await expect(page.getByTestId('virtual-expanded-15000')).toBeVisible();

    const geometry = await scope.evaluate((element) => {
      const row = element.querySelector<HTMLElement>('.s-table-row[data-row-key="15000"]');
      if (!row) throw new Error('target row not found');
      const detail = row.nextElementSibling as HTMLElement | null;
      const next = detail?.nextElementSibling as HTMLElement | null;
      const rowRect = row.getBoundingClientRect();
      const detailRect = detail?.getBoundingClientRect();
      const nextRect = next?.getBoundingClientRect();
      return {
        rowHeight: rowRect.height,
        detailHeight: detailRect?.height ?? 0,
        hasDetail: detail?.classList.contains('s-table-expanded-row') ?? false,
        gap: nextRect && detailRect ? nextRect.top - detailRect.bottom : null,
      };
    });
    expect(geometry.hasDetail).toBe(true);
    expect(geometry.rowHeight).toBeGreaterThan(0);
    expect(geometry.detailHeight).toBeGreaterThan(0);
    if (geometry.gap !== null) expect(geometry.gap).toBeGreaterThanOrEqual(-1);
    expect(await rowsOf(scope).count()).toBeLessThan(40);

    // 固定列：双向虚拟表连续横向抖动后，左右固定列仍位于容器可视范围内。
    const wide = page.getByTestId('bidirectional-virtual-table');
    await expect(rowsOf(wide).first()).toBeAttached();
    const horizontal = await wide.evaluate(async (element) => {
      const container = element.querySelector<HTMLElement>('.s-table-container');
      if (!container) throw new Error('container not found');
      const max = Math.max(0, container.scrollWidth - container.clientWidth);
      for (let index = 0; index < 40; index++) {
        container.scrollLeft = (index * 997) % (max + 1);
        container.dispatchEvent(new Event('scroll'));
      }
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
      // 停在最右侧，同时验证两端固定列。
      container.scrollLeft = max;
      container.dispatchEvent(new Event('scroll'));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const containerRect = container.getBoundingClientRect();
      const leftHeader = element
        .querySelector<HTMLElement>('thead th[data-column-id="id"]')
        ?.getBoundingClientRect();
      const rightHeader = element
        .querySelector<HTMLElement>('thead th[data-column-id="tail"]')
        ?.getBoundingClientRect();
      const firstRow = element.querySelector<HTMLElement>('tbody .s-table-row');
      return {
        maxScrollLeft: max,
        scrollLeft: container.scrollLeft,
        rows: element.querySelectorAll('tbody .s-table-row').length,
        cellsInFirstRow: firstRow?.querySelectorAll('td').length ?? 0,
        container: {
          left: containerRect.left,
          right: containerRect.right,
          width: containerRect.width,
        },
        leftHeader: leftHeader
          ? { left: leftHeader.left, right: leftHeader.right, width: leftHeader.width }
          : null,
        rightHeader: rightHeader
          ? { left: rightHeader.left, right: rightHeader.right, width: rightHeader.width }
          : null,
      };
    });

    expect(horizontal.maxScrollLeft).toBeGreaterThan(0);
    expect(horizontal.rows).toBeLessThan(40);
    expect(horizontal.cellsInFirstRow).toBeLessThan(20);
    expect(horizontal.leftHeader).not.toBeNull();
    expect(horizontal.rightHeader).not.toBeNull();
    expect(horizontal.leftHeader!.left).toBeGreaterThanOrEqual(horizontal.container.left - 1);
    expect(horizontal.leftHeader!.right).toBeLessThanOrEqual(horizontal.container.right + 1);
    expect(horizontal.rightHeader!.left).toBeGreaterThanOrEqual(horizontal.container.left - 1);
    expect(horizontal.rightHeader!.right).toBeLessThanOrEqual(horizontal.container.right + 1);

    pushMetrics(testInfo, {
      burstRows: burst.keys.length,
      burstMinKey: Math.min(...burst.keys),
      burstMaxKey: Math.max(...burst.keys),
      baseHeight,
      selectedHeight,
      expanded: geometry,
      fixedColumns: horizontal,
      viewport: page.viewportSize(),
    });
  });

  test('响应式：390-1600 宽度下页面无横向溢出且固定列不出容器', async ({ page }, testInfo) => {
    await openFixture(page, 'round2perf');
    const scope = page.getByTestId('perf-table');
    await expect(rowsOf(scope).first()).toBeAttached({ timeout: 20_000 });

    const widths = [390, 576, 768, 992, 1200, 1600];
    const samples: unknown[] = [];

    for (const width of widths) {
      await page.setViewportSize({ width, height: 720 });
      await waitFrames(page, 3);
      const metrics = await scope.evaluate((element) => {
        const container = element.querySelector<HTMLElement>('.s-table-container');
        if (!container) throw new Error('container not found');
        const containerRect = container.getBoundingClientRect();
        const left = element
          .querySelector<HTMLElement>('thead th[data-column-id="id"]')
          ?.getBoundingClientRect();
        const right = element
          .querySelector<HTMLElement>('thead th[data-column-id="tail"]')
          ?.getBoundingClientRect();
        return {
          viewportWidth: document.documentElement.clientWidth,
          docScrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
          scopeRight: element.getBoundingClientRect().right,
          container: {
            left: containerRect.left,
            right: containerRect.right,
            width: containerRect.width,
            clientWidth: container.clientWidth,
            scrollWidth: container.scrollWidth,
          },
          leftFixed: left ? { left: left.left, right: left.right, width: left.width } : null,
          rightFixed: right ? { left: right.left, right: right.right, width: right.width } : null,
          rows: element.querySelectorAll('tbody .s-table-row[data-row-key]').length,
        };
      });
      samples.push({ width, ...metrics });

      expect(metrics.docScrollWidth, `${width}px 页面横向溢出`).toBeLessThanOrEqual(
        metrics.viewportWidth + 1
      );
      expect(metrics.scopeRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
      expect(metrics.rows, `${width}px DOM 行数`).toBeLessThan(60);
      expect(metrics.container.width).toBeGreaterThan(0);
      expect(metrics.leftFixed).not.toBeNull();
      expect(metrics.rightFixed).not.toBeNull();
      expect(metrics.leftFixed!.width).toBeGreaterThan(0);
      expect(metrics.rightFixed!.width).toBeGreaterThan(0);
      expect(metrics.leftFixed!.left, `${width}px 左固定列溢出`).toBeGreaterThanOrEqual(
        metrics.container.left - 1
      );
      expect(metrics.leftFixed!.right, `${width}px 左固定列溢出`).toBeLessThanOrEqual(
        metrics.container.right + 1
      );
      expect(metrics.rightFixed!.left, `${width}px 右固定列溢出`).toBeGreaterThanOrEqual(
        metrics.container.left - 1
      );
      expect(metrics.rightFixed!.right, `${width}px 右固定列溢出`).toBeLessThanOrEqual(
        metrics.container.right + 1
      );
    }

    pushMetrics(testInfo, { widths, samples });
  });

  test('响应式：分页与列汇总在各宽度下不溢出所属容器', async ({ page }, testInfo) => {
    await openFixture(page, 'round3');
    await expect(page.getByTestId('column-footer-table')).toBeVisible();
    await expect(page.getByTestId('export-table')).toBeVisible();

    const widths = [390, 576, 768, 992, 1200, 1600];
    const samples: unknown[] = [];

    for (const width of widths) {
      await page.setViewportSize({ width, height: 720 });
      await waitFrames(page, 3);
      const metrics = await page.evaluate(() => {
        const rect = (element: Element) => {
          const box = element.getBoundingClientRect();
          return { left: box.left, right: box.right, width: box.width };
        };
        const exportScope = document.querySelector<HTMLElement>('[data-testid="export-table"]')!;
        const wrapper = exportScope.querySelector<HTMLElement>('.s-table-pagination-wrapper')!;
        const pagination = wrapper.querySelector<HTMLElement>('.s-pagination')!;
        const footerScope = document.querySelector<HTMLElement>(
          '[data-testid="column-footer-table"]'
        )!;
        const container = footerScope.querySelector<HTMLElement>('.s-table-container')!;
        const summaryRow = footerScope.querySelector<HTMLElement>('.s-table-summary-row')!;
        return {
          viewportWidth: document.documentElement.clientWidth,
          docScrollWidth: document.documentElement.scrollWidth,
          exportScope: rect(exportScope),
          wrapper: rect(wrapper),
          pagination: rect(pagination),
          footerScope: rect(footerScope),
          container: rect(container),
          summaryRow: rect(summaryRow),
        };
      });
      samples.push({ width, ...metrics });

      // 所在 section 本身必须在视口内（round3 其他夹具使用固定 480px 宽，不参与页面级断言）。
      expect(metrics.exportScope.right, `${width}px 分页容器超出视口`).toBeLessThanOrEqual(
        metrics.viewportWidth + 1
      );
      expect(metrics.footerScope.right, `${width}px 汇总容器超出视口`).toBeLessThanOrEqual(
        metrics.viewportWidth + 1
      );

      // 分页内容不得溢出包装器。
      expect(metrics.pagination.left, `${width}px 分页左溢出`).toBeGreaterThanOrEqual(
        metrics.wrapper.left - 1
      );
      expect(metrics.pagination.right, `${width}px 分页右溢出`).toBeLessThanOrEqual(
        metrics.wrapper.right + 1
      );
      expect(metrics.wrapper.left).toBeGreaterThanOrEqual(metrics.exportScope.left - 1);
      expect(metrics.wrapper.right).toBeLessThanOrEqual(metrics.exportScope.right + 1);

      // 列汇总行不得溢出滚动容器。
      expect(metrics.summaryRow.left, `${width}px 汇总左溢出`).toBeGreaterThanOrEqual(
        metrics.container.left - 1
      );
      expect(metrics.summaryRow.right, `${width}px 汇总右溢出`).toBeLessThanOrEqual(
        metrics.container.right + 1
      );
    }

    pushMetrics(testInfo, { widths, samples });
  });

  test('连续 100 次 viewport resize 后监听器与布局稳定', async ({
    page,
    browserName,
  }, testInfo) => {
    test.setTimeout(180_000);
    test.skip(browserName !== 'chromium', 'CDP DOMDebugger 仅 Chromium。');

    await openFixture(page, 'virtual');
    const scope = page.getByTestId('virtual-table');
    await expect(rowsOf(scope).first()).toBeAttached();

    const session = await page.context().newCDPSession(page);
    const windowResizeListeners = async () => {
      const { result } = await session.send('Runtime.evaluate', { expression: 'window' });
      if (!result.objectId) return 0;
      const { listeners } = await session.send('DOMDebugger.getEventListeners', {
        objectId: result.objectId,
      });
      return listeners.filter((listener) => listener.type === 'resize').length;
    };

    const before = await windowResizeListeners();
    const widths = [390, 576, 768, 992, 1200, 1600];
    for (let index = 0; index < 100; index++) {
      await page.setViewportSize({
        width: widths[index % widths.length]!,
        height: index % 2 === 0 ? 600 : 800,
      });
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    await waitFrames(page, 5);
    await page.waitForTimeout(100);

    const after = await windowResizeListeners();
    const metrics = await scope.evaluate((element) => {
      const container = element.querySelector<HTMLElement>('.s-table-container');
      if (!container) throw new Error('container not found');
      const containerRect = container.getBoundingClientRect();
      const headerCell = element
        .querySelector<HTMLElement>('thead th[data-column-id="id"]')
        ?.getBoundingClientRect();
      const bodyCell = element
        .querySelector<HTMLElement>('tbody .s-table-row td[data-column-id="id"]')
        ?.getBoundingClientRect();
      return {
        tableCount: element.querySelectorAll('.s-table').length,
        rows: element.querySelectorAll('tbody .s-table-row[data-row-key]').length,
        containerWidth: containerRect.width,
        containerClientWidth: container.clientWidth,
        headerCellWidth: headerCell?.width ?? 0,
        bodyCellWidth: bodyCell?.width ?? 0,
        docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(after - before, `resize 监听器增加 ${after - before} 个`).toBeLessThanOrEqual(2);
    expect(metrics.tableCount).toBe(1);
    expect(metrics.rows, 'resize 后 DOM 行数').toBeLessThan(40);
    expect(metrics.containerWidth).toBeGreaterThan(0);
    expect(metrics.containerClientWidth).toBeGreaterThan(0);
    expect(Math.abs(metrics.headerCellWidth - metrics.bodyCellWidth)).toBeLessThanOrEqual(1);
    expect(metrics.docOverflow, 'resize 后页面横向溢出').toBeLessThanOrEqual(1);

    // resize 后滚动仍应正确渲染末行。
    await page.getByTestId('scroll-bottom').click();
    await expect(scope.locator('.s-table-row[data-row-key="20000"]')).toBeVisible();
    expect(await rowsOf(scope).count()).toBeLessThan(40);

    pushMetrics(testInfo, {
      resizeCycles: 100,
      resizeListenersBefore: before,
      resizeListenersAfter: after,
      ...metrics,
    });
  });
});
