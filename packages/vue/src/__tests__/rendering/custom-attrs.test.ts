import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { nextTick, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn } from '../../types';

interface Row {
  id: number;
  name: string;
}

const columns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: 'Name' },
];

let app: App | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('customRow / customCell / customHeaderCell', () => {
  it('注入 tr / td / th 属性并合并 class、style 与事件', async () => {
    const cellClick = vi.fn();
    const rowClick = vi.fn();
    const mounted = mountSTable<Row>({
      columns,
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
      customRow: () => ({
        'data-test-row': 'yes',
        class: 'user-row',
        style: { outline: '1px solid red' },
        onClick: rowClick,
        'data-row-id': 'hijacked',
        colspan: 99,
      }),
      customCell: (record: Row, rowIndex: number, column: STableColumn<Row>) =>
        column.id === 'name'
          ? {
              'data-test-cell': `${rowIndex}-${record.id}`,
              class: 'user-cell',
              onClick: cellClick,
              colspan: 99,
            }
          : undefined,
      customHeaderCell: (column: STableColumn<Row>) =>
        column.id === 'name' ? { 'data-test-header': 'yes', title: 'Name column' } : undefined,
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const row = host.querySelector<HTMLElement>('tbody tr.s-table-row')!;
    expect(row.getAttribute('data-test-row')).toBe('yes');
    expect(row.classList.contains('user-row')).toBe(true);
    expect(row.style.outline).toContain('red');
    // 保留属性不可被覆盖。
    expect(row.getAttribute('data-row-id')).toBe('n:1');
    row.click();
    expect(rowClick).toHaveBeenCalledTimes(1);

    const nameCell = row.querySelector<HTMLElement>('td[data-column-id="name"]')!;
    expect(nameCell.getAttribute('data-test-cell')).toBe('0-1');
    expect(nameCell.classList.contains('user-cell')).toBe(true);
    expect(nameCell.getAttribute('colspan')).toBeNull();
    nameCell.click();
    expect(cellClick).toHaveBeenCalledTimes(1);

    const header = host.querySelector<HTMLElement>('th[data-column-id="name"]')!;
    expect(header.getAttribute('data-test-header')).toBe('yes');
    expect(header.getAttribute('title')).toBe('Name column');
  });
});
