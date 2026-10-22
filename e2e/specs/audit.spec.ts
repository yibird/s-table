import { expect, openFixture, test } from '../support/test';
import { publicRowKeys, renderedRows } from '../support/table';

/**
 * 审计用例：覆盖现有回归用例没有涉及的边界与视觉行为。
 * 失败即代表一份可复现的问题记录（见 TEST_REPORT.md）。
 */

test.describe('审计：分页边界', () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page, 'core');
  });

  test('快速跳页输入越界值会被钳制在合法页码内', async ({ page }) => {
    const table = page.getByTestId('pagination-table');
    const pagination = table.locator('.s-pagination');
    const jumper = pagination.locator('.s-pagination-quick-jumper-input');

    await pagination.locator('.s-pagination-next').click();
    await expect(pagination.locator('.s-pagination-item-active')).toHaveText('2');

    await jumper.fill('999');
    await jumper.press('Enter');
    await expect(pagination.locator('.s-pagination-item-active')).toHaveText('4');
    await expect(renderedRows(table).first()).toHaveAttribute('data-row-key', '31');

    await jumper.fill('0');
    await jumper.press('Enter');
    await expect(pagination.locator('.s-pagination-item-active')).toHaveText('1');
    await expect(renderedRows(table).first()).toHaveAttribute('data-row-key', '1');

    await jumper.fill('abc');
    await jumper.press('Enter');
    await expect(pagination.locator('.s-pagination-item-active')).toHaveText('1');
  });

  test('末页切换 page size 后当前页和行范围仍然合法', async ({ page }) => {
    const table = page.getByTestId('pagination-table');
    const pagination = table.locator('.s-pagination');

    await pagination.locator('.s-pagination-item', { hasText: '4' }).click();
    await expect(renderedRows(table)).toHaveCount(2);

    await pagination.locator('.s-select-selector').click();
    await page.locator('.s-select-dropdown .s-select-item-option', { hasText: '5 条/页' }).click();

    await expect(renderedRows(table)).toHaveCount(5);
    // pageIndex 仍为 3，未越过新的总页数（7），因此停留在第 4 页。
    await expect(pagination.locator('.s-pagination-item-active')).toHaveText('4');
    await expect(pagination.locator('.s-pagination-total-text')).toHaveText('16-20 / 32');
  });
});

test.describe('审计：分页与筛选/选择组合', () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page, 'core');
  });

  test('翻页后筛选和排序都会回到第一页', async ({ page }) => {
    const table = page.getByTestId('combined-table');
    const pagination = table.locator('.s-pagination');

    await pagination.locator('.s-pagination-item', { hasText: '5' }).click();
    await expect(renderedRows(table)).toHaveCount(5);
    await expect(renderedRows(table).first()).toHaveAttribute('data-row-key', '41');

    await table.locator('th[data-column-id="department"] .s-table-filter-trigger').click();
    await page
      .locator('.s-table-filter-dropdown')
      .locator('.s-table-filter-dropdown-menu-item', { hasText: 'Engineering' })
      .click();
    await page.locator('.s-table-filter-dropdown-btn-confirm').click();
    await expect(pagination.locator('.s-pagination-item-active')).toHaveText('1');
    await expect(renderedRows(table).first()).toHaveAttribute('data-row-key', '1');

    await pagination.locator('.s-pagination-item', { hasText: '2' }).click();
    await table.locator('th[data-column-id="score"] .s-table-cell-title').click();
    await expect(pagination.locator('.s-pagination-item-active')).toHaveText('1');
    await expect(table.locator('th[data-column-id="score"]')).toHaveAttribute(
      'aria-sort',
      'ascending'
    );
  });

  test('筛选结果为空时页码与范围保持合法', async ({ page }) => {
    const table = page.getByTestId('combined-table');
    const pagination = table.locator('.s-pagination');

    await pagination.locator('.s-pagination-item', { hasText: '3' }).click();
    const searchTrigger = table.locator('th[data-column-id="name"] .s-table-search-trigger');
    await searchTrigger.click();
    const input = page.locator('.s-table-search-input');
    await input.fill('no-such-row');
    await input.press('Enter');

    await expect(renderedRows(table)).toHaveCount(0);
    // 空结果时分页器整体隐藏（total > 0 才渲染），不会留下非法页码。
    await expect(pagination).toHaveCount(0);

    await searchTrigger.click();
    await page.locator('.s-table-search-dropdown-btn-reset').click();
    await expect(renderedRows(table)).toHaveCount(10);
    await expect(pagination.locator('.s-pagination-item-active')).toHaveText('1');
  });

  test('选择当前页只选中本页，跨页保留选择', async ({ page }) => {
    const table = page.getByTestId('combined-table');
    const pagination = table.locator('.s-pagination');
    const selected = page.getByTestId('combined-selected');

    await table.locator('thead .s-table-selection-dropdown-trigger').click();
    await page.locator('.s-table-selection-dropdown-item', { hasText: '选择当前页' }).click();
    await expect(selected).toHaveText('1,2,3,4,5,6,7,8,9,10');

    await pagination.locator('.s-pagination-next').click();
    await expect(selected).toHaveText('1,2,3,4,5,6,7,8,9,10');
    await expect(table.locator('.s-table-row[data-row-key="11"]')).not.toHaveClass(
      /s-table-row-selected/
    );
  });
});

test.describe('审计：选择菜单与表头状态', () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page, 'interaction');
  });

  test('选择奇数行 / 偶数行 / 当前页操作忽略禁用行', async ({ page }) => {
    const scope = page.getByTestId('selection-expand-table');
    const trigger = scope.locator('.s-table-selection-dropdown-trigger');

    await trigger.click();
    await page.locator('.s-table-selection-dropdown-item', { hasText: '选择奇数行' }).click();
    await expect(page.getByTestId('selected-keys')).toHaveText('1,5');

    await trigger.click();
    await page.locator('.s-table-selection-dropdown-item', { hasText: '选择偶数行' }).click();
    await expect(page.getByTestId('selected-keys')).toHaveText('2,4');

    await page.getByTestId('api-clear-selection').click();
    await trigger.click();
    await page.locator('.s-table-selection-dropdown-item', { hasText: '选择当前页' }).click();
    await expect(page.getByTestId('selected-keys')).toHaveText('1,2,4,5');
  });

  test('部分选中时表头复选框为 indeterminate，清空后恢复', async ({ page }) => {
    const scope = page.getByTestId('selection-expand-table');
    const headerCheckbox = scope.locator('thead .s-checkbox-wrapper');
    const headerInput = headerCheckbox.locator('input[type="checkbox"]');

    await expect(headerCheckbox).toHaveClass(/s-checkbox-wrapper-indeterminate/);
    expect(await headerInput.evaluate((input: HTMLInputElement) => input.indeterminate)).toBe(true);

    await scope.locator('.s-table-row[data-row-key="2"] .s-checkbox-wrapper').click();
    await expect(page.getByTestId('selected-keys')).toBeEmpty();
    await expect(headerCheckbox).not.toHaveClass(
      /s-checkbox-wrapper-indeterminate|s-checkbox-wrapper-checked/
    );
    expect(await headerInput.evaluate((input: HTMLInputElement) => input.indeterminate)).toBe(
      false
    );
  });

  test('复选框原生 checked 状态与受控选择同步', async ({ page }) => {
    const scope = page.getByTestId('selection-expand-table');
    const row1Input = scope.locator('.s-table-row[data-row-key="1"] input[type="checkbox"]');

    await scope.locator('.s-table-row[data-row-key="1"] .s-checkbox-wrapper').click();
    await expect(page.getByTestId('selected-keys')).toHaveText('1,2');
    await expect
      .poll(() => row1Input.evaluate((input: HTMLInputElement) => input.checked))
      .toBe(true);

    const headerInput = scope.locator('thead input[type="checkbox"]');
    await expect
      .poll(() => headerInput.evaluate((input: HTMLInputElement) => input.indeterminate))
      .toBe(true);

    // 清空后原生状态同样复位。
    await page.getByTestId('api-clear-selection').click();
    await expect
      .poll(() => row1Input.evaluate((input: HTMLInputElement) => input.checked))
      .toBe(false);
  });

  test('表头全选复选框可用 Space 键切换', async ({ page }) => {
    const scope = page.getByTestId('selection-expand-table');
    const headerInput = scope.locator('thead .s-checkbox-input');

    await headerInput.focus();
    await page.keyboard.press('Space');
    await expect(page.getByTestId('selected-keys')).toHaveText('1,2,4,5');
    await page.keyboard.press('Space');
    await expect(page.getByTestId('selected-keys')).toBeEmpty();
  });
});

test.describe('审计：编辑与树形', () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page, 'advanced');
  });

  test('双击进入编辑，Enter 提交且 Escape 取消', async ({ page }) => {
    const scope = page.getByTestId('editing-table');
    const cell = scope.locator('.s-table-row[data-row-key="1"] td').nth(1);

    await cell.dblclick();
    const input = cell.locator('input.s-table-cell-editor');
    await expect(input).toBeFocused();
    await input.fill('Ada Lovelace');
    await input.press('Enter');

    await expect(cell).toContainText('Ada Lovelace');
    await expect(page.getByTestId('edit-event')).toContainText('1:Ada Lovelace');

    await cell.dblclick();
    const cancelInput = cell.locator('input.s-table-cell-editor');
    await cancelInput.fill('Discarded');
    await cancelInput.press('Escape');
    await expect(cell).toContainText('Ada Lovelace');
    await expect(page.getByTestId('edit-event')).not.toContainText('Discarded');
  });

  test('树形默认展开、可折叠且展开状态与行渲染同步', async ({ page }) => {
    const scope = page.getByTestId('tree-event-table');
    const platform = scope.locator('.s-table-row[data-row-key="10"]');

    await expect(scope.locator('.s-table-row')).toHaveCount(4);
    await expect(platform.locator('.s-table-expand-trigger')).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    await platform.locator('.s-table-expand-trigger').click();
    await expect(scope.locator('.s-table-row')).toHaveCount(2);
    await expect(scope.locator('.s-table-row[data-row-key="11"]')).toHaveCount(0);

    await platform.locator('.s-table-expand-trigger').click();
    await expect(scope.locator('.s-table-row')).toHaveCount(4);
  });
});

test.describe('审计：列宽与行拖拽', () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page, 'interaction');
  });

  test('列宽鼠标拖拽和键盘调整都受 min/max 约束', async ({ page }) => {
    const scope = page.getByTestId('drag-resize-table');
    const idHeader = scope.locator('th[data-column-id="id"]');
    const handle = idHeader.getByRole('separator');

    await handle.focus();
    for (let index = 0; index < 20; index += 1) await handle.press('ArrowLeft');
    await expect(handle).toHaveAttribute('aria-valuenow', '70');

    for (let index = 0; index < 30; index += 1) await handle.press('ArrowRight');
    await expect(handle).toHaveAttribute('aria-valuenow', '180');

    await handle.hover();
    const box = await handle.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 - 300, box!.y + box!.height / 2, { steps: 5 });
    await page.mouse.up();
    await expect(handle).toHaveAttribute('aria-valuenow', '70');
  });

  test('多选拖拽将选中行作为整块移动且整块高亮', async ({ page }) => {
    const scope = page.getByTestId('multi-drag-table');
    const source = scope.locator('.s-table-row[data-row-key="1"] .s-table-drag-handle');
    const middle = scope.locator('.s-table-row[data-row-key="3"]');
    const target = scope.locator('.s-table-row[data-row-key="5"]');
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());

    await source.dispatchEvent('dragstart', { dataTransfer });
    await expect(scope.locator('.s-table-row-drag-source')).toHaveCount(2);
    await expect(scope.locator('.s-table-row[data-row-key="1"]')).toHaveClass(
      /s-table-row-drag-source/
    );
    await expect(scope.locator('.s-table-row[data-row-key="3"]')).toHaveClass(
      /s-table-row-drag-source/
    );

    await middle.scrollIntoViewIfNeeded();
    const middleBox = await middle.boundingBox();
    // 经过拖拽块内部时没有合法落点，不应出现目标高亮。
    await middle.dispatchEvent('dragover', {
      dataTransfer,
      clientY: middleBox!.y + middleBox!.height / 2,
    });
    await expect(scope.locator('.s-table-row-drag-over')).toHaveCount(0);

    const targetBox = await target.boundingBox();
    await target.dispatchEvent('dragover', {
      dataTransfer,
      clientY: targetBox!.y + 2,
    });
    await target.dispatchEvent('drop', { dataTransfer });

    await expect(page.getByTestId('multi-drag-event')).toHaveText('0,2->4:before');
    await expect.poll(() => publicRowKeys(scope)).toEqual(['2', '4', '1', '3', '5']);
    await expect(page.getByTestId('multi-drag-selected')).toHaveText('1,3');
  });

  test('拖拽经过源行自身时不显示投放目标高亮', async ({ page }) => {
    const scope = page.getByTestId('drag-resize-table');
    const source = scope.locator('.s-table-row[data-row-key="1"]');
    const handle = source.locator('.s-table-drag-handle');
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());

    await handle.dispatchEvent('dragstart', { dataTransfer });
    await source.dispatchEvent('dragover', { dataTransfer });
    await expect(source).not.toHaveClass(/s-table-row-drag-over/);

    const target = scope.locator('.s-table-row[data-row-key="3"]');
    await target.dispatchEvent('dragover', { dataTransfer });
    await expect(target).toHaveClass(/s-table-row-drag-over/);
    await expect(source).not.toHaveClass(/s-table-row-drag-over/);
    await target.dispatchEvent('drop', { dataTransfer });
  });
});

test.describe('审计：虚拟滚动与视觉对齐', () => {
  test('虚拟滚动到底部时最后一行完整可见', async ({ page }) => {
    await openFixture(page, 'virtual');
    const scope = page.getByTestId('virtual-table');
    const container = scope.locator('.s-table-container');

    await page.getByTestId('scroll-bottom').click();
    const last = scope.locator('.s-table-row').filter({ hasText: 'Virtual 20000' });
    await expect(last).toHaveCount(1);

    const metrics = await container.evaluate((element) => {
      const row = element.querySelector('.s-table-row:last-of-type');
      const box = row?.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      return {
        rowBottom: box?.bottom ?? 0,
        containerBottom: rect.bottom,
        scrollTop: element.scrollTop,
        maxScrollTop: element.scrollHeight - element.clientHeight,
      };
    });
    expect(metrics.rowBottom).toBeLessThanOrEqual(metrics.containerBottom + 1);
    expect(metrics.maxScrollTop - metrics.scrollTop).toBeLessThanOrEqual(1);
  });

  test('虚拟表格首屏所有可视列的表头与单元格水平对齐', async ({ page }) => {
    await openFixture(page, 'virtual');
    const scope = page.getByTestId('virtual-table');

    const misaligned = await scope.evaluate((element) => {
      const headerCells = Array.from(element.querySelectorAll('thead th[data-column-id]'));
      const row = element.querySelector('tbody .s-table-row');
      const bodyCells = Array.from(row?.querySelectorAll('td[data-column-id]') ?? []);
      return headerCells
        .map((headerCell, index) => {
          const bodyCell = bodyCells[index];
          if (!bodyCell) return null;
          const header = headerCell.getBoundingClientRect();
          const body = bodyCell.getBoundingClientRect();
          return {
            columnId: (headerCell as HTMLElement).dataset.columnId,
            deltaLeft: Math.round((header.left - body.left) * 100) / 100,
            deltaWidth: Math.round((header.width - body.width) * 100) / 100,
          };
        })
        .filter(
          (entry): entry is NonNullable<typeof entry> =>
            entry !== null && (Math.abs(entry.deltaLeft) > 0.5 || Math.abs(entry.deltaWidth) > 0.5)
        );
    });
    expect(misaligned).toEqual([]);
  });
});

test.describe('审计：筛选与搜索浮层', () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page, 'core');
  });

  test('点击浮层外部会关闭筛选面板并清除临时勾选', async ({ page }) => {
    const scope = page.getByTestId('pipeline-table');
    const trigger = scope.locator('th[data-column-id="department"] .s-table-filter-trigger');

    await trigger.click();
    const panel = page.locator('.s-table-filter-dropdown');
    await expect(panel).toBeVisible();
    await panel.locator('.s-table-filter-dropdown-menu-item', { hasText: 'Engineering' }).click();

    await page.getByRole('heading', { name: 'Sort, filter and search pipeline' }).click();
    await expect(panel).toBeHidden();
    await expect(renderedRows(scope)).toHaveCount(12);

    await trigger.click();
    await expect(
      panel.locator('.s-table-filter-dropdown-menu-item', { hasText: 'Engineering' })
    ).not.toHaveClass(/s-table-filter-dropdown-menu-item-selected/);
  });

  test('筛选与排序可以叠加并保持 aria-sort', async ({ page }) => {
    const scope = page.getByTestId('pipeline-table');
    const departmentHeader = scope.locator('th[data-column-id="department"]');
    const scoreHeader = scope.locator('th[data-column-id="score"]');

    await departmentHeader.locator('.s-table-filter-trigger').click();
    await page
      .locator('.s-table-filter-dropdown')
      .locator('.s-table-filter-dropdown-menu-item', { hasText: 'Engineering' })
      .click();
    await page.locator('.s-table-filter-dropdown-btn-confirm').click();
    await expect(renderedRows(scope)).toHaveCount(3);

    await scoreHeader.locator('.s-table-cell-title').click();
    await expect(scoreHeader).toHaveAttribute('aria-sort', 'ascending');
    await expect.poll(() => publicRowKeys(scope)).toEqual(['9', '5', '1']);
  });
});

test.describe('审计：浮层键盘可达性', () => {
  test('键盘打开过滤面板后焦点进入面板，Escape 返回触发器', async ({ page }) => {
    await openFixture(page, 'core');
    const scope = page.getByTestId('pipeline-table');
    const trigger = scope.locator('th[data-column-id="department"] .s-table-filter-trigger');

    await trigger.focus();
    await trigger.press('Enter');
    const panel = page.locator('.s-table-filter-dropdown');
    await expect(panel).toBeVisible();
    const firstOption = panel.locator('.s-table-filter-dropdown-menu-item input').first();
    await expect(firstOption).toBeFocused();

    await firstOption.press('Escape');
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('键盘打开选择菜单后焦点进入菜单，Escape 关闭并返回触发器', async ({ page }) => {
    await openFixture(page, 'interaction');
    const scope = page.getByTestId('selection-expand-table');
    const trigger = scope.locator('.s-table-selection-dropdown-trigger');

    await trigger.focus();
    await trigger.press('Enter');
    const menu = page.locator('.s-table-selection-dropdown-menu');
    await expect(menu).toBeVisible();
    await expect(menu.locator('.s-table-selection-dropdown-item').first()).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(menu.locator('.s-table-selection-dropdown-item').nth(1)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('键盘确认筛选/搜索/选择操作后焦点回到触发器', async ({ page }) => {
    await openFixture(page, 'core');
    const scope = page.getByTestId('pipeline-table');
    const filterTrigger = scope.locator('th[data-column-id="department"] .s-table-filter-trigger');
    await filterTrigger.focus();
    await filterTrigger.press('Enter');
    const filterPanel = page.locator('.s-table-filter-dropdown');
    await filterPanel.locator('.s-table-filter-dropdown-btn-confirm').focus();
    await page.keyboard.press('Enter');
    await expect(filterPanel).toBeHidden();
    await expect(filterTrigger).toBeFocused();

    const searchTrigger = scope.locator('th[data-column-id="name"] .s-table-search-trigger');
    await searchTrigger.focus();
    await searchTrigger.press('Enter');
    const searchInput = page.locator('.s-table-search-input');
    await expect(searchInput).toBeFocused();
    await searchInput.fill('User 01');
    await searchInput.press('Enter');
    await expect(page.locator('.s-table-search-dropdown')).toBeHidden();
    await expect(searchTrigger).toBeFocused();
  });
});

test.describe('审计：响应式与固定列', () => {
  for (const fixture of ['core', 'interaction', 'virtual', 'advanced']) {
    test(`${fixture} fixture 在窄视口下不产生页面横向溢出`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await openFixture(page, fixture);
      const metrics = await page.evaluate(() => ({
        bodyScrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        overflowElements: Array.from(document.querySelectorAll<HTMLElement>('body *'))
          .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
          .slice(0, 5)
          .map((element) => ({
            tag: element.tagName,
            className: element.className,
            right: Math.round(element.getBoundingClientRect().right),
          })),
      }));
      expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    });
  }

  test('横向滚动时左右固定列保持贴边且表头表体同步', async ({ page }) => {
    await openFixture(page, 'virtual');
    const scope = page.getByTestId('bidirectional-virtual-table');
    const container = scope.locator('.s-table-container');
    await expect(scope.locator('.s-table-row').first()).toBeAttached();

    await container.evaluate((element) => {
      element.scrollLeft = 1200;
      element.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(150);

    const metrics = await container.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const leftFixed = Array.from(
        element.querySelectorAll<HTMLElement>('tbody td[data-column-id="id"]')
      )[0];
      const rightFixed = Array.from(
        element.querySelectorAll<HTMLElement>('tbody td[data-column-id="tail"]')
      )[0];
      const headerFixed = element.querySelector<HTMLElement>('thead th[data-column-id="id"]');
      return {
        leftFixedX: leftFixed?.getBoundingClientRect().left ?? 0,
        headerFixedX: headerFixed?.getBoundingClientRect().left ?? 0,
        rightFixedRight: rightFixed?.getBoundingClientRect().right ?? 0,
        containerLeft: rect.left,
        containerRight: rect.right,
        scrollLeft: element.scrollLeft,
      };
    });
    expect(metrics.scrollLeft).toBeGreaterThan(0);
    expect(Math.abs(metrics.leftFixedX - metrics.containerLeft)).toBeLessThanOrEqual(1);
    expect(Math.abs(metrics.headerFixedX - metrics.containerLeft)).toBeLessThanOrEqual(1);
    expect(Math.abs(metrics.rightFixedRight - metrics.containerRight)).toBeLessThanOrEqual(2);
  });
});

test.describe('审计：视觉可用性回归', () => {
  test('窄视口下未设宽列保持可读宽度并触发内部横向滚动', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openFixture(page, 'interaction');
    const scope = page.getByTestId('selection-expand-table');
    await expect(scope.locator('.s-table-row').first()).toBeAttached();

    const metrics = await scope.evaluate((element) => {
      const row = element.querySelector<HTMLElement>('.s-table-row')!;
      const container = element.querySelector<HTMLElement>('.s-table-container')!;
      const cells = ['name', 'department'].map((columnId) => {
        const cell = row.querySelector<HTMLElement>(`td[data-column-id="${columnId}"]`)!;
        const rect = cell.getBoundingClientRect();
        const style = getComputedStyle(cell);
        return {
          width: rect.width,
          contentWidth:
            rect.width -
            Number.parseFloat(style.paddingLeft) -
            Number.parseFloat(style.paddingRight),
        };
      });
      return {
        cells,
        rowHeight: row.getBoundingClientRect().height,
        scrollWidth: container.scrollWidth,
        clientWidth: container.clientWidth,
        bodyScrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });

    for (const cell of metrics.cells) {
      expect(cell.width).toBeGreaterThanOrEqual(95);
      expect(cell.contentWidth).toBeGreaterThanOrEqual(60);
    }
    expect(metrics.rowHeight).toBeLessThan(120);
    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  });

  test('暗色分页激活文字达到 WCAG AA 对比度', async ({ page }) => {
    await openFixture(page, 'core');
    await page.locator('html').evaluate((element) => element.classList.add('dark'));
    const active = page.getByTestId('pagination-table').locator('.s-pagination-item-active');

    const ratio = await active.evaluate((element) => {
      const parse = (color: string) =>
        color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number);
      const luminance = (rgb: number[]) => {
        const [r, g, b] = rgb.map((value) => {
          const normalized = value / 255;
          return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
      };
      const style = getComputedStyle(element);
      const foreground = parse(style.color);
      const background = parse(style.backgroundColor);
      const lighter = Math.max(luminance(foreground), luminance(background));
      const darker = Math.min(luminance(foreground), luminance(background));
      return (lighter + 0.05) / (darker + 0.05);
    });
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

test.describe('审计：视觉截图', () => {
  test('采集核心与交互 fixture 的桌面与暗色截图', async ({ page }, testInfo) => {
    await openFixture(page, 'core');
    await expect(page.getByTestId('pipeline-table')).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('core-light.png'),
      fullPage: true,
    });

    await page.locator('html').evaluate((element) => element.classList.add('dark'));
    await page.screenshot({
      path: testInfo.outputPath('core-dark.png'),
      fullPage: true,
    });
  });
});
