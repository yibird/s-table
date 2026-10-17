import { afterEach, describe, expect, it } from 'vitest';
import { nextTick, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { PaginationPlacement, STableColumn } from '../../types';

interface Row {
  id: number;
}

let app: App | null = null;
let host: HTMLElement | null = null;

const columns: STableColumn<Row>[] = [{ id: 'id', accessorKey: 'id', header: 'ID' }];
const dataSource = Array.from({ length: 20 }, (_, index) => ({ id: index + 1 }));

const placements: PaginationPlacement[] = [
  'topStart',
  'topCenter',
  'topEnd',
  'bottomStart',
  'bottomCenter',
  'bottomEnd',
];

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('pagination placement', () => {
  it.each(placements)('uses semantic placement class for %s', async (placement) => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      pagination: true,
      paginationPlacement: placement,
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const root = host.querySelector<HTMLElement>('.s-table')!;
    const wrapper = root.querySelector<HTMLElement>('.s-table-pagination-wrapper')!;
    const scrollShell = root.querySelector<HTMLElement>('.s-table-scroll-shell')!;
    const children = Array.from(root.children);

    expect(wrapper.classList.contains(`s-table-pagination-wrapper-${placement}`)).toBe(true);
    expect(wrapper.hasAttribute('style')).toBe(false);
    expect(children.indexOf(wrapper) < children.indexOf(scrollShell)).toBe(
      placement.startsWith('top')
    );
  });
});
