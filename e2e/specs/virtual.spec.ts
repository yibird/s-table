import { expect, openFixture, test } from '../support/test';
import { publicRowKeys, renderedRows } from '../support/table';

test.beforeEach(async ({ page }) => {
  await openFixture(page, 'virtual');
});

test.describe('大数据虚拟滚动', () => {
  test('初始窗口只渲染有限 DOM 行且不启用分页', async ({ page }) => {
    const scope = page.getByTestId('virtual-table');
    await expect(renderedRows(scope).first()).toBeAttached();
    const rowCount = await renderedRows(scope).count();

    expect(rowCount).toBeGreaterThan(0);
    expect(rowCount).toBeLessThan(40);
    await expect(renderedRows(scope).first()).toHaveAttribute('data-row-key', '1');
    await expect(scope.locator('.s-table-pagination-wrapper')).toHaveCount(0);
    await expect(scope.locator('.s-table-virtual-spacer-cell')).toHaveCount(1);
  });

  test('纵向虚拟化保留分页并渲染当前页行模型', async ({ page }) => {
    const scope = page.getByTestId('paginated-virtual-table');
    const rows = renderedRows(scope);
    const pagination = scope.locator('.s-pagination');

    await expect(rows.first()).toHaveAttribute('data-row-key', '21');
    await expect(pagination.locator('.s-pagination-item-active')).toHaveText('2');
    await expect(scope.locator('.s-table-virtual-spacer-cell')).toBeAttached();

    await pagination.locator('.s-pagination-next').click();

    await expect(rows.first()).toHaveAttribute('data-row-key', '41');
    await expect(pagination.locator('.s-pagination-item-active')).toHaveText('3');
  });

  test('无边框横向滚动仅在固定列遮挡内容的一侧显示阴影', async ({ page }) => {
    const scope = page.getByTestId('bidirectional-virtual-table');
    const table = scope.locator('.s-table');
    const container = scope.locator('.s-table-container');
    const leftShadow = scope.locator('.s-table-fixed-column-shadow-left');
    const rightShadow = scope.locator('.s-table-fixed-column-shadow-right');
    const rightFixedHeader = scope.locator('thead th[data-column-id="tail"]');

    await expect(table).not.toHaveClass(/s-table-bordered/);
    await expect(leftShadow).toHaveCount(0);
    await expect(rightShadow).toHaveCount(1);
    await expect
      .poll(async () => {
        const [shadow, header] = await Promise.all([
          rightShadow.evaluate((element) => element.getBoundingClientRect().right),
          rightFixedHeader.evaluate((element) => element.getBoundingClientRect().left),
        ]);
        return Math.round(shadow - header);
      })
      .toBe(0);
    await container.evaluate((element) => {
      element.scrollLeft = Math.min(600, (element.scrollWidth - element.clientWidth) / 2);
      element.dispatchEvent(new Event('scroll'));
    });
    await expect(leftShadow).toHaveCount(1);
    await expect(rightShadow).toHaveCount(1);

    await container.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
      element.dispatchEvent(new Event('scroll'));
    });
    await expect(leftShadow).toHaveCount(1);
    await expect(rightShadow).toHaveCount(0);
  });

  test('双向虚拟化限制行列 DOM，固定列常驻且可定位远端列', async ({ page }) => {
    const scope = page.getByTestId('bidirectional-virtual-table');
    const rows = renderedRows(scope);
    const firstRow = rows.first();

    expect(await rows.count()).toBeLessThan(40);
    expect(await firstRow.locator('td').count()).toBeLessThan(20);
    await expect(scope.locator('th[data-column-id="id"]')).toBeVisible();
    await expect(scope.locator('th[data-column-id="tail"]')).toBeVisible();
    await expect(scope.locator('.s-table-column-virtual-spacer').first()).toBeAttached();

    await page.getByTestId('scroll-last-column').click();

    await expect(page.getByTestId('column-api-status')).toHaveText('column:metric-80');
    await expect(scope.locator('th[data-column-id="metric-80"]')).toBeVisible();
    await expect(scope.locator('th[data-column-id="id"]')).toBeVisible();
    await expect(scope.locator('th[data-column-id="tail"]')).toBeVisible();
    await firstRow.locator('td[data-column-id="metric-80"]').click();
    await expect(page.getByTestId('column-cell-event')).toHaveText('metric-80:1:81');
    expect(await firstRow.locator('td').count()).toBeLessThan(20);
  });

  test('scrollToRow 长距离定位后 DOM 数量仍受控', async ({ page }) => {
    const scope = page.getByTestId('virtual-table');
    await page.getByTestId('scroll-target').click();

    await expect(scope.locator('.s-table-row[data-row-key="15000"]')).toBeVisible();
    await expect(page.getByTestId('api-status')).toHaveText('scroll:15000');
    expect(await renderedRows(scope).count()).toBeLessThan(40);
    const keys = (await publicRowKeys(scope)).map(Number);
    expect(Math.min(...keys)).toBeLessThanOrEqual(15_000);
    expect(Math.max(...keys)).toBeGreaterThanOrEqual(15_000);
  });

  test('离屏行可通过公开 API 选择、展开并在滚动后正确渲染', async ({ page }) => {
    const scope = page.getByTestId('virtual-table');
    await page.getByTestId('select-target').click();
    await page.getByTestId('expand-target').click();
    await expect(page.getByTestId('virtual-selected')).toHaveText('15000');
    await expect(page.getByTestId('virtual-expanded')).toHaveText('15000');

    await page.getByTestId('scroll-target').click();
    const targetRow = scope.locator('.s-table-row[data-row-key="15000"]');
    await expect(targetRow).toHaveClass(/s-table-row-selected/);
    await expect(targetRow).toHaveClass(/s-table-row-expanded/);
    await expect(page.getByTestId('virtual-expanded-15000')).toHaveText(
      'Expanded virtual row 15000'
    );
    expect(await renderedRows(scope).count()).toBeLessThan(40);
  });

  test('滚动到底部触发事件与插槽并渲染末行', async ({ page }) => {
    const scope = page.getByTestId('virtual-table');
    await page.getByTestId('scroll-bottom').click();

    await expect(scope.locator('.s-table-row[data-row-key="20000"]')).toBeVisible();
    await expect(page.getByTestId('bottom-slot')).toBeVisible();
    await expect
      .poll(async () => Number(await page.getByTestId('bottom-events').textContent()))
      .toBeGreaterThan(0);
    expect(await renderedRows(scope).count()).toBeLessThan(40);
  });

  test('深滚动后数据骤减不会渲染越界行或残留旧窗口', async ({ page }) => {
    const scope = page.getByTestId('virtual-table');
    await page.getByTestId('scroll-bottom').click();
    await expect(scope.locator('.s-table-row[data-row-key="20000"]')).toBeVisible();
    await page.getByTestId('shrink-rows').click();

    await expect(page.getByTestId('api-status')).toHaveText('rows:25');
    await expect
      .poll(async () => {
        const keys = (await publicRowKeys(scope)).map(Number);
        return keys.length > 0 && keys.every((key) => key >= 1 && key <= 25);
      })
      .toBe(true);
    expect(await renderedRows(scope).count()).toBeLessThanOrEqual(25);

    await page.getByTestId('reset-rows').click();
    await page.getByTestId('scroll-top').click();
    await expect(scope.locator('.s-table-row[data-row-key="1"]')).toBeVisible();
  });

  test('连续虚拟滚动不产生严重长任务或失控 DOM', async ({ page, browserName }) => {
    const scope = page.getByTestId('virtual-table');
    const container = scope.locator('.s-table-container');
    await expect(renderedRows(scope).first()).toBeAttached();

    // rAF 帧耗时采样在 Firefox/WebKit 无头模式下会被节流；帧耗时/长任务断言仅 Chromium。
    if (browserName === 'chromium') {
      const metrics = await container.evaluate(async (element) => {
        const longTasks: number[] = [];
        const frameDurations: number[] = [];
        let observer: PerformanceObserver | undefined;
        if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
          observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) longTasks.push(entry.duration);
          });
          observer.observe({ type: 'longtask' });
        }

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
    expect(await renderedRows(scope).count()).toBeLessThan(40);
  });
});
