import { expect, openFixture, test } from '../support/test';
import { publicRowKeys, renderedRows } from '../support/table';

test.beforeEach(async ({ page }) => {
  await openFixture(page, 'core');
});

test.describe('核心数据管道', () => {
  test('未配置宽度的列平分并铺满表格', async ({ page }) => {
    const scope = page.getByTestId('equal-width-table');
    const metrics = await scope.locator('table').evaluate((table) => {
      const widths = Array.from(
        table.querySelectorAll('thead th[data-column-id]'),
        (cell) => cell.getBoundingClientRect().width
      );

      return {
        tableWidth: table.getBoundingClientRect().width,
        widths,
        declaredColWidths: Array.from(table.querySelectorAll('colgroup col'), (col) =>
          col.getAttribute('style')
        ),
      };
    });

    expect(metrics.declaredColWidths).toEqual([null, null, null, null]);
    expect(metrics.widths).toHaveLength(4);
    expect(Math.max(...metrics.widths) - Math.min(...metrics.widths)).toBeLessThanOrEqual(1);
    expect(metrics.widths.reduce((total, width) => total + width, 0)).toBeCloseTo(
      metrics.tableWidth,
      0
    );
  });

  test('渲染表头、数据、汇总和页脚', async ({ page }) => {
    const pipeline = page.getByTestId('pipeline-table');
    await expect(pipeline.locator('th[data-column-id]')).toHaveCount(4);
    await expect(renderedRows(pipeline)).toHaveCount(12);
    await expect(renderedRows(pipeline).first()).toContainText('User 01');

    const state = page.getByTestId('state-table');
    await expect(state.locator('.s-table-summary-row')).toContainText('Summary');
    await expect(state.locator('.s-table-summary-row')).toContainText('3');
    await expect(page.getByTestId('custom-footer')).toHaveText('Fixture footer');
  });

  test('keyboard entry and popup semantics remain accessible', async ({ page }) => {
    const pipeline = page.getByTestId('pipeline-table');
    const container = pipeline.locator('.s-table-container');
    await container.focus();
    await expect(pipeline.locator('tbody td[data-column-id]').first()).toBeFocused();

    const filter = pipeline.locator('th[data-column-id="department"] .s-table-filter-trigger');
    await expect(filter).toHaveAttribute('aria-expanded', 'false');
    await filter.press('Enter');
    await expect(filter).toHaveAttribute('aria-expanded', 'true');
    const firstFilterOption = page.locator('.s-table-filter-dropdown [role="checkbox"]').first();
    await firstFilterOption.focus();
    await firstFilterOption.press('Space');
    await page.locator('.s-table-filter-dropdown').press('Escape');
    await expect(filter).toBeFocused();
    await expect(filter).toHaveAttribute('aria-expanded', 'false');

    const search = pipeline.locator('th[data-column-id="name"] .s-table-search-trigger');
    await search.press('Enter');
    await expect(search).toHaveAttribute('aria-expanded', 'true');
    await page.locator('.s-table-search-input').press('Escape');
    await expect(search).toBeFocused();
  });

  test('鼠标和键盘排序同步 aria-sort 与行模型', async ({ page }) => {
    const pipeline = page.getByTestId('pipeline-table');
    const scoreHeader = pipeline.locator('th[data-column-id="score"]');
    const scoreTitle = scoreHeader.locator('.s-table-cell-title');

    await scoreTitle.click();
    await expect(scoreHeader).toHaveAttribute('aria-sort', 'ascending');
    await expect
      .poll(() => publicRowKeys(pipeline))
      .toEqual(['12', '11', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1']);

    await scoreTitle.press('Enter');
    await expect(scoreHeader).toHaveAttribute('aria-sort', 'descending');
    await expect(renderedRows(pipeline).first()).toHaveAttribute('data-row-key', '1');

    await scoreTitle.press('Space');
    await expect(scoreHeader).toHaveAttribute('aria-sort', 'none');
    await expect(renderedRows(pipeline).first()).toHaveAttribute('data-row-key', '1');
  });

  test('过滤与搜索按 TanStack 数据管道组合并可重置', async ({ page }) => {
    const pipeline = page.getByTestId('pipeline-table');
    const departmentHeader = pipeline.locator('th[data-column-id="department"]');

    await departmentHeader.locator('.s-table-filter-trigger').click();
    const filterDropdown = page.locator('.s-table-filter-dropdown');
    await expect(filterDropdown.locator('.s-table-filter-dropdown-btn-reset')).toHaveClass(
      /s-btn-default/
    );
    await expect(filterDropdown.locator('.s-table-filter-dropdown-btn-confirm')).toHaveClass(
      /s-btn-primary/
    );
    await filterDropdown
      .locator('.s-table-filter-dropdown-checkbox', { hasText: 'Engineering' })
      .click();
    await filterDropdown.locator('.s-table-filter-dropdown-btn-confirm').click();

    await expect(renderedRows(pipeline)).toHaveCount(3);
    await expect.poll(() => publicRowKeys(pipeline)).toEqual(['1', '5', '9']);
    await expect(departmentHeader.locator('.s-table-filter-trigger')).toHaveClass(/active/);

    const nameHeader = pipeline.locator('th[data-column-id="name"]');
    await expect(nameHeader.locator('.s-table-search-trigger svg')).toHaveAttribute('width', '16');
    await nameHeader.locator('.s-table-search-trigger').click();
    const searchInput = page.locator('.s-table-search-input');
    await expect(searchInput).toBeFocused();
    await searchInput.fill('User 05');
    await searchInput.press('Enter');

    await expect(renderedRows(pipeline)).toHaveCount(1);
    await expect(renderedRows(pipeline).first()).toHaveAttribute('data-row-key', '5');
    await expect(nameHeader.locator('.s-table-search-trigger')).toHaveClass(/active/);

    await page.getByTestId('clear-pipeline').click();
    await expect(renderedRows(pipeline)).toHaveCount(12);
    await expect(departmentHeader.locator('.s-table-filter-trigger')).not.toHaveClass(/active/);
    await expect(nameHeader.locator('.s-table-search-trigger')).not.toHaveClass(/active/);
  });

  test('暗黑模式覆盖过滤与搜索浮层的控件和分隔线', async ({ page }) => {
    await page.locator('html').evaluate((element) => element.classList.add('dark'));
    const pipeline = page.getByTestId('pipeline-table');

    await pipeline.locator('th[data-column-id="department"] .s-table-filter-trigger').click();
    const filterDropdown = page.locator('.s-table-filter-dropdown');
    const filterStyles = await filterDropdown.evaluate((element) => {
      const reset = element.querySelector('.s-table-filter-dropdown-btn-reset');
      const confirm = element.querySelector('.s-table-filter-dropdown-btn-confirm');
      const checkbox = element.querySelector('.s-table-filter-checkbox-box');
      const footer = element.querySelector('.s-table-filter-dropdown-footer');
      if (!reset || !confirm || !checkbox || !footer) throw new Error('过滤面板结构不完整');

      return {
        panelBackground: getComputedStyle(element).backgroundColor,
        resetBackground: getComputedStyle(reset).backgroundColor,
        resetBorder: getComputedStyle(reset).borderColor,
        resetColor: getComputedStyle(reset).color,
        confirmBackground: getComputedStyle(confirm).backgroundColor,
        checkboxBackground: getComputedStyle(checkbox).backgroundColor,
        checkboxBorder: getComputedStyle(checkbox).borderColor,
        footerBorder: getComputedStyle(footer).borderTopColor,
      };
    });
    expect(filterStyles).toEqual({
      panelBackground: 'rgb(20, 20, 20)',
      resetBackground: 'rgb(20, 20, 20)',
      resetBorder: 'rgb(66, 66, 66)',
      resetColor: 'rgba(255, 255, 255, 0.85)',
      confirmBackground: 'rgb(22, 104, 220)',
      checkboxBackground: 'rgb(20, 20, 20)',
      checkboxBorder: 'rgb(66, 66, 66)',
      footerBorder: 'rgb(48, 48, 48)',
    });

    await filterDropdown.locator('.s-table-filter-dropdown-btn-reset').click();
    await pipeline.locator('th[data-column-id="name"] .s-table-search-trigger').click();
    const searchDropdown = page.locator('.s-table-search-dropdown');
    const searchStyles = await searchDropdown.evaluate((element) => {
      const input = element.querySelector('.s-table-search-input');
      const reset = element.querySelector('.s-table-search-dropdown-btn-reset');
      const footer = element.querySelector('.s-table-search-dropdown-footer');
      if (!input || !reset || !footer) throw new Error('搜索面板结构不完整');

      return {
        panelBackground: getComputedStyle(element).backgroundColor,
        inputBackground: getComputedStyle(input).backgroundColor,
        inputColor: getComputedStyle(input).color,
        resetBackground: getComputedStyle(reset).backgroundColor,
        resetBorder: getComputedStyle(reset).borderColor,
        footerBorder: getComputedStyle(footer).borderTopColor,
      };
    });
    expect(searchStyles).toEqual({
      panelBackground: 'rgb(20, 20, 20)',
      inputBackground: 'rgb(20, 20, 20)',
      inputColor: 'rgba(255, 255, 255, 0.85)',
      resetBackground: 'rgb(20, 20, 20)',
      resetBorder: 'rgb(66, 66, 66)',
      footerBorder: 'rgb(48, 48, 48)',
    });
  });
});

test.describe('分页和动态状态', () => {
  test('暗黑模式覆盖页码、快速跳转和 page size 下拉面板', async ({ page }) => {
    await page.locator('html').evaluate((element) => element.classList.add('dark'));
    const pagination = page.getByTestId('pagination-table').locator('.s-pagination');

    await expect
      .poll(() =>
        pagination.locator('.s-pagination-item-active').evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            backgroundColor: style.backgroundColor,
            borderColor: style.borderColor,
            color: style.color,
          };
        })
      )
      .toEqual({
        backgroundColor: 'rgb(20, 20, 20)',
        borderColor: 'rgb(22, 104, 220)',
        color: 'rgb(22, 104, 220)',
      });

    const inputStyles = await pagination
      .locator('.s-pagination-quick-jumper-input')
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return { backgroundColor: style.backgroundColor, color: style.color };
      });
    expect(inputStyles).toEqual({
      backgroundColor: 'rgb(20, 20, 20)',
      color: 'rgba(255, 255, 255, 0.85)',
    });

    await pagination.locator('.s-select-selector').click();
    const dropdownStyles = await page.locator('.s-select-dropdown').evaluate((element) => {
      const style = getComputedStyle(element);
      const option = element.querySelector('.s-select-item-option');
      return {
        backgroundColor: style.backgroundColor,
        optionColor: option ? getComputedStyle(option).color : '',
      };
    });
    expect(dropdownStyles).toEqual({
      backgroundColor: 'rgb(20, 20, 20)',
      optionColor: 'rgba(255, 255, 255, 0.85)',
    });
  });

  test('翻页、快速跳页和 page size 切换保持正确边界', async ({ page }) => {
    const paginationTable = page.getByTestId('pagination-table');
    const pagination = paginationTable.locator('.s-pagination');

    await expect(renderedRows(paginationTable)).toHaveCount(10);
    await expect(renderedRows(paginationTable).first()).toHaveAttribute('data-row-key', '1');
    await pagination.locator('.s-pagination-next').click();
    await expect(renderedRows(paginationTable).first()).toHaveAttribute('data-row-key', '11');
    await expect(pagination.locator('.s-pagination-item-active')).toHaveText('2');

    await pagination.locator('.s-pagination-quick-jumper-input').fill('3');
    await pagination.locator('.s-pagination-quick-jumper-input').press('Enter');
    await expect(renderedRows(paginationTable).first()).toHaveAttribute('data-row-key', '21');

    await pagination.locator('.s-select-selector').click();
    const sizeDropdown = page.locator('.s-select-dropdown');
    await expect
      .poll(() => sizeDropdown.evaluate((element) => getComputedStyle(element).gap))
      .toBe('4px');
    await sizeDropdown.locator('.s-select-item-option', { hasText: '20 条/页' }).click();
    await expect(renderedRows(paginationTable)).toHaveCount(12);
    await expect(pagination.locator('.s-pagination-item-active')).toHaveText('2');
    await expect(pagination.locator('.s-pagination-total-text')).toHaveText('21-32 / 32');
  });

  test('loading、空状态、不可变数据更新和动态 renderer 都会刷新', async ({ page }) => {
    const state = page.getByTestId('state-table');

    await page.getByTestId('toggle-loading').click();
    await expect(page.getByTestId('custom-loading')).toBeVisible();
    await page.getByTestId('toggle-loading').click();
    await expect(page.getByTestId('custom-loading')).toBeHidden();

    await page.getByTestId('clear-data').click();
    await expect(page.getByTestId('custom-empty')).toBeVisible();
    await expect(renderedRows(state)).toHaveCount(0);

    await page.getByTestId('reset-data').click();
    await page.getByTestId('replace-row').click();
    await expect(renderedRows(state).first()).toContainText('Replaced Row');

    await page.getByTestId('update-row').click();
    await expect(renderedRows(state).first()).toContainText('Updated Row');
    await page.getByTestId('toggle-renderer').click();
    await expect(renderedRows(state).first()).toContainText('UPDATED ROW');
  });
});

test('窄视口下表格保留内部滚动且页面不产生横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();

  const state = page.getByTestId('state-table');
  const metrics = await state.locator('.s-table-container').evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    bodyScrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(metrics.scrollWidth).toBeGreaterThanOrEqual(metrics.clientWidth);
  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  await expect(state.locator('th[data-column-id="id"]')).toBeVisible();
});
