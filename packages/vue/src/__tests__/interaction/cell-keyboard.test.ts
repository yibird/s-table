import { afterEach, describe, expect, it } from 'vite-plus/test';
import { nextTick, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn } from '../../types';

interface Row {
  id: number;
  name: string;
}

let app: App | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('单元格键盘事件', () => {
  it('cellKeydown 调用 preventDefault 后不会触发内置方向键导航', async () => {
    const columns: STableColumn<Row>[] = [
      { id: 'id', accessorKey: 'id', header: 'ID' },
      { id: 'name', accessorKey: 'name', header: 'Name' },
    ];
    const mounted = mountSTable<Row>({
      columns,
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
      onCellKeydown: ({ event }: { event: KeyboardEvent }) => event.preventDefault(),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const cells = host.querySelectorAll<HTMLTableCellElement>('tbody td[data-column-id]');
    cells[0]!.focus();
    cells[0]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    );

    expect(document.activeElement).toBe(cells[0]);
  });
});
