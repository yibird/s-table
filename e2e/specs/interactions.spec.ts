import { expect, openFixture, test } from '../support/test';
import { columnTexts, publicRowKeys, renderedRows } from '../support/table';

test.beforeEach(async ({ page }) => {
  await openFixture(page, 'interaction');
});

test.describe('选择与展开', () => {
  test('受控多选、禁用行和公开选择 API 保持同步', async ({ page }) => {
    const scope = page.getByTestId('selection-expand-table');
    const row1 = scope.locator('.s-table-row[data-row-key="1"]');
    const row2 = scope.locator('.s-table-row[data-row-key="2"]');
    const row3 = scope.locator('.s-table-row[data-row-key="3"]');

    await expect(scope.locator('colgroup col[style*="width: 62px"]')).toHaveCount(1);
    await expect(page.getByTestId('selected-keys')).toHaveText('2');
    await expect(row2).toHaveClass(/s-table-row-selected/);
    await row1.locator('.s-checkbox-wrapper').click();
    await expect(page.getByTestId('selected-keys')).toHaveText('1,2');
    await expect(row1).toHaveClass(/s-table-row-selected/);
    await expect(row3.locator('input[type="checkbox"]')).toBeDisabled();

    await scope.locator('thead .s-checkbox-wrapper').click();
    await expect(page.getByTestId('selected-keys')).toHaveText('1,2,4,5');

    await page.getByTestId('api-clear-selection').click();
    await expect(page.getByTestId('selected-keys')).toBeEmpty();
    await page.getByTestId('api-select-all').click();
    await expect(page.getByTestId('selected-keys')).toHaveText('1,2,4,5');
  });

  test('暗黑模式覆盖选择菜单、Checkbox 与右键菜单', async ({ page }) => {
    await page.locator('html').evaluate((element) => element.classList.add('dark'));
    const selectionTable = page.getByTestId('selection-expand-table');
    const checkbox = selectionTable.locator('.s-table-row[data-row-key="1"] .s-checkbox-inner');

    await expect
      .poll(() =>
        checkbox.evaluate((element) => {
          const style = getComputedStyle(element);
          return { background: style.backgroundColor, border: style.borderColor };
        })
      )
      .toEqual({ background: 'rgb(20, 20, 20)', border: 'rgb(66, 66, 66)' });

    await selectionTable.locator('.s-table-selection-dropdown-trigger').click();
    const selectionMenu = page.locator('.s-table-selection-dropdown-menu');
    const selectionStyles = await selectionMenu.evaluate((element) => {
      const item = element.querySelector('.s-table-selection-dropdown-item');
      const divider = element.querySelector('.s-table-selection-dropdown-divider');
      if (!item || !divider) throw new Error('选择菜单结构不完整');
      return {
        background: getComputedStyle(element).backgroundColor,
        color: getComputedStyle(item).color,
        divider: getComputedStyle(divider).backgroundColor,
      };
    });
    expect(selectionStyles).toEqual({
      background: 'rgb(20, 20, 20)',
      color: 'rgba(255, 255, 255, 0.85)',
      divider: 'rgb(48, 48, 48)',
    });
    await page.keyboard.press('Escape');

    const contextTable = page.getByTestId('range-context-table');
    await contextTable.locator('.s-table-row[data-row-key="3"]').click({ button: 'right' });
    const contextMenu = page.locator('.s-table-context-menu-inner');
    const contextStyles = await contextMenu.evaluate((element) => {
      const item = element.querySelector('.s-table-context-menu-item');
      if (!item) throw new Error('右键菜单项不存在');
      return {
        background: getComputedStyle(element).backgroundColor,
        inheritedColor: getComputedStyle(element).color,
        itemColor: getComputedStyle(item).color,
      };
    });
    expect(contextStyles).toEqual({
      background: 'rgb(20, 20, 20)',
      inheritedColor: 'rgba(255, 255, 255, 0.85)',
      itemColor: 'rgba(255, 255, 255, 0.85)',
    });
  });

  test('展开按钮、禁用行和批量展开 API 渲染正确详情', async ({ page }) => {
    const scope = page.getByTestId('selection-expand-table');
    const row1 = scope.locator('.s-table-row[data-row-key="1"]');
    const row2 = scope.locator('.s-table-row[data-row-key="2"]');
    const row4 = scope.locator('.s-table-row[data-row-key="4"]');

    await row1.locator('.s-table-expand-trigger').click();
    await expect(page.getByTestId('expanded-1')).toHaveText('Details for person 1');
    await expect(page.getByTestId('expanded-keys')).toHaveText('1');
    await row2.locator('.s-table-expand-trigger').click();
    await expect(page.getByTestId('expanded-keys')).toHaveText('1,2');
    await expect(row4.locator('.s-table-expand-trigger')).toBeDisabled();

    await page.getByTestId('api-collapse-all').click();
    await expect(scope.locator('.s-table-expanded-row')).toHaveCount(0);
    await page.getByTestId('api-expand-all').click();
    await expect(page.getByTestId('expanded-keys')).toHaveText('1,2,3,5');
    await expect(scope.locator('.s-table-expanded-row')).toHaveCount(4);
  });
});

test.describe('框选与右键菜单', () => {
  test('非固定列与右固定列的边界只显示一条边框', async ({ page }) => {
    const scope = page.getByTestId('range-context-table');
    const boundaryCells = scope.locator(
      'thead th[data-column-id="department"], tbody tr[data-row-key="1"] td[data-column-id="department"]'
    );

    await expect(boundaryCells).toHaveCount(2);
    await expect
      .poll(() =>
        boundaryCells.evaluateAll((cells) =>
          cells.map((cell) => getComputedStyle(cell).borderInlineEndWidth)
        )
      )
      .toEqual(['0px', '0px']);

    const fixedCells = scope.locator(
      'thead th[data-column-id="score"], tbody tr[data-row-key="1"] td[data-column-id="score"]'
    );
    await expect(fixedCells).toHaveCount(2);
    const fixedInsetShadows = await fixedCells.evaluateAll((cells) =>
      cells.map((cell) => getComputedStyle(cell).getPropertyValue('--s-fixed-inset-shadow').trim())
    );
    expect(fixedInsetShadows).toHaveLength(2);
    expect(fixedInsetShadows.every((shadow) => shadow.startsWith('inset 1px 0 0 '))).toBe(true);
  });

  test('真实鼠标拖动产生矩形范围、边缘 class 和记录集合', async ({ page }) => {
    const scope = page.getByTestId('range-context-table');
    const start = scope.locator('.s-table-row[data-row-key="1"] td[data-column-id="name"]');
    const end = scope.locator('.s-table-row[data-row-key="3"] td[data-column-id="department"]');

    // hover 会先把目标滚入视口；直接读取屏外 boundingBox 后移动鼠标不会触发真实 DOM 事件。
    await start.hover();
    const startBox = await start.boundingBox();
    await end.hover();
    const endBox = await end.boundingBox();
    expect(startBox).not.toBeNull();
    expect(endBox).not.toBeNull();
    await start.hover();
    await page.mouse.down();
    await end.hover({ position: { x: endBox!.width / 2, y: endBox!.height / 2 } });
    await page.mouse.up();

    await expect(page.getByTestId('range-value')).toHaveText(
      JSON.stringify({ startRow: 0, startCol: 1, endRow: 2, endCol: 2 })
    );
    await expect(page.getByTestId('range-records')).toHaveText('1,2,3');
    await expect(scope.locator('.s-table-cell-range-selected')).toHaveCount(6);
    await expect(start).toHaveClass(/s-table-cell-range-edge-top/);
    await expect(start).toHaveClass(/s-table-cell-range-edge-left/);
    await expect(end).toHaveClass(/s-table-cell-range-edge-bottom/);
    await expect(end).toHaveClass(/s-table-cell-range-edge-right/);

    // 不只验证 TanStack 边缘 class，还验证最终视觉：四边方向正确、选区有填充且不会撑高行。
    const middle = scope.locator('.s-table-row[data-row-key="2"] td[data-column-id="name"]');
    const normal = scope.locator('.s-table-row[data-row-key="2"] td[data-column-id="id"]');
    const [startVisual, endVisual, middleBackground, normalBackground, selectedStartBox] =
      await Promise.all([
        start.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            top: style.getPropertyValue('--s-cell-range-top').trim(),
            left: style.getPropertyValue('--s-cell-range-left').trim(),
            background: style.backgroundColor,
            outline: getComputedStyle(element, '::after').boxShadow,
          };
        }),
        end.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            bottom: style.getPropertyValue('--s-cell-range-bottom').trim(),
            right: style.getPropertyValue('--s-cell-range-right').trim(),
          };
        }),
        middle.evaluate((element) => getComputedStyle(element).backgroundColor),
        normal.evaluate((element) => getComputedStyle(element).backgroundColor),
        start.boundingBox(),
      ]);
    expect(startVisual).toMatchObject({ top: '2px', left: '2px' });
    expect(endVisual).toEqual({ bottom: '-2px', right: '-2px' });
    expect(startVisual.outline).not.toBe('none');
    expect(middleBackground).not.toBe(normalBackground);
    expect(startVisual.background).toBe(middleBackground);
    expect(selectedStartBox?.height).toBe(startBox?.height);

    await page.getByTestId('clear-range').click();
    await expect(page.getByTestId('range-value')).toHaveText('none');
    await expect(scope.locator('.s-table-cell-range-selected')).toHaveCount(0);
  });

  test('Ctrl+C 复制矩形文本，可取消事件返回 false 时禁止复制', async ({ page, browserName }) => {
    if (browserName === 'chromium') {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    } else {
      await page.evaluate(() => {
        let value = '';
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            readText: async () => value,
            writeText: async (nextValue: string) => {
              value = nextValue;
            },
          },
        });
      });
    }
    const scope = page.getByTestId('range-context-table');
    const start = scope.locator('.s-table-row[data-row-key="1"] td[data-column-id="name"]');
    const end = scope.locator('.s-table-row[data-row-key="3"] td[data-column-id="department"]');

    await start.hover();
    const startBox = await start.boundingBox();
    await end.hover();
    const endBox = await end.boundingBox();
    expect(startBox).not.toBeNull();
    expect(endBox).not.toBeNull();
    await start.hover();
    await page.mouse.down();
    await end.hover({ position: { x: endBox!.width / 2, y: endBox!.height / 2 } });
    await page.mouse.up();
    await expect(page.getByTestId('range-value')).toHaveText(
      JSON.stringify({ startRow: 0, startCol: 1, endRow: 2, endCol: 2 })
    );
    await start.focus();
    await expect(start).toBeFocused();
    await page.keyboard.press('Control+C');

    const expected = 'Person 1\tEngineering\nPerson 2\tDesign\nPerson 3\tSales';
    await expect(page.getByTestId('range-copy-event')).toHaveText(
      'keyboard:Person 1\tEngineering|Person 2\tDesign|Person 3\tSales'
    );
    await expect
      .poll(async () =>
        (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')
      )
      .toBe(expected);

    await page.evaluate(() => navigator.clipboard.writeText('unchanged'));
    await page.getByTestId('toggle-copy-block').click();
    await start.focus();
    await page.keyboard.press('Control+C');
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('unchanged');
  });

  test('右键菜单携带可见行上下文并支持操作关闭', async ({ page }) => {
    const scope = page.getByTestId('range-context-table');
    await scope.locator('.s-table-row[data-row-key="3"]').click({ button: 'right' });

    await expect(page.getByTestId('context-menu')).toBeVisible();
    await expect(page.getByTestId('context-row')).toHaveText('3:2');
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(page.getByTestId('context-confirm')).toBeFocused();
    await page.getByTestId('context-confirm').click();
    await expect(page.getByTestId('context-action')).toHaveText('confirmed:3');
    await expect(page.getByTestId('context-menu')).toBeHidden();

    await scope.locator('.s-table-row[data-row-key="2"]').click({ button: 'right' });
    await expect(page.getByTestId('context-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('context-menu')).toBeHidden();
  });
});

test.describe('拖拽与列宽', () => {
  test('默认拖拽句柄在所有尺寸和树层级内居中', async ({ page }) => {
    const scope = page.getByTestId('tree-drag-table');
    for (const size of ['small', 'middle', 'large']) {
      await page.getByTestId('drag-size').selectOption(size);
      const offsets = await scope.locator('.s-table-drag-handle').evaluateAll((handles) =>
        handles.map((handle) => {
          const cell = handle.closest('td')!;
          const h = handle.getBoundingClientRect();
          const c = cell.getBoundingClientRect();
          return {
            x: Math.abs(h.x + h.width / 2 - c.x - c.width / 2),
            y: Math.abs(h.y + h.height / 2 - c.y - c.height / 2),
            display: getComputedStyle(cell).display,
          };
        })
      );
      expect(offsets.length).toBe(4);
      for (const offset of offsets) {
        expect(offset.x).toBeLessThanOrEqual(1);
        expect(offset.y).toBeLessThanOrEqual(1);
        expect(offset.display).toBe('table-cell');
      }
    }
  });

  for (const mode of ['off', 'cell']) {
    test(`树形真实拖拽在 ${mode} 模式不产生文本选区或单元格框选`, async ({ page }) => {
      const scope = page.getByTestId('tree-drag-table');
      await page.getByTestId('drag-range-mode').selectOption(mode);
      const source = scope.locator('.s-table-row[data-row-key="11"] .s-table-drag-handle');
      const target = scope.locator('.s-table-row[data-row-key="2"]');
      await source.hover();
      const box = (await source.boundingBox())!;
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 8, box.y + box.height / 2, { steps: 2 });
      await target.hover();
      await target.hover();
      await expect(target).toHaveClass(/s-table-row-drag-over-inside/);
      await page.mouse.up();
      await expect(page.getByTestId('tree-drop')).toHaveText('11:inside:2');
      expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('');
      expect(
        await scope.evaluate((el) =>
          Boolean(document.activeElement?.matches('td') && el.contains(document.activeElement))
        )
      ).toBe(false);
      await page.getByTestId('read-drag-range').click();
      await expect(page.getByTestId('tree-drag-range')).toHaveText('none');
      await expect(scope.locator('.s-table-cell-range-selected')).toHaveCount(0);
      await expect(scope.locator('.s-table-row-drag-source, .s-table-row-drag-over')).toHaveCount(
        0
      );
      await expect(page.locator('.s-table-drag-preview')).toHaveCount(0);
    });
  }

  for (const dark of [false, true]) {
    test(`拖拽源、虚线树落点及桥接预览保留${dark ? '局部暗色' : '浅色'}主题`, async ({
      page,
    }, testInfo) => {
      const scope = page.getByTestId('tree-drag-table');
      if (dark) await scope.evaluate((el) => el.classList.add('dark'));
      await scope.scrollIntoViewIfNeeded();
      const source = scope.locator('.s-table-row[data-row-key="1"]');
      const target = scope.locator('.s-table-row[data-row-key="2"]');
      const targetBox = (await target.boundingBox())!;
      const transfer = await page.evaluateHandle(() => new DataTransfer());
      await source
        .locator('.s-table-drag-handle')
        .dispatchEvent('dragstart', { dataTransfer: transfer });
      await target.dispatchEvent('dragover', {
        dataTransfer: transfer,
        clientY: targetBox.y + targetBox.height / 2,
      });
      await expect(source).toHaveClass(/s-table-row-drag-source/);
      await expect(target).toHaveClass(/s-table-row-drag-over-inside/);
      await expect
        .poll(() =>
          source
            .locator('td[data-column-id="name"]')
            .evaluate((el) => getComputedStyle(el).backgroundColor)
        )
        .toBe(dark ? 'rgb(17, 26, 44)' : 'rgb(230, 244, 255)');
      expect(
        await target
          .locator('td[data-column-id="name"]')
          .evaluate((el) => getComputedStyle(el).backgroundImage)
      ).toContain('repeating-linear-gradient');
      expect(
        await target
          .locator('td')
          .first()
          .evaluate((el) => getComputedStyle(el).position)
      ).toBe('sticky');
      await scope.screenshot({
        path: testInfo.outputPath(`row-drag-${dark ? 'dark' : 'light'}.png`),
      });
      await source.dispatchEvent('dragend');
      const header = scope.locator('th[data-column-id="name"]');
      const destination = scope.locator('th[data-column-id="owner"]');
      // 仅关闭 DOM 原生 draggable，保留组件配置，强制真实鼠标走桥接路径。
      await header.evaluate((el) => el.setAttribute('draggable', 'false'));
      await header.hover();
      await page.mouse.down();
      await destination.hover();
      await expect(page.locator('.s-table-drag-preview')).toBeVisible();
      await expect(destination).toHaveClass(/s-table-header-cell-drag-over-after/);
      const indicator = destination.locator('.s-table-column-drop-indicator');
      await expect(indicator).toHaveCount(1);
      await expect(indicator).toHaveClass(/s-table-column-drop-indicator-after/);
      expect(await indicator.evaluate((el) => getComputedStyle(el).zIndex)).toBe('3');
      await expect(page.locator('.s-table-drag-preview')).toHaveCSS(
        'background-color',
        'rgb(255, 255, 255)'
      );
      await page.screenshot({
        path: testInfo.outputPath(`column-drag-${dark ? 'dark' : 'light'}.png`),
      });
      await page.mouse.up();
      await expect(page.locator('.s-table-drag-preview')).toHaveCount(0);
      await header.hover();
      await page.mouse.down();
      await destination.hover();
      await expect(destination).toHaveClass(/s-table-header-cell-drag-over-before/);
      await expect(destination.locator('.s-table-column-drop-indicator')).not.toHaveClass(
        /s-table-column-drop-indicator-after/
      );
      await page.keyboard.press('Escape');
      await page.mouse.up();
      await expect(page.locator('.s-table-drag-preview')).toHaveCount(0);
    });
  }

  test('HTML5 行拖拽重排数据并保留稳定 rowKey', async ({ page }) => {
    const scope = page.getByTestId('drag-resize-table');
    const source = scope.locator('.s-table-row[data-row-key="1"] .s-table-drag-handle');
    const target = scope.locator('.s-table-row[data-row-key="3"]');

    // 明确落在目标行下半区，避免行高奇偶导致中心点落在 before/after 边界上。
    await source.dragTo(target, { targetPosition: { x: 10, y: 35 } });
    await expect(page.getByTestId('drag-event')).toHaveText('0->2');
    await expect.poll(() => publicRowKeys(scope)).toEqual(['2', '3', '1', '4', '5']);
  });

  test('列拖拽更新 TanStack columnOrder 和实际单元格顺序', async ({ page }) => {
    const scope = page.getByTestId('drag-resize-table');
    const nameHeader = scope.locator('th[data-column-id="name"]');
    const scoreHeader = scope.locator('th[data-column-id="score"]');
    await nameHeader.scrollIntoViewIfNeeded();
    const sourceBox = await nameHeader.boundingBox();
    const targetBox = await scoreHeader.boundingBox();
    expect(sourceBox).not.toBeNull();
    expect(targetBox).not.toBeNull();

    const sourceX = sourceBox!.x + sourceBox!.width / 2;
    const sourceY = sourceBox!.y + sourceBox!.height / 2;
    await page.mouse.move(sourceX, sourceY);
    await page.mouse.down();
    // Chromium needs one move inside the source before crossing another draggable header.
    await page.mouse.move(sourceX + 8, sourceY, { steps: 2 });
    await page.mouse.move(
      targetBox!.x + targetBox!.width / 2,
      targetBox!.y + targetBox!.height / 2,
      {
        steps: 5,
      }
    );
    await page.mouse.up();
    await expect(page.getByTestId('column-event')).toHaveText('1->2:id,score,name');

    const userHeaders = scope.locator(
      'th[data-column-id="id"], th[data-column-id="score"], th[data-column-id="name"]'
    );
    await expect(userHeaders).toHaveText(['ID', 'Score', 'Name']);
    const firstRow = renderedRows(scope).first();
    await expect.poll(() => columnTexts(firstRow)).toEqual(['drag', '1', '90', 'Person 1']);
  });

  test('列行拖拽保持清晰源状态并真正触发 FLIP 过渡', async ({ page }) => {
    const scope = page.getByTestId('drag-resize-table');
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    const nameHeader = scope.locator('th[data-column-id="name"]');
    const scoreHeader = scope.locator('th[data-column-id="score"]');

    await nameHeader.dispatchEvent('dragstart', { dataTransfer });
    await scoreHeader.dispatchEvent('dragover', { dataTransfer });
    await expect(nameHeader).toHaveClass(/s-table-header-cell-drag-source/);
    await expect(page.locator('.s-table-header-cell-drag-preview')).toHaveCount(0);
    await expect.poll(() => nameHeader.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');

    await nameHeader.evaluate((element) => {
      element.addEventListener(
        'transitionrun',
        (event) => {
          if ((event as TransitionEvent).propertyName === 'transform') {
            element.setAttribute('data-transform-transition-started', 'true');
          }
        },
        { once: true }
      );
    });
    await scoreHeader.dispatchEvent('drop', { dataTransfer });
    await expect(nameHeader).toHaveAttribute('data-transform-transition-started', 'true');

    const rowSource = scope.locator('.s-table-row[data-row-key="1"] .s-table-drag-handle');
    const rowTarget = scope.locator('.s-table-row[data-row-key="3"]');
    const rowDataTransfer = await page.evaluateHandle(() => new DataTransfer());

    await rowSource.dispatchEvent('dragstart', { dataTransfer: rowDataTransfer });
    await rowTarget.dispatchEvent('dragover', { dataTransfer: rowDataTransfer });
    const sourceRow = rowSource.locator('xpath=ancestor::tr');
    await expect(sourceRow).toHaveClass(/s-table-row-drag-source/);
    await expect.poll(() => sourceRow.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    await expect
      .poll(() =>
        sourceRow
          .locator('td', { hasText: 'Person 1' })
          .evaluate((el) => getComputedStyle(el).boxShadow)
      )
      .toBe('none');

    await sourceRow.evaluate((element) => {
      element.addEventListener(
        'transitionrun',
        (event) => {
          if ((event as TransitionEvent).propertyName === 'transform') {
            element.setAttribute('data-transform-transition-started', 'true');
          }
        },
        { once: true }
      );
    });
    await rowTarget.dispatchEvent('drop', { dataTransfer: rowDataTransfer });
    await expect(rowSource.locator('xpath=ancestor::tr')).toHaveAttribute(
      'data-transform-transition-started',
      'true'
    );
  });

  test('拖拽句柄在句柄列内水平与垂直居中', async ({ page }) => {
    const scope = page.getByTestId('drag-resize-table');
    const cell = scope.locator('tbody td:has(> .s-table-drag-handle)').first();
    const metrics = await cell.evaluate((td) => {
      const handle = td.querySelector<HTMLElement>('.s-table-drag-handle')!;
      const cellRect = td.getBoundingClientRect();
      const handleRect = handle.getBoundingClientRect();
      return {
        left: handleRect.left - cellRect.left,
        right: cellRect.right - handleRect.right,
        top: handleRect.top - cellRect.top,
        bottom: cellRect.bottom - handleRect.bottom,
        paddingInline: getComputedStyle(td).paddingInlineStart,
        textAlign: getComputedStyle(td).textAlign,
      };
    });
    expect(metrics.paddingInline).toBe('4px');
    expect(metrics.textAlign).toBe('center');
    expect(Math.abs(metrics.left - metrics.right)).toBeLessThanOrEqual(1);
    expect(Math.abs(metrics.top - metrics.bottom)).toBeLessThanOrEqual(1);
  });

  test('选择列下拉与右键菜单共用 scale-down 入场过渡', async ({ page }) => {
    await page.evaluate(() => {
      const names: string[] = [];
      (window as unknown as { __menuTransitions: string[] }).__menuTransitions = names;
      document.addEventListener(
        'transitionrun',
        (event) => names.push((event as TransitionEvent).propertyName),
        true
      );
    });
    const transitions = () =>
      page.evaluate(() => (window as unknown as { __menuTransitions: string[] }).__menuTransitions);

    const selectionTable = page.getByTestId('selection-expand-table');
    await selectionTable.locator('.s-table-selection-dropdown-trigger').click();
    const selectionMenu = page.locator('.s-table-selection-dropdown-menu');
    await expect(selectionMenu).toBeVisible();
    await expect.poll(transitions).toContain('transform');

    const rangeTable = page.getByTestId('range-context-table');
    await rangeTable.locator('.s-table-row').first().click({ button: 'right' });
    const contextMenu = page.locator('.s-table-context-menu-inner');
    await expect(contextMenu).toBeVisible();
    await expect
      .poll(async () => (await transitions()).filter((name) => name === 'transform').length)
      .toBeGreaterThanOrEqual(2);
  });

  test('指针聚焦滚动容器时不会把焦点和页面滚动劫持到首行', async ({ page }) => {
    const table = page.getByTestId('range-context-table');
    const container = table.locator('.s-table-container');

    await container.scrollIntoViewIfNeeded();
    // 在真实指针事件中聚焦容器，等价于点击横向滚动条触发的聚焦。
    await table.evaluate((element) => {
      const trigger = document.createElement('button');
      trigger.id = 'pointer-focus-trigger';
      trigger.textContent = 'focus container';
      // 固定定位，避免点击按钮本身触发页面滚动，干扰断言。
      trigger.style.cssText = 'position: fixed; top: 8px; left: 8px; z-index: 99999';
      trigger.addEventListener('click', () =>
        element.querySelector<HTMLElement>('.s-table-container')?.focus()
      );
      element.prepend(trigger);
    });
    const before = await page.evaluate(() => window.scrollY);
    await page.locator('#pointer-focus-trigger').click();
    await page.waitForTimeout(100);

    const result = await page.evaluate(() => ({
      pageY: window.scrollY,
      activeClass: document.activeElement?.className ?? '',
    }));
    expect(result.pageY).toBe(before);
    expect(result.activeClass).toContain('s-table-container');
  });

  test('拖动 separator 后提交列宽并派发 resizeEnd', async ({ page }) => {
    const scope = page.getByTestId('drag-resize-table');
    const idHeader = scope.locator('th[data-column-id="id"]');
    const handle = idHeader.getByRole('separator');
    await handle.hover();
    const box = await handle.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 + 40, box!.y + box!.height / 2, { steps: 5 });
    await page.mouse.up();

    await expect(page.getByTestId('resize-event')).toHaveText('id:130');
    // 表格宽于显式列宽总和时浏览器会按比例扩展 computed width；这里验证组件提交的声明宽度。
    await expect(scope.locator('colgroup col').nth(1)).toHaveAttribute('style', /width: 130px/);

    await handle.focus();
    await handle.press('ArrowRight');
    await expect(handle).toHaveAttribute('aria-valuenow', '140');
    await expect(scope.locator('colgroup col').nth(1)).toHaveAttribute('style', /width: 140px/);
  });
});
