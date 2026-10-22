import { expect, openFixture, test } from '../support/test';
import { renderedRows } from '../support/table';
import type { Locator, Page } from '@playwright/test';

/**
 * 键盘交互与 ARIA 审计。
 *
 * 只新建本文件与 `agent-row-mode` 探针页，不修改任何现有源码 / 测试 / fixture。
 * 失败项代表可复现的产品行为，需结合测试名称定位。
 */

type FocusInfo = {
  tag: string;
  className: string;
  columnId: string;
  colIndex: string;
  rowIndex: string;
  rowKey: string;
  text: string;
  insidePipelineThead: boolean;
  insidePipeline: boolean;
};

const focusedInfo = (page: Page): Promise<FocusInfo | null> =>
  page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (!element) return null;
    return {
      tag: element.tagName,
      className: typeof element.className === 'string' ? element.className : '',
      columnId: element.dataset?.columnId ?? '',
      colIndex: element.dataset?.colIndex ?? '',
      rowIndex: element.dataset?.rowIndex ?? '',
      rowKey:
        element.dataset?.rowKey ??
        element.closest<HTMLElement>('tr[data-row-key]')?.dataset.rowKey ??
        '',
      text: (element.textContent ?? '').trim().slice(0, 40),
      insidePipelineThead: Boolean(element.closest('[data-testid="pipeline-table"] thead')),
      insidePipeline: Boolean(element.closest('[data-testid="pipeline-table"]')),
    };
  });

const cellOf = (scope: Locator, row: number, col: number) =>
  scope.locator(`tbody td[data-row-index="${row}"][data-col-index="${col}"]`);

test.describe('Tab 顺序与焦点可见性', () => {
  test('Tab 进入表格后焦点可见，但表头操作被跳过', async ({ page }) => {
    await openFixture(page, 'core');
    const pipeline = page.getByTestId('pipeline-table');
    const firstCell = pipeline.locator('tbody td[data-column-id][tabindex]').first();

    await page.getByTestId('clear-pipeline').focus();
    await page.keyboard.press('Tab');
    await expect(firstCell).toBeFocused();

    const focusVisual = await firstCell.evaluate((element) => ({
      focusVisible: element.matches(':focus-visible'),
      ring: getComputedStyle(element, '::before').boxShadow,
    }));
    expect(focusVisual.focusVisible).toBe(true);
    expect(focusVisual.ring).not.toBe('none');

    // 进入表格后，正向 Tab 应能到达同表格的排序 / 筛选 / 搜索按钮。
    const reachedHeader: boolean[] = [];
    for (let index = 0; index < 8; index += 1) {
      await page.keyboard.press('Tab');
      const info = await focusedInfo(page);
      reachedHeader.push(Boolean(info?.insidePipelineThead));
    }
    expect(reachedHeader, '正向 Tab 从单元格离开后应能到达同一表格的表头操作控件').toContain(true);
  });

  test('Shift+Tab 可从首格回到表头，Tab 可离开表格', async ({ page }) => {
    await openFixture(page, 'core');
    const pipeline = page.getByTestId('pipeline-table');
    const firstCell = pipeline.locator('tbody td[data-column-id][tabindex]').first();

    await page.getByTestId('clear-pipeline').focus();
    await page.keyboard.press('Tab');
    await expect(firstCell).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    const backward = await focusedInfo(page);
    expect(backward?.insidePipelineThead, 'Shift+Tab 应回到表头').toBe(true);

    await firstCell.focus();
    let info: FocusInfo | null = await focusedInfo(page);
    for (let index = 0; index < 20 && info?.insidePipeline; index += 1) {
      await page.keyboard.press('Tab');
      info = await focusedInfo(page);
    }
    expect(info?.insidePipeline, '持续 Tab 应能离开表格').toBe(false);
  });
});

test.describe('方向键边界', () => {
  test('首末行/列与固定列的方向键边界', async ({ page }) => {
    await openFixture(page, 'interaction');
    const scope = page.getByTestId('range-context-table');

    const first = cellOf(scope, 0, 0);
    await first.focus();
    await page.keyboard.press('ArrowUp');
    await expect(first).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(first).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(cellOf(scope, 0, 1)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(cellOf(scope, 1, 1)).toBeFocused();

    // 左固定列 → 普通列；普通列 → 右固定列。
    await first.focus();
    await page.keyboard.press('ArrowRight');
    await expect(cellOf(scope, 0, 1)).toBeFocused();
    await cellOf(scope, 0, 2).focus();
    await page.keyboard.press('ArrowRight');
    await expect(cellOf(scope, 0, 3)).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(cellOf(scope, 0, 2)).toBeFocused();

    const last = cellOf(scope, 4, 3);
    await last.focus();
    await page.keyboard.press('ArrowDown');
    await expect(last).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(last).toBeFocused();
  });

  test('Home/End/PageUp/PageDown 未改变单元格焦点（未承诺支持）', async ({ page }) => {
    await openFixture(page, 'interaction');
    const scope = page.getByTestId('range-context-table');
    const cell = cellOf(scope, 2, 1);
    await cell.focus();
    const before = await focusedInfo(page);

    for (const key of ['Home', 'End', 'PageUp', 'PageDown']) {
      await page.keyboard.press(key);
      expect(await focusedInfo(page), `${key} 不应意外移动单元格焦点`).toMatchObject({
        rowIndex: before?.rowIndex,
        colIndex: before?.colIndex,
      });
    }
    test.info().annotations.push({
      type: 'info',
      description: '方向键以外的 Home/End/PageUp/PageDown 当前没有实现单元格导航。',
    });
  });

  test('纵向虚拟滚动时方向键可跨窗口移动焦点', async ({ page }) => {
    await openFixture(page, 'virtual');
    const scope = page.getByTestId('virtual-table');
    const firstCell = scope.locator('tbody td[data-column-id][tabindex]').first();
    await expect(firstCell).toBeAttached();

    const initialMax = await scope
      .locator('tbody tr.s-table-row')
      .evaluateAll((rows) =>
        Math.max(...rows.map((row) => Number((row as HTMLElement).dataset.rowIndex)))
      );

    await firstCell.focus();
    for (let index = 0; index < 40; index += 1) {
      await page.keyboard.press('ArrowDown');
    }
    const info = await focusedInfo(page);
    expect(Number(info?.rowIndex)).toBeGreaterThan(initialMax);
    await expect(
      scope.locator(
        `tbody td[data-row-index="${info?.rowIndex}"][data-col-index="${info?.colIndex}"]`
      )
    ).toBeFocused();
  });

  test('纵向虚拟滚动末行向下不越界', async ({ page }) => {
    await openFixture(page, 'virtual');
    const scope = page.getByTestId('virtual-table');
    await page.getByTestId('scroll-bottom').click();
    const lastCell = scope.locator('.s-table-row[data-row-key="20000"] td[data-column-id="id"]');
    await expect(lastCell).toBeVisible();
    await lastCell.focus();
    await page.keyboard.press('ArrowDown');
    await expect(lastCell).toBeFocused();
  });

  test('横向虚拟滚动窗口边缘方向键不应跳过整段中心列', async ({ page }) => {
    await openFixture(page, 'virtual');
    const scope = page.getByTestId('bidirectional-virtual-table');
    const container = scope.locator('.s-table-container');
    const firstRow = scope.locator('tbody tr.s-table-row').first();
    const metricCells = firstRow.locator('td[data-column-id^="metric-"]');

    await container.evaluate((element) => {
      element.scrollLeft = 4800;
      element.dispatchEvent(new Event('scroll'));
    });
    await expect
      .poll(async () =>
        metricCells.evaluateAll((cells) => Number((cells[0] as HTMLElement).dataset.colIndex))
      )
      .toBeGreaterThan(20);

    const firstMetric = metricCells.first();
    const firstCol = Number(await firstMetric.getAttribute('data-col-index'));
    await firstMetric.focus();
    await page.keyboard.press('ArrowLeft');
    const leftInfo = await focusedInfo(page);
    expect
      .soft(leftInfo?.colIndex, '窗口左缘 ArrowLeft 应落在相邻列而不是固定列')
      .toBe(String(firstCol - 1));

    const lastMetric = metricCells.last();
    const lastCol = Number(await lastMetric.getAttribute('data-col-index'));
    await lastMetric.focus();
    await page.keyboard.press('ArrowRight');
    const rightInfo = await focusedInfo(page);
    expect
      .soft(rightInfo?.colIndex, '窗口右缘 ArrowRight 应落在相邻列而不是固定列')
      .toBe(String(lastCol + 1));
  });
});

test.describe('框选键盘', () => {
  test('Ctrl+A 全选、Escape 清空', async ({ page }) => {
    await openFixture(page, 'interaction');
    const scope = page.getByTestId('range-context-table');
    const rangeValue = page.getByTestId('range-value');

    await cellOf(scope, 1, 1).focus();
    await page.keyboard.press('Control+A');
    await expect(page.getByTestId('range-value')).toHaveText(
      JSON.stringify({ startRow: 0, startCol: 0, endRow: 4, endCol: 3 })
    );
    await expect(scope.locator('.s-table-cell-range-selected')).toHaveCount(20);

    await page.keyboard.press('Escape');
    await expect(rangeValue).toHaveText('none');
    await expect(scope.locator('.s-table-cell-range-selected')).toHaveCount(0);
  });

  test('Shift+方向键扩展选区时同步 cell-range-change', async ({ page }) => {
    await openFixture(page, 'interaction');
    const scope = page.getByTestId('range-context-table');
    const rangeValue = page.getByTestId('range-value');

    await scope.locator('.s-table-row[data-row-key="1"] td[data-column-id="name"]').click();
    await expect(rangeValue).toHaveText(
      JSON.stringify({ startRow: 0, startCol: 1, endRow: 0, endCol: 1 })
    );

    await page.keyboard.press('Shift+ArrowDown');
    await expect(scope.locator('.s-table-cell-range-selected')).toHaveCount(2);
    await expect(rangeValue, 'Shift+方向键改变了框选范围，应派发 cellRangeChange').toHaveText(
      JSON.stringify({ startRow: 0, startCol: 1, endRow: 1, endCol: 1 })
    );
  });

  test('Ctrl+A 后 Ctrl+C 复制全部单元格', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', '仅 Chromium 提供真实剪贴板权限');
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await openFixture(page, 'interaction');
    const scope = page.getByTestId('range-context-table');

    await cellOf(scope, 0, 0).focus();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Control+C');

    const expected = [
      ['1', 'Person 1', 'Engineering', '90'],
      ['2', 'Person 2', 'Design', '87'],
      ['3', 'Person 3', 'Sales', '84'],
      ['4', 'Person 4', 'Engineering', '81'],
      ['5', 'Person 5', 'Design', '78'],
    ]
      .map((row) => row.join('\t'))
      .join('\n');
    await expect
      .poll(async () =>
        (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')
      )
      .toBe(expected);
  });

  test('row 模式点击整行、Ctrl+A 与 Escape', async ({ page }) => {
    await page.goto('/agent-row-mode.html', { waitUntil: 'commit' });
    const scope = page.getByTestId('agent-row-mode-table');
    const rangeValue = page.getByTestId('agent-range-value');

    await scope.locator('.s-table-row[data-row-key="2"] td[data-column-id="name"]').click();
    await expect(rangeValue).toHaveText(
      JSON.stringify({ startRow: 1, startCol: 0, endRow: 1, endCol: 2 })
    );
    await expect(scope.locator('.s-table-cell-range-selected')).toHaveCount(3);

    await cellOf(scope, 0, 0).focus();
    await page.keyboard.press('Control+A');
    await expect(scope.locator('.s-table-cell-range-selected')).toHaveCount(9);
    await page.keyboard.press('Escape');
    await expect(scope.locator('.s-table-cell-range-selected')).toHaveCount(0);
    await expect(rangeValue).toHaveText('none');
  });
});

test.describe('菜单与浮层键盘', () => {
  test('菜单筛选：Enter 打开、Space 选择、Escape/确认后焦点归还', async ({ page }) => {
    await openFixture(page, 'round2');
    const scope = page.getByTestId('menu-filter-table');
    const trigger = scope.locator('.s-table-filter-trigger');

    await trigger.focus();
    await trigger.press('Enter');
    const panel = page.locator('.s-table-filter-dropdown');
    await expect(panel).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const firstOption = panel.locator('.s-table-filter-dropdown-menu-item input').first();
    await expect(firstOption).toBeFocused();
    await expect(firstOption).toHaveAttribute('type', 'radio');
    await expect(firstOption).not.toBeChecked();

    await page.keyboard.press('Space');
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(renderedRows(scope)).toHaveCount(2);
  });

  test('选择菜单支持 Home/End 且关闭后归还焦点', async ({ page }) => {
    await openFixture(page, 'interaction');
    const scope = page.getByTestId('selection-expand-table');
    const trigger = scope.locator('.s-table-selection-dropdown-trigger');
    const menu = page.locator('.s-table-selection-dropdown-menu');
    const items = menu.locator('.s-table-selection-dropdown-item');

    await trigger.focus();
    await trigger.press('Enter');
    await expect(menu).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(items.first()).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(items.nth(1)).toBeFocused();
    await page.keyboard.press('End');
    await expect(items.last()).toBeFocused();
    await page.keyboard.press('Home');
    await expect(items.first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('表头菜单按钮应有可访问名称', async ({ page }) => {
    await openFixture(page, 'round3');
    const trigger = page.getByTestId('header-menu-table').locator('.s-table-header-menu-trigger');
    await expect(trigger).toHaveAccessibleName(/.+/);
  });

  test('右键菜单：Escape 关闭后焦点应回到触发单元格', async ({ page }) => {
    await openFixture(page, 'interaction');
    const scope = page.getByTestId('range-context-table');
    const cell = scope.locator('.s-table-row[data-row-key="3"] td[data-column-id="name"]');
    const menu = page.locator('.s-table-context-menu');

    await cell.focus();
    await cell.click({ button: 'right' });
    await expect(menu).toBeVisible();
    await expect(menu.getByTestId('context-confirm')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    const info = await focusedInfo(page);
    expect(info?.columnId, 'Escape 关闭右键菜单后焦点应回到触发单元格').toBe('name');
    expect(info?.rowKey).toBe('3');
  });

  test('Shift+F10 可在聚焦单元格上打开右键菜单', async ({ page }) => {
    await openFixture(page, 'interaction');
    const scope = page.getByTestId('range-context-table');
    const cell = scope.locator('.s-table-row[data-row-key="2"] td[data-column-id="name"]');
    const menu = page.locator('.s-table-context-menu');

    await cell.focus();
    await page.keyboard.press('Shift+F10');
    await expect(menu).toBeVisible();
    await expect(menu.locator('.s-table-context-menu-item').first()).toBeFocused();
  });
});

test.describe('ARIA 状态', () => {
  test('分页 aria-current、disabled 与快速跳转', async ({ page }) => {
    await openFixture(page, 'core');
    const table = page.getByTestId('pagination-table');
    const pagination = table.locator('.s-pagination');
    const prev = pagination.locator('.s-pagination-prev');
    const next = pagination.locator('.s-pagination-next');
    const active = pagination.locator('.s-pagination-item-active');

    await expect(pagination).toHaveAttribute('aria-label', /.+/);
    await expect(active).toHaveAttribute('aria-current', 'page');
    await expect(prev).toBeDisabled();
    await expect(prev).toHaveClass(/s-pagination-item-disabled/);
    await expect(next).toBeEnabled();

    await next.focus();
    await page.keyboard.press('Enter');
    await expect(active).toHaveText('2');
    await expect(active).toHaveAttribute('aria-current', 'page');
    await expect(prev).toBeEnabled();

    const jumper = pagination.locator('.s-pagination-quick-jumper-input');
    await expect(jumper).toHaveAttribute('aria-label', /.+/);
    await jumper.focus();
    await jumper.fill('4');
    await jumper.press('Enter');
    await expect(active).toHaveText('4');
    await expect(next).toBeDisabled();
  });

  test('page size 下拉可用键盘操作并同步 aria-selected/aria-expanded', async ({ page }) => {
    await openFixture(page, 'core');
    const table = page.getByTestId('pagination-table');
    const trigger = table.locator('.s-pagination-size-changer .s-select-selector');
    const listbox = page.getByRole('listbox');

    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(listbox).toBeVisible();
    // 当前 pageSize=10：选中的是第 2 项，而不是列表第一项。
    await expect(listbox.locator('[role="option"][aria-selected="true"]')).toHaveText(/10/);

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
    await expect(table.locator('.s-pagination-size-changer .s-select-selection-item')).toHaveText(
      /20/
    );
    await expect(renderedRows(table)).toHaveCount(20);
  });

  test('radio 禁用状态与视觉 class 一致', async ({ page }) => {
    await openFixture(page, 'round2');
    const scope = page.getByTestId('radio-table');
    const disabledInput = scope.locator('.s-table-row[data-row-key="3"] input[type="radio"]');
    const disabledWrapper = scope.locator('.s-table-row[data-row-key="3"] .s-radio-wrapper');
    const selectedInput = scope.locator('.s-table-row[data-row-key="2"] input[type="radio"]');
    const selectedWrapper = scope.locator('.s-table-row[data-row-key="2"] .s-radio-wrapper');

    await expect(disabledInput).toBeDisabled();
    await expect(disabledWrapper).toHaveClass(/s-radio-wrapper-disabled/);
    await expect
      .poll(() => selectedInput.evaluate((input: HTMLInputElement) => input.checked))
      .toBe(true);
    await expect(selectedWrapper).toHaveClass(/s-radio-wrapper-checked/);
  });

  test('分组展开按钮的 aria-expanded/aria-label 与键盘操作', async ({ page }) => {
    await openFixture(page, 'round2');
    const scope = page.getByTestId('grouped-table');
    const trigger = scope
      .locator('.s-table-row-grouped')
      .first()
      .locator('.s-table-expand-trigger');

    await expect(trigger).toHaveAttribute('aria-label', /.+/);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await trigger.focus();
    await page.keyboard.press('Space');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(scope.locator('.s-table-row')).toHaveCount(7);
  });

  test('固定行可聚焦单元格与方向键进入', async ({ page }) => {
    await openFixture(page, 'round2');
    const scope = page.getByTestId('pinned-row-table');

    await expect(scope.locator('.s-table-row-pinned [tabindex="0"]')).toHaveCount(0);
    await expect(
      scope.locator('.s-table-row-pinned td[data-column-id="name"][tabindex="-1"]')
    ).toHaveCount(2);

    const firstCenterCell = scope
      .locator('tbody tr.s-table-row:not(.s-table-row-pinned)')
      .first()
      .locator('td[data-column-id="name"]');
    await firstCenterCell.focus();
    await page.keyboard.press('ArrowUp');
    const info = await focusedInfo(page);
    expect(info?.rowKey, '向上方向键应进入顶部固定行').toBe('2');
  });
});

test.describe('编辑焦点', () => {
  test('单元格编辑 Enter 提交后焦点应回到单元格', async ({ page }) => {
    await openFixture(page, 'advanced');
    const scope = page.getByTestId('editing-table');
    const cell = scope.locator('.s-table-row[data-row-key="1"] td[data-column-id="name"]');

    await cell.dblclick();
    const editor = cell.locator('input.s-table-cell-editor');
    await expect(editor).toBeFocused();
    await editor.fill('Ada Agent');
    await editor.press('Enter');
    await expect(cell).toContainText('Ada Agent');
    await expect(cell, '提交后焦点应回到刚刚编辑的单元格').toBeFocused();
  });

  test('行编辑 Tab 移动编辑器，Enter/Escape 后焦点应恢复', async ({ page }) => {
    await openFixture(page, 'round2');
    const scope = page.getByTestId('row-edit-table');
    const row = scope.locator('.s-table-row[data-row-key="1"]');
    const nameCell = row.locator('td[data-column-id="name"]');

    await row.dblclick();
    const editors = row.locator('input.s-table-cell-editor');
    await expect(editors).toHaveCount(2);
    await expect(editors.first()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(editors.nth(1)).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(editors.first()).toBeFocused();

    await editors.first().fill('Ada Tab');
    await editors.first().press('Enter');
    await expect(row).toContainText('Ada Tab');
    expect
      .soft(await nameCell.evaluate((element) => element === document.activeElement))
      .toBe(true);

    await row.dblclick();
    const cancelEditor = row.locator('input.s-table-cell-editor').first();
    await expect(cancelEditor).toBeFocused();
    await cancelEditor.fill('Discarded');
    await cancelEditor.press('Escape');
    await expect(row).not.toContainText('Discarded');
    expect
      .soft(await nameCell.evaluate((element) => element === document.activeElement))
      .toBe(true);
  });
});

test.describe('Tooltip 键盘可达性', () => {
  test('溢出单元格 Tooltip 需要同时在键盘聚焦时显示', async ({ page }) => {
    await openFixture(page, 'round3');
    const scope = page.getByTestId('tooltip-table');
    const cell = scope.locator('.s-table-row[data-row-key="4"] td[data-column-id="name"]');
    const tooltip = page.locator('.s-table-tooltip');

    await cell.hover();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveText('Row 4 with a long display name');

    await page.locator('h2', { hasText: 'Ellipsis and tooltip' }).hover();
    await expect(tooltip).toHaveCount(0);
    await cell.focus();
    await expect(tooltip, '键盘聚焦溢出单元格时也应显示相同 Tooltip').toBeVisible();
  });
});

test.describe('分页简洁模式', () => {
  test('简洁分页按钮具备 aria-label 且可用键盘翻页', async ({ page }) => {
    await openFixture(page, 'round3');
    const scope = page.getByTestId('simple-pagination-table');
    const pagination = scope.locator('.s-pagination');
    const pager = pagination.locator('.s-pagination-simple-pager');
    const next = pagination.locator('.s-pagination-next');

    await expect(pagination).toHaveAttribute('aria-label', /.+/);
    await expect(pager).toHaveText(/1\s*\/\s*3/);
    await expect(next).toHaveAttribute('aria-label', /.+/);
    await next.focus();
    await page.keyboard.press('Enter');
    await expect(pager).toHaveText(/2\s*\/\s*3/);
    await expect(renderedRows(scope).first()).toHaveAttribute('data-row-key', '6');
    await expect(pagination.locator('.s-pagination-prev')).toBeEnabled();
  });
});
