import { afterEach, describe, expect, it } from 'vite-plus/test';
import { nextTick, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn, STableBreakpoint } from '../../types';

interface Row {
  id: number;
  name: string;
}

const columns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: 'Name', responsive: ['lg'] },
  { id: 'hidden', accessorKey: 'name', header: 'Hidden', responsive: ['lg'], hidden: true },
];

let app: App | null = null;
let host: HTMLElement | null = null;
const originalInnerWidth = window.innerWidth;

afterEach(() => {
  app?.unmount();
  host?.remove();
  Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true });
  app = null;
  host = null;
});

const mount = async (defaultBreakpoint: STableBreakpoint, width = 1024) => {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
  const mounted = mountSTable<Row>({
    columns,
    dataSource: [{ id: 1, name: 'a' }],
    rowKey: 'id',
    defaultBreakpoint,
  });
  app = mounted.app;
  host = mounted.host;
  await nextTick();
};

const headerIds = () =>
  Array.from(host!.querySelectorAll('thead th[data-column-id]')).map((cell) =>
    cell.getAttribute('data-column-id')
  );

describe('响应式列', () => {
  it('defaultBreakpoint 未命中时隐藏 responsive 列', async () => {
    await mount('xs', 400);
    expect(headerIds()).toEqual(['id']);
  });

  it('defaultBreakpoint 命中时显示 responsive 列，hidden 仍优先', async () => {
    await mount('lg');
    expect(headerIds()).toEqual(['id', 'name']);
  });
});
