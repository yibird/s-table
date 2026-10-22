import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { h, nextTick, ref, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn } from '../../types';

interface Row {
  id: number;
  name: string;
}

const columns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: 'Name', filters: [{ text: 'odd', value: 'odd' }] },
];

let app: App | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  app?.unmount();
  host?.remove();
  document
    .querySelectorAll('.s-table-filter-dropdown, .s-table-search-dropdown')
    .forEach((element) => element.remove());
  app = null;
  host = null;
});

describe('浮层容器与筛选面板配置', () => {
  it('getPopupContainer 决定筛选面板的挂载节点', async () => {
    const popupHost = document.createElement('div');
    document.body.appendChild(popupHost);
    try {
      const mounted = mountSTable<Row>({
        columns,
        dataSource: [{ id: 1, name: 'a' }],
        rowKey: 'id',
        getPopupContainer: () => popupHost,
      });
      app = mounted.app;
      host = mounted.host;
      await nextTick();

      host.querySelector<HTMLElement>('.s-table-filter-trigger')!.click();
      await nextTick();

      const dropdown = popupHost.querySelector<HTMLElement>('.s-table-filter-dropdown')!;
      expect(dropdown.parentElement).toBe(popupHost);
    } finally {
      popupHost.remove();
    }
  });

  it('filterIcon 支持静态 VNode 与函数形式', async () => {
    const icon = vi.fn(() =>
      h('span', { class: 'custom-filter-icon', 'data-active': String(icon.mock.calls.length) })
    );
    const mounted = mountSTable<Row>({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID' },
        {
          id: 'name',
          accessorKey: 'name',
          header: 'Name',
          filters: [{ text: 'odd', value: 'odd' }],
          filterIcon: icon,
        },
      ],
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(host.querySelector('.custom-filter-icon')).not.toBeNull();
    expect(icon).toHaveBeenCalledWith(
      expect.objectContaining({ columnId: 'name', active: false, filteredValues: [] })
    );
  });

  it('受控打开状态只派发事件，由 filterDropdownOpenKeys 驱动面板', async () => {
    const openKeys = ref<string[]>([]);
    const openChanges: Array<[string, boolean]> = [];
    const mounted = mountSTable<Row>(() => ({
      columns,
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
      filterDropdownOpenKeys: openKeys.value,
      onFilterDropdownOpenChange: (columnId: string, open: boolean) =>
        openChanges.push([columnId, open]),
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const trigger = host.querySelector<HTMLElement>('.s-table-filter-trigger')!;
    trigger.click();
    await nextTick();
    expect(openChanges).toEqual([['name', true]]);
    expect(document.querySelector('.s-table-filter-dropdown')).toBeNull();

    openKeys.value = ['name'];
    await nextTick();
    expect(document.querySelector('.s-table-filter-dropdown')).not.toBeNull();
  });
});
