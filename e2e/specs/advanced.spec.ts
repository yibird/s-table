import { expect, openFixture, test } from '../support/test';

test.beforeEach(async ({ page }) => {
  await openFixture(page, 'advanced');
});

test('双击编辑提交不可变数据并派发编辑事件', async ({ page }) => {
  const scope = page.getByTestId('editing-table');
  const nameCell = scope.locator('.s-table-row[data-row-key="1"] td[data-column-id="name"]');

  await nameCell.dblclick();
  const editor = nameCell.locator('input.s-table-cell-editor');
  await expect(editor).toBeFocused();
  await editor.fill('Ada Lovelace');
  await editor.press('Enter');

  await expect(nameCell).toHaveText('Ada Lovelace');
  await expect(page.getByTestId('edit-event')).toHaveText('cell:1:Ada Lovelace:90');
});

test('树形数据展开并暴露 click/contextmenu/hover/keydown 事件', async ({ page }) => {
  const scope = page.getByTestId('tree-event-table');
  const childCell = scope.getByRole('cell', { name: 'Runtime', exact: true });

  await expect(scope.locator('.s-table-row')).toHaveCount(4);
  await childCell.hover();
  await expect(page.getByTestId('tree-event')).toHaveText('enter:11:name:1');
  await childCell.click();
  await expect(page.getByTestId('tree-event')).toHaveText('click:11:name:1');
  await childCell.click({ button: 'right' });
  await expect(page.getByTestId('tree-event')).toHaveText('context:11:name:1');
  await childCell.focus();
  await childCell.press('ArrowRight');
  await expect(page.getByTestId('tree-event')).toHaveText('key:11:ArrowRight');
});
