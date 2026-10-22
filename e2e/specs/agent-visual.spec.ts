import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

/**
 * 视觉审计专用 spec：截图 + 几何 / computed style 证据收集。
 * 不修改任何产品代码，只在失败或可疑时输出数值证据。
 */

const OUT = path.resolve(process.cwd(), 'test-results', 'agent-visual');
mkdirSync(OUT, { recursive: true });

const FIXTURES = ['core', 'interaction', 'virtual', 'advanced', 'round2', 'round3'] as const;

type FixtureName = (typeof FIXTURES)[number];

const openFixture = async (page: Page, fixture: FixtureName): Promise<void> => {
  await page.goto(`/?fixture=${fixture}`, { waitUntil: 'commit' });
  await expect(page.locator('.s-table').first()).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(400);
};

const setViewport = async (page: Page, width: number, height: number): Promise<void> => {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(300);
};

const setDark = async (page: Page, dark: boolean): Promise<void> => {
  await page.evaluate((enabled) => {
    document.documentElement.classList.toggle('dark', enabled);
  }, dark);
  await page.waitForTimeout(250);
};

const shot = async (
  page: Page,
  name: string,
  options: { fullPage?: boolean; clipSelector?: string } = {}
): Promise<string> => {
  const target = path.join(OUT, name);
  if (options.clipSelector) {
    const locator = page.locator(options.clipSelector).first();
    await locator.screenshot({ path: target, animations: 'disabled' });
  } else {
    await page.screenshot({
      path: target,
      fullPage: options.fullPage ?? true,
      animations: 'disabled',
    });
  }
  return target;
};

const attachJson = async (testInfo: TestInfo, name: string, value: unknown): Promise<void> => {
  await testInfo.attach(name, {
    body: Buffer.from(JSON.stringify(value, null, 2)),
    contentType: 'application/json',
  });
};

// ────────────────────────────────────────────────────────────────────────────
// 1. 六夹具 × 1280 明 / 暗 / 390 截图矩阵
// ────────────────────────────────────────────────────────────────────────────

for (const fixture of FIXTURES) {
  test(`visual matrix: ${fixture}`, async ({ page }) => {
    await setViewport(page, 1280, 900);
    await openFixture(page, fixture);
    await shot(page, `${fixture}-1280-light.png`);
    await setDark(page, true);
    await shot(page, `${fixture}-1280-dark.png`);
    await setDark(page, false);
    await setViewport(page, 390, 844);
    await shot(page, `${fixture}-390-light.png`);
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 2. 固定列横向滚动：不透明、定位、阴影
// ────────────────────────────────────────────────────────────────────────────

test('fixed columns: virtual wide table while horizontally scrolled', async ({
  page,
}, testInfo) => {
  await setViewport(page, 1280, 900);
  await openFixture(page, 'virtual');

  const scope = page.getByTestId('bidirectional-virtual-table');
  const container = scope.locator('.s-table-container');
  await expect(scope.locator('thead th[data-column-id="id"]')).toBeVisible();

  await container.evaluate((element) => {
    element.scrollLeft = Math.floor((element.scrollWidth - element.clientWidth) / 2);
    element.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(350);

  const data = await scope.evaluate((root) => {
    const r = (element: Element | null) => {
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        width: box.width,
      };
    };
    const container = root.querySelector<HTMLElement>('.s-table-container')!;
    const header = root.querySelector('thead')!;
    const cells = Array.from(header.querySelectorAll<HTMLElement>('th'));
    const pick = (id: string) => cells.find((cell) => cell.dataset.columnId === id) ?? null;
    const visibleId = pick('id');
    const visibleName = pick('name');
    const visibleTail = pick('tail');
    const leftShadow = root.querySelector('.s-table-fixed-column-shadow-left');
    const rightShadow = root.querySelector('.s-table-fixed-column-shadow-right');
    const bg = (element: Element | null) =>
      element ? getComputedStyle(element).backgroundColor : null;
    return {
      container: r(container),
      scrollLeft: container.scrollLeft,
      scrollWidth: container.scrollWidth,
      clientWidth: container.clientWidth,
      id: r(visibleId),
      idBg: bg(visibleId),
      name: r(visibleName),
      nameBg: bg(visibleName),
      tail: r(visibleTail),
      tailBg: bg(visibleTail),
      leftShadow: r(leftShadow),
      rightShadow: r(rightShadow),
      firstScrolledCellLeft: r(
        cells.find((cell) => {
          const id = cell.dataset.columnId ?? '';
          return !id || !['id', 'name', 'tail'].includes(id);
        }) ?? null
      ),
    };
  });

  await shot(page, 'virtual-wide-scrolled-1280-light.png', {
    fullPage: false,
    clipSelector: '[data-testid="bidirectional-virtual-table"]',
  });

  expect(data.scrollWidth).toBeGreaterThan(data.clientWidth);
  expect(data.scrollLeft).toBeGreaterThan(0);
  // 固定左列必须贴在容器左侧且不透明
  expect(data.id?.left).toBeCloseTo(data.container!.left, 0);
  expect(data.name?.left).toBeCloseTo(data.id?.right ?? 0, 0);
  expect(data.idBg).toMatch(/rgba?\([^)]*\)/);
  expect(data.idBg).not.toMatch(/rgba\([^)]*,\s*0(?:\.\d+)?\)/);
  expect(data.nameBg).not.toMatch(/rgba\([^)]*,\s*0(?:\.\d+)?\)/);
  // 固定右列必须贴在容器右侧且不透明
  expect(data.tail?.right).toBeCloseTo(data.container!.right, 0);
  expect(data.tailBg).not.toMatch(/rgba\([^)]*,\s*0(?:\.\d+)?\)/);
  // 非 bordered 表格的滚动叠层应当出现且与容器同高
  expect(data.leftShadow).not.toBeNull();
  expect(data.rightShadow).not.toBeNull();
  expect(data.leftShadow!.top).toBeCloseTo(data.container!.top, 0);
  expect(Math.abs(data.leftShadow!.bottom - data.container!.bottom)).toBeLessThanOrEqual(1);

  // 非固定列此时已被滚动到左侧负坐标，固定列只需保持不透明即可遮挡穿透内容。
  if (data.firstScrolledCellLeft) {
    expect(data.firstScrolledCellLeft.left).toBeLessThan(data.name!.right);
  }

  await attachJson(testInfo, 'virtual-fixed-columns.json', data);
});

test('fixed columns: interaction range table at 390px', async ({ page }, testInfo) => {
  await setViewport(page, 390, 844);
  await openFixture(page, 'interaction');

  const scope = page.getByTestId('range-context-table');
  const container = scope.locator('.s-table-container');
  const before = await container.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));

  if (before.scrollWidth > before.clientWidth) {
    await container.evaluate((element) => {
      element.scrollLeft = element.scrollWidth - element.clientWidth;
      element.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(300);
  }

  const data = await scope.evaluate((root) => {
    const r = (element: Element | null) => {
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, width: box.width };
    };
    const container = root.querySelector<HTMLElement>('.s-table-container')!;
    const cells = Array.from(root.querySelectorAll<HTMLElement>('thead th'));
    const pick = (id: string) => cells.find((cell) => cell.dataset.columnId === id) ?? null;
    const fixedLeft = pick('id');
    const fixedRight = pick('score');
    return {
      container: r(container),
      scrollLeft: container.scrollLeft,
      scrollWidth: container.scrollWidth,
      clientWidth: container.clientWidth,
      fixedLeft: r(fixedLeft),
      fixedRight: r(fixedRight),
      fixedLeftShadow: fixedLeft ? getComputedStyle(fixedLeft).boxShadow : null,
      fixedRightShadow: fixedRight ? getComputedStyle(fixedRight).boxShadow : null,
      viewportWidth: window.innerWidth,
      docScrollWidth: document.documentElement.scrollWidth,
    };
  });

  await shot(page, 'interaction-range-scrolled-390.png', {
    fullPage: false,
    clipSelector: '[data-testid="range-context-table"]',
  });

  expect(data.scrollWidth).toBeGreaterThanOrEqual(data.clientWidth);
  if (data.scrollLeft > 0) {
    // 容器 1px 边框不计入内容坐标，允许 1.5px 内的边界误差。
    expect(Math.abs(data.fixedLeft!.left - data.container!.left)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(data.fixedRight!.right - data.container!.right)).toBeLessThanOrEqual(1.5);
  }
  expect(data.fixedLeftShadow).not.toBeNull();

  await attachJson(testInfo, 'interaction-fixed-columns-390.json', data);
});

// ────────────────────────────────────────────────────────────────────────────
// 3. 吸顶表头 / 固定行 / 吸底汇总
// ────────────────────────────────────────────────────────────────────────────

test('sticky header stays above virtual rows after vertical scroll', async ({ page }, testInfo) => {
  await setViewport(page, 1280, 900);
  await openFixture(page, 'virtual');

  const scope = page.getByTestId('virtual-table');
  const container = scope.locator('.s-table-container');
  await container.evaluate((element) => {
    element.scrollTop = 2000;
    element.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(350);

  const data = await scope.evaluate((root) => {
    const r = (element: Element | null) => {
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom };
    };
    const container = root.querySelector<HTMLElement>('.s-table-container')!;
    const headerCells = Array.from(root.querySelectorAll<HTMLElement>('thead th'));
    const headerTop = Math.min(...headerCells.map((cell) => cell.getBoundingClientRect().top));
    const headerBottom = Math.max(
      ...headerCells.map((cell) => cell.getBoundingClientRect().bottom)
    );
    const bodyRows = Array.from(root.querySelectorAll<HTMLElement>('.s-table-body .s-table-row'))
      .map((row) => ({
        rect: r(row),
        key: row.dataset.rowKey,
        top: row.getBoundingClientRect().top,
      }))
      .filter((row) => row.top >= headerBottom - 1)
      .sort((a, b) => a.top - b.top);
    const styles = headerCells.map((cell) => ({
      column: cell.dataset.columnId,
      position: getComputedStyle(cell).position,
      bg: getComputedStyle(cell).backgroundColor,
      z: getComputedStyle(cell).zIndex,
    }));
    return {
      container: r(container),
      headerTop,
      headerBottom,
      firstVisibleRow: bodyRows[0] ?? null,
      theadPosition: getComputedStyle(root.querySelector('thead')!).position,
      styles,
      count: bodyRows.length,
    };
  });

  await shot(page, 'virtual-sticky-header-scrolled.png', {
    fullPage: false,
    clipSelector: '[data-testid="virtual-table"]',
  });

  expect(data.headerTop).toBeGreaterThanOrEqual(data.container!.top - 1);
  expect(data.headerBottom).toBeLessThanOrEqual(data.container!.top + 60);
  expect(data.firstVisibleRow).not.toBeNull();
  expect(data.firstVisibleRow!.top).toBeGreaterThanOrEqual(data.headerBottom - 1);
  // 吸顶由 thead 承担；固定列的 th 另行 sticky。
  expect(data.theadPosition).toBe('sticky');

  await attachJson(testInfo, 'virtual-sticky-header.json', data);
});

test('tall pinned rows stay attached while scrolling', async ({ page }, testInfo) => {
  await setViewport(page, 1280, 900);
  await openFixture(page, 'round2');

  const scope = page.getByTestId('tall-pinned-table');
  const container = scope.locator('.s-table-container');
  const topRow = scope.locator('.s-table-row-pinned-top').first();
  const bottomRow = scope.locator('.s-table-row-pinned-bottom').first();
  await expect(topRow).toBeVisible();
  await expect(bottomRow).toBeVisible();

  const scrollSamples = async () => {
    return scope.evaluate((root) => {
      const r = (element: Element | null) => {
        if (!element) return null;
        const box = element.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom };
      };
      const container = root.querySelector<HTMLElement>('.s-table-container')!;
      const header = root.querySelector('thead')!;
      const top = root.querySelector('.s-table-row-pinned-top');
      const bottom = root.querySelector('.s-table-row-pinned-bottom');
      const rows = Array.from(root.querySelectorAll<HTMLElement>('.s-table-body .s-table-row'));
      return {
        scrollTop: container.scrollTop,
        container: r(container),
        header: r(header),
        top: r(top),
        topPosition: top ? getComputedStyle(top.firstElementChild ?? top).position : null,
        bottom: r(bottom),
        rowCount: rows.length,
      };
    });
  };

  const atTop = await scrollSamples();
  await container.evaluate((element) => {
    element.scrollTop = element.scrollHeight - element.clientHeight;
    element.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(350);
  const atBottom = await scrollSamples();

  await shot(page, 'round2-tall-pinned-scrolled.png', {
    fullPage: false,
    clipSelector: '[data-testid="tall-pinned-table"]',
  });

  // 滚动前后固定行都应完整位于容器内，且不覆盖表头
  for (const sample of [atTop, atBottom]) {
    expect(sample.top!.top).toBeGreaterThanOrEqual(sample.header!.bottom - 1);
    expect(sample.top!.bottom).toBeLessThanOrEqual(sample.container!.bottom + 1);
    expect(sample.bottom!.top).toBeGreaterThanOrEqual(sample.container!.top - 1);
    expect(sample.bottom!.bottom).toBeLessThanOrEqual(sample.container!.bottom + 1);
  }
  expect(atBottom.scrollTop).toBeGreaterThan(atTop.scrollTop);

  await attachJson(testInfo, 'round2-tall-pinned.json', { atTop, atBottom });
});

test('column footer stays inside scroll container and does not fully cover last row', async ({
  page,
}, testInfo) => {
  await setViewport(page, 1280, 900);
  await openFixture(page, 'round3');

  const scope = page.getByTestId('column-footer-table');
  const container = scope.locator('.s-table-container');
  const footer = scope.locator('tfoot.s-table-column-footer');
  await expect(footer).toBeVisible();

  const sample = () =>
    scope.evaluate((root) => {
      const r = (element: Element | null) => {
        if (!element) return null;
        const box = element.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom, height: box.height };
      };
      const container = root.querySelector<HTMLElement>('.s-table-container')!;
      const footer = root.querySelector('.s-table-column-footer');
      const rows = Array.from(root.querySelectorAll<HTMLElement>('.s-table-body .s-table-row'));
      const last = rows.at(-1) ?? null;
      return {
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
        clientHeight: container.clientHeight,
        container: r(container),
        footer: r(footer),
        lastRow: r(last),
        footerPosition: footer ? getComputedStyle(footer).position : null,
        footerBottom: footer ? getComputedStyle(footer).bottom : null,
      };
    });

  const atTop = await sample();
  await container.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(300);
  const atBottom = await sample();

  await shot(page, 'round3-column-footer-scrolled.png', {
    fullPage: false,
    clipSelector: '[data-testid="column-footer-table"]',
  });

  expect(atTop.footerPosition).toBe('sticky');
  expect(atTop.footerBottom).toBe('0px');
  expect(atTop.footer!.bottom).toBeLessThanOrEqual(atTop.container!.bottom + 1);
  expect(atBottom.footer!.bottom).toBeLessThanOrEqual(atBottom.container!.bottom + 1);
  expect(atBottom.footer!.top).toBeGreaterThanOrEqual(atBottom.container!.top - 1);
  // 滚到底后吸底汇总紧贴最后一行下边缘，不能继续盖住行内容。
  if (atBottom.lastRow) {
    expect(atBottom.lastRow.bottom).toBeLessThanOrEqual(atBottom.footer!.top + 0.5);
  }

  await attachJson(testInfo, 'round3-column-footer.json', { atTop, atBottom });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. 浮层在窄视口边缘的翻转 / 平移 / 裁剪
// ────────────────────────────────────────────────────────────────────────────

const measurePopup = (page: Page, selector: string) =>
  page.locator(selector).evaluate((element) => {
    const box = element.getBoundingClientRect();
    const parent = element.parentElement;
    const parentBox = parent ? parent.getBoundingClientRect() : null;
    return {
      left: box.left,
      top: box.top,
      right: box.right,
      bottom: box.bottom,
      width: box.width,
      height: box.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      docWidth: document.documentElement.scrollWidth,
      parent: parentBox
        ? {
            left: parentBox.left,
            right: parentBox.right,
            top: parentBox.top,
            bottom: parentBox.bottom,
          }
        : null,
      overflowX: getComputedStyle(element).overflowX,
      visibility: getComputedStyle(element).visibility,
      display: getComputedStyle(element).display,
    };
  });

for (const fixture of ['core', 'round2', 'round3'] as const) {
  test(`popups near viewport edges at 390px: ${fixture}`, async ({ page }, testInfo) => {
    await setViewport(page, 390, 844);
    await openFixture(page, fixture);
    await page.evaluate(() => window.scrollTo(0, 0));

    const results: Array<Record<string, unknown>> = [];

    const openAndMeasure = async (
      label: string,
      triggerSelector: string,
      popupSelector: string,
      closeKey = 'Escape'
    ) => {
      const trigger = page.locator(triggerSelector).first();
      if ((await trigger.count()) === 0) return;
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click();
      await page.waitForTimeout(350);
      const popup = page.locator(popupSelector).first();
      const visible = await popup.isVisible().catch(() => false);
      if (!visible) {
        results.push({ label, visible: false, trigger: triggerSelector, popup: popupSelector });
        return;
      }
      const measurement = await measurePopup(page, popupSelector);
      results.push({
        label,
        visible: true,
        trigger: triggerSelector,
        popup: popupSelector,
        ...measurement,
      });
      await shot(page, `${fixture}-popup-${label}-390.png`, { fullPage: false });
      await page.keyboard.press(closeKey);
      await page.waitForTimeout(150);
    };

    if (fixture === 'core') {
      await openAndMeasure(
        'filter',
        '[data-testid="pipeline-table"] th[data-column-id="department"] .s-table-filter-trigger',
        '.s-table-filter-dropdown'
      );
      await openAndMeasure(
        'search',
        '[data-testid="pipeline-table"] th[data-column-id="name"] .s-table-search-trigger',
        '.s-table-search-dropdown'
      );
    }
    if (fixture === 'round2') {
      await openAndMeasure(
        'menu-filter',
        '[data-testid="menu-filter-table"] th[data-column-id="department"] .s-table-filter-trigger',
        '.s-table-filter-dropdown'
      );
    }
    if (fixture === 'round3') {
      await openAndMeasure(
        'header-menu',
        '[data-testid="header-menu-table"] th[data-column-id="name"] .s-table-header-menu-trigger',
        '.s-table-header-menu-popup'
      );

      // Tooltip 靠近视口上/右边缘时应翻转或平移而不是被裁剪
      const cell = page
        .locator(
          '[data-testid="tooltip-table"] .s-table-row[data-row-key="4"] td[data-column-id="name"]'
        )
        .first();
      await cell.scrollIntoViewIfNeeded();
      await cell.hover();
      await page.waitForTimeout(400);
      const tooltip = page.locator('.s-table-tooltip');
      if (await tooltip.isVisible().catch(() => false)) {
        results.push({
          label: 'tooltip',
          visible: true,
          ...(await measurePopup(page, '.s-table-tooltip')),
        });
        await shot(page, 'round3-tooltip-390.png', { fullPage: false });
      } else {
        results.push({ label: 'tooltip', visible: false });
      }
    }

    await attachJson(testInfo, `popups-${fixture}-390.json`, results);

    for (const result of results) {
      if (!result.visible) continue;
      expect(result.left as number).toBeGreaterThanOrEqual(-0.5);
      expect(result.top as number).toBeGreaterThanOrEqual(-0.5);
      expect(result.right as number).toBeLessThanOrEqual((result.viewportWidth as number) + 0.5);
      expect(result.bottom as number).toBeLessThanOrEqual((result.viewportHeight as number) + 0.5);
    }
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 5. 分页器窄视口与页脚 / 汇总对齐
// ────────────────────────────────────────────────────────────────────────────

test('pagination fits at 390px and hides auxiliary controls', async ({ page }, testInfo) => {
  await setViewport(page, 390, 844);
  await openFixture(page, 'core');

  const paginationScope = page.getByTestId('pagination-table');
  const pagination = paginationScope.locator('.s-pagination');
  await expect(pagination).toBeVisible();

  const data = await paginationScope.evaluate((root) => {
    const wrapper = root.querySelector<HTMLElement>('.s-table-pagination-wrapper')!;
    const pager = root.querySelector<HTMLElement>('.s-pagination')!;
    const items = Array.from(pager.children).map((child) => {
      const style = getComputedStyle(child);
      return {
        className: child.className,
        display: style.display,
        text: (child.textContent ?? '').trim().slice(0, 20),
        rect: (() => {
          const box = child.getBoundingClientRect();
          return { left: box.left, right: box.right, width: box.width };
        })(),
      };
    });
    return {
      wrapper: (() => {
        const box = wrapper.getBoundingClientRect();
        return { left: box.left, right: box.right, width: box.width };
      })(),
      pager: (() => {
        const box = pager.getBoundingClientRect();
        return { left: box.left, right: box.right, width: box.width };
      })(),
      pagerScrollWidth: pager.scrollWidth,
      pagerClientWidth: pager.clientWidth,
      overflowX: getComputedStyle(pager).overflowX,
      items,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      docScrollWidth: document.documentElement.scrollWidth,
    };
  });

  await shot(page, 'core-pagination-390.png', {
    fullPage: false,
    clipSelector: '[data-testid="pagination-table"]',
  });

  expect(data.pagerScrollWidth).toBeLessThanOrEqual(data.pagerClientWidth + 1);
  expect(data.pager.right).toBeLessThanOrEqual(data.viewport.width + 0.5);
  expect(data.pager.left).toBeGreaterThanOrEqual(-0.5);
  for (const hidden of [
    's-pagination-size-changer',
    's-pagination-quick-jumper',
    's-pagination-total-text',
  ]) {
    const item = data.items.find((entry) => entry.className.includes(hidden));
    if (item) expect(item.display).toBe('none');
  }

  await attachJson(testInfo, 'core-pagination-390.json', data);
});

test('simple pagination and footer/summary alignment at 390px', async ({ page }, testInfo) => {
  await setViewport(page, 390, 844);
  await openFixture(page, 'round3');

  const simple = page.getByTestId('simple-pagination-table');
  const simplePager = simple.locator('.s-pagination');
  await expect(simplePager).toBeVisible();
  const simpleData = await simplePager.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      left: box.left,
      right: box.right,
      width: box.width,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      viewportWidth: window.innerWidth,
      text: (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
    };
  });

  const scopeTable = page.getByTestId('scope-table');
  await scopeTable.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const footerData = await scopeTable.evaluate((root) => {
    const rect = (selector: string) => {
      const element = root.querySelector<HTMLElement>(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return {
        top: box.top,
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        width: box.width,
      };
    };
    return {
      footer: rect('.s-table-footer'),
      pagination: rect('.s-table-pagination-wrapper'),
      footerText: root.querySelector('.s-table-footer')?.textContent?.trim() ?? null,
      paginationText:
        root.querySelector('.s-pagination')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      viewportWidth: window.innerWidth,
    };
  });

  await shot(page, 'round3-simple-pagination-390.png', {
    fullPage: false,
    clipSelector: '[data-testid="simple-pagination-table"]',
  });
  await shot(page, 'round3-scope-footer-390.png', {
    fullPage: false,
    clipSelector: '[data-testid="scope-table"]',
  });

  expect(simpleData.scrollWidth).toBeLessThanOrEqual(simpleData.clientWidth + 1);
  expect(simpleData.right).toBeLessThanOrEqual(simpleData.viewportWidth + 0.5);
  if (footerData.pagination) {
    expect(footerData.pagination.right).toBeLessThanOrEqual(footerData.viewportWidth + 0.5);
  }

  await attachJson(testInfo, 'round3-pagination-footer-390.json', { simpleData, footerData });
});

test('narrow viewport: auto column content widths at 390px', async ({ page }, testInfo) => {
  const cases = [
    ['interaction', 'selection-expand-table'],
    ['round2', 'grouped-table'],
    ['core', 'combined-table'],
  ] as const;
  const findings: Array<Record<string, unknown>> = [];

  for (const [fixture, testId] of cases) {
    await setViewport(page, 390, 844);
    await openFixture(page, fixture);
    const data = await page.getByTestId(testId).evaluate((root) => {
      const headers = Array.from(root.querySelectorAll<HTMLElement>('thead tr:last-child th'));
      const firstRow = root.querySelector<HTMLElement>('.s-table-body .s-table-row');
      return {
        tableWidth: Math.round(root.querySelector('table')!.getBoundingClientRect().width),
        viewportWidth: window.innerWidth,
        rowHeight: firstRow ? Math.round(firstRow.getBoundingClientRect().height) : null,
        columns: headers.map((th) => {
          const cs = getComputedStyle(th);
          const paddingLeft = Number.parseFloat(cs.paddingLeft);
          const paddingRight = Number.parseFloat(cs.paddingRight);
          return {
            id: th.dataset.columnId ?? null,
            width: Math.round(th.getBoundingClientRect().width),
            paddingLeft,
            paddingRight,
            contentWidth: Math.round(th.getBoundingClientRect().width - paddingLeft - paddingRight),
            headerText: (th.textContent ?? '').trim().slice(0, 20),
          };
        }),
      };
    });
    findings.push({ fixture, testId, ...data });
    await shot(page, `${fixture}-390-columns.png`, {
      fullPage: false,
      clipSelector: `[data-testid="${testId}"]`,
    });
  }

  await attachJson(testInfo, 'narrow-columns-390.json', findings);
  console.log('[narrow-columns-390]', JSON.stringify(findings));
  expect(findings).toHaveLength(cases.length);
});

// ────────────────────────────────────────────────────────────────────────────
// 6. 暗色模式对比度扫描（computed style）
// ────────────────────────────────────────────────────────────────────────────

const CONTRAST_SELECTORS = [
  '.s-table-cell',
  '.s-table-cell-title',
  '.s-table-footer',
  '.s-table-summary-row .s-table-cell',
  '.s-table-column-footer th',
  '.s-pagination',
  '.s-pagination-item',
  '.s-pagination-simple-pager',
  '.s-pagination-total-text',
  '.s-pagination-quick-jumper',
  '.s-empty',
];

for (const fixture of FIXTURES) {
  test(`dark contrast scan: ${fixture}`, async ({ page }, testInfo) => {
    await setViewport(page, 1280, 900);
    await openFixture(page, fixture);
    await setDark(page, true);
    await page.waitForTimeout(300);

    const findings = await page.evaluate((selectors) => {
      type Rgba = { r: number; g: number; b: number; a: number };
      const parse = (value: string): Rgba | null => {
        const match = value.match(/rgba?\(([^)]+)\)/);
        if (!match) return null;
        const parts = match[1]!
          .split(/[\s,/]+/)
          .filter(Boolean)
          .map(Number);
        return { r: parts[0]!, g: parts[1]!, b: parts[2]!, a: parts.length > 3 ? parts[3]! : 1 };
      };
      const blend = (fg: Rgba, bg: Rgba): Rgba => {
        const a = fg.a + bg.a * (1 - fg.a);
        return {
          r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / (a || 1),
          g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / (a || 1),
          b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / (a || 1),
          a,
        };
      };
      const effectiveBackground = (element: HTMLElement): Rgba => {
        const layers: Rgba[] = [];
        let node: HTMLElement | null = element;
        while (node) {
          const computed = getComputedStyle(node);
          const color = parse(computed.backgroundColor);
          if (color && color.a > 0) {
            layers.push(color);
            if (color.a >= 0.999) break;
          }
          node = node.parentElement;
        }
        let result: Rgba = { r: 255, g: 255, b: 255, a: 1 };
        for (let index = layers.length - 1; index >= 0; index -= 1) {
          result = blend(layers[index]!, result);
        }
        return result;
      };
      const luminance = (color: Rgba): number => {
        const channel = (value: number) => {
          const normalized = value / 255;
          return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
      };
      const contrast = (a: Rgba, b: Rgba): number => {
        const first = luminance(a);
        const second = luminance(b);
        return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
      };
      const selectorOf = (element: HTMLElement): string => {
        const tag = element.tagName.toLowerCase();
        const cls = Array.from(element.classList).slice(0, 3).join('.');
        return cls ? `${tag}.${cls}` : tag;
      };

      const results: Array<Record<string, unknown>> = [];
      const seen = new Set<Element>();
      for (const selector of selectors) {
        for (const element of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
          if (seen.has(element)) continue;
          seen.add(element);
          if (!element.firstChild) continue;
          const hasText = Array.from(element.childNodes).some(
            (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim()
          );
          if (!hasText) continue;
          const rect = element.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) continue;
          const computed = getComputedStyle(element);
          if (computed.visibility === 'hidden' || computed.display === 'none') continue;
          if (Number(computed.opacity) === 0) continue;
          if (element.closest('[aria-hidden="true"]')) continue;
          const foreground = parse(computed.color);
          if (!foreground) continue;
          const background = effectiveBackground(element);
          const composited = blend(foreground, background);
          const ratio = contrast(composited, background);
          const fontSize = Number.parseFloat(computed.fontSize);
          const weight = Number.parseInt(computed.fontWeight, 10) || 400;
          const large = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700);
          const threshold = large ? 3 : 4.5;
          const disabled = Boolean(
            element.closest('[disabled], .s-pagination-disabled, .s-table-cell-disabled')
          );
          if (ratio < threshold) {
            results.push({
              selector: selectorOf(element),
              text: (element.textContent ?? '').trim().slice(0, 40),
              ratio: Number(ratio.toFixed(2)),
              threshold,
              color: computed.color,
              background: `rgb(${Math.round(background.r)}, ${Math.round(background.g)}, ${Math.round(background.b)})`,
              fontSize,
              weight,
              disabled,
              rect: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                w: Math.round(rect.width),
                h: Math.round(rect.height),
              },
            });
          }
        }
      }
      return results.sort((a, b) => (a.ratio as number) - (b.ratio as number)).slice(0, 60);
    }, CONTRAST_SELECTORS);

    await attachJson(testInfo, `dark-contrast-${fixture}.json`, findings);
    if (findings.length > 0) {
      console.log(
        `[dark-contrast:${fixture}] ${findings.length} low-contrast elements`,
        findings.slice(0, 10)
      );
    }
    // 4.5:1 的 AA 失配只记录（截图人工复核）；< 3:1 视为不可读，直接失败。
    expect(
      (findings as Array<{ disabled?: boolean; ratio: number }>).filter(
        (entry) => !entry.disabled && entry.ratio < 3
      )
    ).toEqual([]);
  });
}
