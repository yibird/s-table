import type { Locator } from '@playwright/test';

export const renderedRows = (scope: Locator): Locator => scope.locator('tbody .s-table-row');

export const publicRowKeys = async (scope: Locator): Promise<string[]> =>
  renderedRows(scope).evaluateAll((rows) =>
    rows.map((row) => (row as HTMLElement).dataset.rowKey ?? '')
  );

export const columnTexts = async (row: Locator): Promise<string[]> =>
  row.locator('td').evaluateAll((cells) => cells.map((cell) => cell.textContent?.trim() ?? ''));
