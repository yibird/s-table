import { expect, openFixture, test } from '../support/test';
import { publicRowKeys, renderedRows } from '../support/table';

/** 第二轮审计：分组、固定行、radio、自定义筛选、行编辑、手动分页、嵌套表头。 */

test.describe('第二轮：分组与聚合', () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page, 'round2');
  });

  test('默认分组展示数量、聚合值和展开状态', async ({ page }) => {
    const scope = page.getByTestId('grouped-table');

    await expect(scope.locator('.s-table-row-grouped')).toHaveCount(3);
    await expect(scope.locator('.s-table-row')).toHaveCount(9);
    await expect(scope.locator('.s-table-group-cell')).toHaveText([
      'Engineering(2)',
      'Design(2)',
      'Sales(2)',
    ]);
    const groupRows = scope.locator('.s-table-row-grouped');
    await expect(groupRows.nth(0)).toContainText('Total 30');
    await expect(groupRows.nth(1)).toContainText('Total 70');
    await expect(groupRows.nth(2)).toContainText('Total 110');

    const firstTrigger = scope
      .locator('.s-table-row-grouped')
      .first()
      .locator('.s-table-expand-trigger');
    await expect(firstTrigger).toHaveAttribute('aria-expanded', 'true');
    await firstTrigger.click();
    await expect(scope.locator('.s-table-row')).toHaveCount(7);
    await expect(firstTrigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('批量展开/折叠 API 与非法分组列过滤', async ({ page }) => {
    const scope = page.getByTestId('grouped-table');
    await page.getByTestId('collapse-groups').click();
    await expect(scope.locator('.s-table-row')).toHaveCount(3);
    await expect(scope.locator('.s-table-row-grouped')).toHaveCount(3);

    await page.getByTestId('expand-groups').click();
    await expect(scope.locator('.s-table-row')).toHaveCount(9);

    // name 未开启 groupable，setGroupBy 应被忽略且不派发事件、也不清除现有分组。
    await page.getByTestId('group-by-name').click();
    await expect(page.getByTestId('group-event')).toHaveText('idle');
    await expect(scope.locator('.s-table-row-grouped')).toHaveCount(3);
    await expect(scope.locator('.s-table-row')).toHaveCount(9);
  });

  test('分组模式下全选只选择叶子行，不包含分组行', async ({ page }) => {
    const scope = page.getByTestId('grouped-table');
    await scope.locator('thead .s-checkbox-wrapper').click();
    await expect(page.getByTestId('group-selected')).toHaveText('1,2,3,4,5,6');
    await expect(scope.locator('.s-table-row-grouped.s-table-row-selected')).toHaveCount(0);

    await scope.locator('thead .s-checkbox-wrapper').click();
    await expect(page.getByTestId('group-selected')).toBeEmpty();
  });

  test('暗色模式下分组行与文本可读', async ({ page }) => {
    await page.locator('html').evaluate((element) => element.classList.add('dark'));
    const scope = page.getByTestId('grouped-table');
    await expect(scope.locator('.s-table-row-grouped')).toHaveCount(3);
    const styles = await scope
      .locator('.s-table-row-grouped')
      .first()
      .evaluate((element) => {
        const cell = element.querySelector<HTMLElement>('.s-table-cell');
        if (!cell) throw new Error('分组行单元格不存在');
        const style = getComputedStyle(cell);
        return { color: style.color, background: style.backgroundColor };
      });
    expect(styles.color).toBe('rgba(255, 255, 255, 0.85)');
    expect(styles.background).toBe('rgb(26, 26, 26)');
  });
});

test.describe('第二轮：固定行', () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page, 'round2');
  });

  test('初始固定行位于顶部/底部且只渲染一次', async ({ page }) => {
    const scope = page.getByTestId('pinned-row-table');

    await expect(page.getByTestId('pinned-keys')).toHaveText('2|5');
    const keys = await publicRowKeys(scope);
    expect(keys[0]).toBe('2');
    expect(keys[keys.length - 1]).toBe('5');
    expect(keys.filter((key) => key === '2')).toHaveLength(1);
    expect(keys.filter((key) => key === '5')).toHaveLength(1);

    await expect(scope.locator('.s-table-row-pinned-top')).toHaveAttribute('data-row-key', '2');
    await expect(scope.locator('.s-table-row-pinned-bottom')).toHaveAttribute('data-row-key', '5');

    const topGeometry = await scope
      .locator('.s-table-row-pinned-top')
      .evaluate((element) => getComputedStyle(element).position);
    expect(topGeometry).toBe('sticky');
  });

  test('pinRow API 支持固定到顶部/底部与取消固定', async ({ page }) => {
    const scope = page.getByTestId('pinned-row-table');

    await page.getByTestId('pin-top').click();
    await expect(page.getByTestId('pinned-keys')).toHaveText('2,3|5');
    await expect(scope.locator('.s-table-row-pinned-top')).toHaveCount(2);

    await page.getByTestId('unpin').click();
    await expect(page.getByTestId('pinned-keys')).toHaveText('3|5');
    await expect(scope.locator('.s-table-row[data-row-key="2"]')).not.toHaveClass(
      /s-table-row-pinned/
    );

    await page.getByTestId('pin-bottom').click();
    await expect(page.getByTestId('pinned-keys')).toHaveText('3|5,1');
    expect((await publicRowKeys(scope)).slice(-2)).toEqual(['5', '1']);
  });
});

test.describe('第二轮：固定行滚动与菜单筛选', () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page, 'round2');
  });

  test('纵向滚动时固定行吸附在容器顶部/底部', async ({ page }) => {
    const scope = page.getByTestId('tall-pinned-table');
    const container = scope.locator('.s-table-container');
    await expect(scope.locator('.s-table-row-pinned-top')).toHaveCount(1);

    await container.evaluate((element) => {
      element.scrollTop = 500;
      element.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(200);

    const metrics = await container.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const header = element.querySelector<HTMLElement>('.s-table-header')!;
      const topRow = element.querySelector<HTMLElement>('.s-table-row-pinned-top')!;
      const bottomRow = element.querySelector<HTMLElement>('.s-table-row-pinned-bottom')!;
      return {
        scrollTop: element.scrollTop,
        topRowTop: topRow.getBoundingClientRect().top,
        headerBottom: header.getBoundingClientRect().bottom,
        bottomRowBottom: bottomRow.getBoundingClientRect().bottom,
        containerBottom: rect.bottom,
      };
    });
    expect(metrics.scrollTop).toBeGreaterThan(0);
    // 固定表头默认开启，顶部固定行应紧贴在吸顶表头下方。
    expect(Math.abs(metrics.topRowTop - metrics.headerBottom)).toBeLessThanOrEqual(1);
    expect(Math.abs(metrics.bottomRowBottom - metrics.containerBottom)).toBeLessThanOrEqual(1);
  });

  test('单选筛选可单点应用并关闭', async ({ page }) => {
    const scope = page.getByTestId('menu-filter-table');
    const trigger = scope.locator('.s-table-filter-trigger');

    await trigger.click();
    const panel = page.locator('.s-table-filter-dropdown');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.s-table-filter-dropdown-menu-item')).toHaveCount(3);

    await panel.locator('.s-table-filter-dropdown-menu-item', { hasText: 'Design' }).click();
    await expect(panel).toBeHidden();
    await expect(trigger).toHaveClass(/active/);
    await expect(renderedRows(scope)).toHaveCount(2);
    await expect(page.getByTestId('menu-filter-event')).toHaveText(
      JSON.stringify({ department: ['Design'] })
    );

    // 单选菜单没有 footer，重新打开后 Escape 关闭。
    await trigger.click();
    await expect(panel.locator('.s-table-filter-dropdown-footer')).toHaveCount(0);
    await panel.press('Escape');
    await expect(panel).toBeHidden();
  });
});

test.describe('第二轮：单选与自定义筛选', () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page, 'round2');
  });

  test('radio 单选替换选中项且禁用行不可选', async ({ page }) => {
    const scope = page.getByTestId('radio-table');
    await expect(page.getByTestId('radio-selected')).toHaveText('2');

    await scope.locator('.s-table-row[data-row-key="1"] .s-radio-wrapper').click();
    await expect(page.getByTestId('radio-selected')).toHaveText('1');
    await expect(page.getByTestId('radio-event')).toHaveText('1');
    await expect
      .poll(() =>
        scope
          .locator('.s-table-row[data-row-key="1"] input[type="radio"]')
          .evaluate((input: HTMLInputElement) => input.checked)
      )
      .toBe(true);
    await expect
      .poll(() =>
        scope
          .locator('.s-table-row[data-row-key="2"] input[type="radio"]')
          .evaluate((input: HTMLInputElement) => input.checked)
      )
      .toBe(false);

    await expect(
      scope.locator('.s-table-row[data-row-key="3"] input[type="radio"]')
    ).toBeDisabled();

    // 再次点击已选项不应取消。
    await scope.locator('.s-table-row[data-row-key="1"] .s-radio-wrapper').click();
    await expect(page.getByTestId('radio-selected')).toHaveText('1');
  });

  test('自定义筛选面板支持输入、确认、重置并管理焦点', async ({ page }) => {
    const scope = page.getByTestId('custom-filter-table');
    const trigger = scope.locator('.s-table-filter-trigger');

    await trigger.click();
    const panel = page.locator('.s-table-filter-dropdown');
    await expect(panel.getByTestId('custom-filter')).toBeVisible();
    await expect(panel.getByTestId('custom-filter-input')).toBeFocused();

    await panel.getByTestId('custom-filter-input').fill('Design');
    await panel.getByTestId('custom-filter-apply').click();
    await expect(renderedRows(scope)).toHaveCount(2);
    await expect(page.getByTestId('custom-filter-event')).toHaveText(
      JSON.stringify({ department: ['Design'] })
    );

    // 外部点击关闭后再次打开，自定义面板仍能重置。
    await trigger.click();
    await panel.getByTestId('custom-filter-reset').click();
    await expect(renderedRows(scope)).toHaveCount(6);
    // 重置会从过滤状态中移除该列，事件载荷为空对象。
    await expect(page.getByTestId('custom-filter-event')).toHaveText('{}');
  });
});

test.describe('第二轮：行编辑与手动分页', () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page, 'round2');
  });

  test('行编辑同时打开多个编辑器，提交和取消行为正确', async ({ page }) => {
    const scope = page.getByTestId('row-edit-table');
    const row = scope.locator('.s-table-row[data-row-key="1"]');

    await row.dblclick();
    const editors = row.locator('input.s-table-cell-editor');
    await expect(editors).toHaveCount(2);
    await editors.nth(0).fill('Ada Lovelace');
    await editors.nth(1).fill('99');
    await page.getByTestId('commit-row-edit').click();
    await expect(row).toContainText('Ada Lovelace');
    await expect(row).toContainText('99');
    await expect(page.getByTestId('row-edit-event')).toHaveText('commit:1');

    await row.dblclick();
    await row.locator('input.s-table-cell-editor').first().fill('Discarded');
    await page.getByTestId('cancel-row-edit').click();
    await expect(row).toContainText('Ada Lovelace');
    await expect(row).not.toContainText('Discarded');

    // Escape 应取消整行的编辑草稿。
    await row.dblclick();
    const escapeEditor = row.locator('input.s-table-cell-editor').first();
    await escapeEditor.fill('Escaped');
    await escapeEditor.press('Escape');
    await expect(row.locator('input.s-table-cell-editor')).toHaveCount(0);
    await expect(row).toContainText('Ada Lovelace');
    await expect(row).not.toContainText('Escaped');
  });

  test('手动分页只消费外部切片并保留服务端总数', async ({ page }) => {
    const scope = page.getByTestId('manual-pagination-table');
    const pagination = scope.locator('.s-pagination');

    await expect(renderedRows(scope)).toHaveCount(5);
    await expect(renderedRows(scope).first()).toContainText('Manual 1');
    await expect(pagination.locator('.s-pagination-total-text')).toHaveText('1-5 / 23');

    await pagination.locator('.s-pagination-next').click();
    await expect(page.getByTestId('manual-page')).toContainText('2|5|page:2');
    await expect(renderedRows(scope).first()).toContainText('Manual 6');
    await expect(renderedRows(scope)).toHaveCount(5);

    await pagination.locator('.s-select-selector').click();
    await page.locator('.s-select-item-option', { hasText: '10 items/page' }).click();
    await expect(page.getByTestId('manual-page')).toContainText('2|10');
    await expect(renderedRows(scope).first()).toContainText('Manual 11');
    await expect(pagination.locator('.s-pagination-total-text')).toHaveText('11-20 / 23');
  });

  test('嵌套表头按列组生成正确的 colspan/rowspan', async ({ page }) => {
    const scope = page.getByTestId('nested-header-table');
    const rows = scope.locator('thead tr');
    await expect(rows).toHaveCount(2);

    const topCells = rows.nth(0).locator('th');
    await expect(topCells).toHaveCount(3);
    await expect(topCells.nth(0)).toHaveAttribute('rowspan', '2');
    await expect(topCells.nth(1)).toHaveAttribute('colspan', '2');
    await expect(topCells.nth(2)).toHaveAttribute('colspan', '1');

    const secondRowHeaders = rows.nth(1).locator('th');
    await expect(secondRowHeaders).toHaveText(['Name', 'Department', 'Amount']);
  });
});

test.describe('第二轮：大数据性能', () => {
  test('10 万行 × 40 列：挂载、滚动、排序与搜索保持可用', async ({ page }) => {
    const mountStarted = Date.now();
    await openFixture(page, 'round2perf');
    const scope = page.getByTestId('perf-table');
    await expect(scope.locator('.s-table-row[data-row-key]').first()).toBeAttached({
      timeout: 15_000,
    });
    const mountMs = Date.now() - mountStarted;
    expect(mountMs).toBeLessThan(8_000);

    // DOM 必须有界。
    const dom = await scope.evaluate((element) => ({
      rows: element.querySelectorAll('tbody .s-table-row').length,
      cells: element.querySelectorAll('tbody td').length,
      headers: element.querySelectorAll('thead th').length,
    }));
    expect(dom.rows).toBeLessThan(40);
    expect(dom.cells).toBeLessThan(800);
    expect(dom.headers).toBeLessThan(30);

    // 连续滚动帧耗时。
    const container = scope.locator('.s-table-container');
    const frames = await container.evaluate(async (element) => {
      const durations: number[] = [];
      const maxScrollTop = element.scrollHeight - element.clientHeight;
      for (let step = 1; step <= 20; step++) {
        const startedAt = performance.now();
        element.scrollTop = (maxScrollTop * step) / 20;
        element.dispatchEvent(new Event('scroll'));
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        durations.push(performance.now() - startedAt);
      }
      durations.sort((left, right) => left - right);
      return durations[Math.ceil(durations.length * 0.95) - 1] ?? 0;
    });
    expect(frames).toBeLessThan(150);

    // 回到顶部后再验证全量排序。
    await container.evaluate((element) => {
      element.scrollTop = 0;
      element.dispatchEvent(new Event('scroll'));
    });
    const firstKey = () => renderedRows(scope).first().getAttribute('data-row-key');
    await expect.poll(firstKey).toBe('1');
    const idHeader = scope.locator('th[data-column-id="id"]');
    const idTitle = idHeader.locator('.s-table-cell-title');
    await idTitle.click();
    await expect(idHeader).toHaveAttribute('aria-sort', 'ascending');
    const sortStarted = Date.now();
    await idTitle.click();
    await expect(idHeader).toHaveAttribute('aria-sort', 'descending');
    await expect.poll(firstKey, { timeout: 10_000 }).toBe('100000');
    const sortMs = Date.now() - sortStarted;
    expect(sortMs).toBeLessThan(4_000);

    // 全量搜索 10 万行。
    const searchStarted = Date.now();
    await scope.locator('th[data-column-id="name"] .s-table-search-trigger').click();
    const input = page.locator('.s-table-search-input');
    await input.fill('Perf Row 099999');
    await input.press('Enter');
    await expect(renderedRows(scope)).toHaveCount(1, { timeout: 10_000 });
    await expect(renderedRows(scope).first()).toHaveAttribute('data-row-key', '99999');
    const searchMs = Date.now() - searchStarted;
    expect(searchMs).toBeLessThan(4_000);
    // 指标同时写进测试注解，报告可直接引用最近的运行结果。
    test.info().annotations.push({
      type: 'performance',
      description: JSON.stringify({
        mountMs,
        frameP95: Math.round(frames * 100) / 100,
        domRows: dom.rows,
        domCells: dom.cells,
        sortMs,
        searchMs,
      }),
    });
  });
});

test.describe('第二轮：视觉截图', () => {
  test('采集 round2 夹具明暗截图', async ({ page }, testInfo) => {
    await openFixture(page, 'round2');
    await expect(page.getByTestId('grouped-table')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('round2-light.png'), fullPage: true });
    await page.locator('html').evaluate((element) => element.classList.add('dark'));
    await page.screenshot({ path: testInfo.outputPath('round2-dark.png'), fullPage: true });
  });
});
