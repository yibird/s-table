import { afterEach, describe, expect, it } from 'vite-plus/test';
import { h, nextTick, type App } from 'vue';
import { mountSTable } from '../helpers';
import { EXPAND_COLUMN_ID } from '../../constants';
import type { STableColumn, STableExpandIconContext } from '../../types';

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

const mount = async (props: Record<string, unknown>) => {
  const mounted = mountSTable<Row>({
    columns,
    dataSource: [{ id: 1, name: 'a' }],
    rowKey: 'id',
    expandable: {},
    ...props,
  } as never);
  app = mounted.app;
  host = mounted.host;
  await nextTick();
};

describe('展开细节', () => {
  it('自定义 expandIcon 获得行上下文并可展开', async () => {
    const calls: STableExpandIconContext<Row>[] = [];
    await mount({
      expandable: {
        expandIcon: (context: STableExpandIconContext<Row>) => {
          calls.push(context);
          return h('span', { class: 'custom-expand-icon' }, context.expanded ? '-' : '+');
        },
      },
    });

    const icon = host!.querySelector<HTMLElement>('.custom-expand-icon')!;
    expect(calls[0]).toMatchObject({ expanded: false, expandable: true, rowIndex: 0 });
    expect(icon.textContent).toBe('+');
    icon.closest('button')!.click();
    await nextTick();
    expect(host!.querySelector('.s-table-expand-trigger-expanded')).not.toBeNull();
    expect(calls.some((context) => context.expanded)).toBe(true);
  });

  it('expandIconColumnIndex 控制展开列插入位置', async () => {
    // 固定列会被 TanStack 重排到左侧，索引定位需要关闭固定。
    await mount({ expandable: { expandIconColumnIndex: 1, expandFixed: false } });
    const ids = Array.from(host!.querySelectorAll('thead th[data-column-id]')).map((cell) =>
      cell.getAttribute('data-column-id')
    );
    expect(ids).toEqual(['id', EXPAND_COLUMN_ID, 'name']);
  });

  it('expandFixed 优先于 fixed 并支持右侧固定', async () => {
    await mount({ expandable: { fixed: false, expandFixed: 'right' } });
    const expandHeader = host!.querySelector<HTMLElement>(
      `thead th[data-column-id="${EXPAND_COLUMN_ID}"]`
    )!;
    expect(expandHeader.classList.contains('s-table-cell-fixed-right')).toBe(true);
  });
});
