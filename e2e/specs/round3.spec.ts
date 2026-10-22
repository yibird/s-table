import { expect, openFixture, test } from '../support/test';
import { renderedRows } from '../support/table';

/** 第三轮审计：省略/Tooltip、表头菜单、导出、分页、列汇总、响应式列。 */

const csv = (text: string) =>
  text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .split('\n');

test.describe('第三轮：省略与 Tooltip', () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page, 'round3');
  });

  test('ellipsis 应用于表头/单元格，showTitle 补充原生 title', async ({ page }) => {
    const scope = page.getByTestId('tooltip-table');
    const nameCell = scope.locator('.s-table-row[data-row-key="4"] td[data-column-id="name"]');
    await expect(nameCell).toHaveClass(/s-table-cell-ellipsis/);
    await expect(scope.locator('th[data-column-id="name"] .s-table-cell-title')).toHaveClass(
      /s-table-cell-title-ellipsis/
    );

    const notesCell = scope.locator('.s-table-row[data-row-key="1"] td[data-column-id="notes"]');
    await expect(notesCell).toHaveAttribute(
      'title',
      'A very long note that must be truncated inside the narrow column'
    );
    await expect(scope.locator('th[data-column-id="notes"]')).toHaveAttribute('title', 'Notes');
  });

  test('仅在内容溢出时显示 Tooltip，支持自定义内容与移出隐藏', async ({ page }) => {
    const scope = page.getByTestId('tooltip-table');
    const tooltip = page.locator('.s-table-tooltip');

    const longCell = scope.locator('.s-table-row[data-row-key="4"] td[data-column-id="name"]');
    await longCell.hover();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveText('Row 4 with a long display name');

    const shortCell = scope.locator('.s-table-row[data-row-key="3"] td[data-column-id="name"]');
    await shortCell.hover();
    await expect(tooltip).toHaveCount(0);

    const customCell = scope.locator(
      '.s-table-row[data-row-key="2"] td[data-column-id="department"]'
    );
    await customCell.hover();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveText('Custom tooltip for row 2');
  });

  test('虚拟滚动后不保留过期 Tooltip', async ({ page }) => {
    const scope = page.getByTestId('virtual-tooltip-table');
    const container = scope.locator('.s-table-container');
    const tooltip = page.locator('.s-table-tooltip');

    await renderedRows(scope).first().locator('td[data-column-id="name"]').hover();
    await expect(tooltip).toBeVisible();

    await container.evaluate((element) => {
      element.scrollTop = 300;
      element.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(200);
    await expect(tooltip).toHaveCount(0);
  });
});

test.describe('第三轮：表头菜单', () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page, 'round3');
  });

  test('点击触发菜单、执行操作并关闭，且不会触发排序', async ({ page }) => {
    const scope = page.getByTestId('header-menu-table');
    const header = scope.locator('th[data-column-id="name"]');
    const trigger = header.locator('.s-table-header-menu-trigger');
    const popup = page.locator('.s-table-header-menu-popup');

    await trigger.click();
    await expect(popup).toBeVisible();
    await expect(header).toHaveAttribute('aria-sort', 'none');
    await expect(page.getByTestId('header-menu-action')).toBeFocused();

    await page.getByTestId('header-menu-action').click();
    await expect(page.getByTestId('menu-event')).toHaveText('action:name');
    await expect(popup).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('Escape 关闭菜单并归还焦点，点击外部也可关闭', async ({ page }) => {
    const scope = page.getByTestId('header-menu-table');
    const header = scope.locator('th[data-column-id="name"]');
    const trigger = header.locator('.s-table-header-menu-trigger');
    const popup = page.locator('.s-table-header-menu-popup');

    await trigger.focus();
    await trigger.press('Enter');
    await expect(popup).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(popup).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await expect(popup).toBeVisible();
    await page.getByRole('heading', { name: 'Header menu' }).click();
    await expect(popup).toBeHidden();
  });
});

test.describe('第三轮：导出', () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page, 'round3');
  });

  const output = (page: import('@playwright/test').Page) =>
    page.getByTestId('export-output').textContent();

  test('默认导出全部行，包含 BOM、公式注入防护与字段转义', async ({ page }) => {
    await page.getByTestId('export-all').click();
    const text = (await output(page))!;
    expect(text.startsWith('\uFEFF')).toBe(true);
    const lines = text
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n')
      .split('\n');
    expect(lines[0]).toBe('ID,Name,Department,Score');
    expect(lines[1]).toBe("1,'=SUM(A1:A2),Engineering,90");
    expect(lines[2]).toBe('2,"A, ""quoted"" name",Design,80');
    expect(lines).toHaveLength(13);
  });

  test('currentPage / selected / 自定义列 / 异步导出', async ({ page }) => {
    await page.getByTestId('export-page').click();
    expect(csv((await output(page))!)).toHaveLength(6);

    await page.getByTestId('export-selected').click();
    expect(csv((await output(page))!)).toEqual([
      'ID,Name,Department,Score',
      "1,'=SUM(A1:A2),Engineering,90",
    ]);

    await page.getByTestId('export-custom').click();
    expect(csv((await output(page))!)).toEqual(['Name,Double', '"A, ""quoted"" name",160']);

    await page.getByTestId('export-async').click();
    await expect
      .poll(async () => (await output(page)) ?? '')
      .toMatch(/^text\/csv;charset=utf-8:\d+$/);
    expect(Number(((await output(page)) ?? '').split(':')[1])).toBeGreaterThan(0);

    await page.getByTestId('export-rows').click();
    expect(await output(page)).toBe('12|id,name,department,score');

    await page.getByTestId('export-excel').click();
    await expect(page.getByTestId('export-error')).toContainText('No Excel adapter registered');
  });

  test('format、空数据、下载文件名与 Excel 适配器', async ({ page }) => {
    await page.getByTestId('export-format').click();
    expect(csv((await output(page))!)).toEqual(['Score', '#80']);

    await page.getByTestId('export-empty').click();
    expect(csv((await output(page))!)).toEqual(['ID,Name,Department,Score']);

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-download').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('orders.csv');

    await page.getByTestId('export-excel-adapter').click();
    await expect(page.getByTestId('export-output')).toHaveText('Sheet1:1:4');
    await expect(page.getByTestId('export-error')).toHaveText('size:1');
  });
});

test.describe('第三轮：分页、页脚与响应式', () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page, 'round3');
  });

  test('简洁分页只保留翻页和页码信息', async ({ page }) => {
    const scope = page.getByTestId('simple-pagination-table');
    const pagination = scope.locator('.s-pagination');
    const pager = pagination.locator('.s-pagination-simple-pager');

    await expect(pager).toHaveText(/1\s*\/\s*3/);
    await expect(pagination.locator('.s-pagination-jump-next')).toHaveCount(0);
    await expect(pagination.locator('.s-pagination-jump-prev')).toHaveCount(0);

    await pagination.locator('.s-pagination-next').click();
    await expect(pager).toHaveText(/2\s*\/\s*3/);
    await expect(renderedRows(scope).first()).toHaveAttribute('data-row-key', '6');
  });

  test('hideOnSinglePage 与 title/footer 函数作用域', async ({ page }) => {
    const single = page.getByTestId('single-page-table');
    await expect(single.locator('.s-table-pagination-wrapper')).toHaveCount(0);

    const scope = page.getByTestId('scope-table');
    await expect(scope.locator('.s-table-title')).toHaveText('Rows 5');
    await expect(scope.locator('.s-table-footer')).toHaveText('page 1/5/12/5');
    await scope.locator('.s-pagination-next').click();
    await expect(scope.locator('.s-table-footer')).toHaveText('page 2/5/12/5');
  });

  test('声明式列 footer 渲染并吸附在滚动容器底部', async ({ page }) => {
    const scope = page.getByTestId('column-footer-table');
    const footer = scope.locator('tfoot.s-table-column-footer');
    await expect(footer).toHaveClass(/s-table-summary-fixed/);
    await expect(footer.locator('th')).toHaveText(['Total', '12 rows', '---']);

    const style = await footer.evaluate((element) => {
      const computed = getComputedStyle(element);
      return { position: computed.position, bottom: computed.bottom };
    });
    expect(style.position).toBe('sticky');
    expect(style.bottom).toBe('0px');
  });

  test('allowCancelRadio 允许再次点击取消选择', async ({ page }) => {
    const scope = page.getByTestId('cancel-radio-table');
    await expect(page.getByTestId('cancel-radio-selected')).toHaveText('1');

    await scope.locator('.s-table-row[data-row-key="1"] .s-radio-wrapper').click();
    await expect(page.getByTestId('cancel-radio-selected')).toHaveText('none');

    await scope.locator('.s-table-row[data-row-key="2"] .s-radio-wrapper').click();
    await expect(page.getByTestId('cancel-radio-selected')).toHaveText('2');
  });

  test('getPopupContainer 将筛选浮层挂载到指定节点', async ({ page }) => {
    const scope = page.getByTestId('popup-container-table');
    const host = page.getByTestId('popup-host');
    await scope.locator('.s-table-filter-trigger').click();

    const dropdown = host.locator('.s-table-filter-dropdown');
    await expect(dropdown).toBeVisible();
    expect(
      await dropdown.evaluate((element) => element.parentElement?.getAttribute('data-testid'))
    ).toBe('popup-host');
  });

  test('customRow / customCell / customHeaderCell 合并属性且保护内部结构属性', async ({ page }) => {
    const scope = page.getByTestId('custom-attrs-table');
    const row = scope.locator('.s-table-row[data-row-key="1"]');
    await expect(row).toHaveAttribute('data-custom-row', 'r1');
    await expect(row).toHaveClass(/custom-row/);
    const rowId = await row.getAttribute('data-row-id');
    expect(rowId).not.toBe('hijacked');

    const nameCell = row.locator('td[data-column-id="name"]');
    await expect(nameCell).toHaveAttribute('data-custom-cell', '0');
    await expect(nameCell).toHaveClass(/custom-cell/);
    await expect(scope.locator('th[data-column-id="name"]')).toHaveAttribute(
      'data-custom-header',
      'yes'
    );

    await row.click();
    await expect(page.getByTestId('attrs-event')).toHaveText('row:1');
  });

  test('响应式列随视口断点显示/隐藏', async ({ page }) => {
    const scope = page.getByTestId('responsive-table');
    const ids = () =>
      scope
        .locator('thead th[data-column-id]')
        .evaluateAll((cells) => cells.map((cell) => (cell as HTMLElement).dataset.columnId));

    // 等首帧完成后再改视口，避免 resize 发生在表格挂载之前。
    await expect(scope.locator('thead th[data-column-id]').first()).toBeAttached();
    await page.setViewportSize({ width: 600, height: 700 });
    await expect.poll(ids).toEqual(['id', 'score']);

    await page.setViewportSize({ width: 900, height: 700 });
    await expect.poll(ids).toEqual(['id', 'name', 'score']);

    await page.setViewportSize({ width: 1200, height: 700 });
    await expect.poll(ids).toEqual(['id', 'name', 'department', 'score']);
  });
});

test.describe('第三轮：视觉截图', () => {
  test('采集 round3 夹具明暗截图', async ({ page }, testInfo) => {
    await openFixture(page, 'round3');
    await expect(page.getByTestId('tooltip-table')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('round3-light.png'), fullPage: true });
    await page.locator('html').evaluate((element) => element.classList.add('dark'));
    await page.screenshot({ path: testInfo.outputPath('round3-dark.png'), fullPage: true });
  });
});
