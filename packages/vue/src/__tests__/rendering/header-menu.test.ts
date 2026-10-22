import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { h, nextTick, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn, STableHeaderMenuContext } from '../../types';

interface Row {
  id: number;
  name: string;
}

let app: App | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  app?.unmount();
  host?.remove();
  document.querySelectorAll('.s-table-header-menu-popup').forEach((element) => element.remove());
  app = null;
  host = null;
});

describe('表头通用菜单', () => {
  it('点击触发按钮打开自定义内容，并可调用 close 关闭', async () => {
    const contexts: STableHeaderMenuContext<Row>[] = [];
    const columns: STableColumn<Row>[] = [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        showMenu: true,
        menuPopup: (context: STableHeaderMenuContext<Row>) => {
          contexts.push(context);
          return h('button', { class: 'menu-action', onClick: () => context.close() }, 'Hide');
        },
      },
    ];
    const mounted = mountSTable<Row>({
      columns,
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const trigger = host.querySelector<HTMLElement>('.s-table-header-menu-trigger')!;
    expect(trigger).not.toBeNull();
    trigger.click();
    await nextTick();

    const popup = document.querySelector<HTMLElement>('.s-table-header-menu-popup')!;
    expect(popup).not.toBeNull();
    expect(contexts[0]?.columnId).toBe('name');
    expect(popup.querySelector('.menu-action')?.textContent).toBe('Hide');

    popup.querySelector<HTMLElement>('.menu-action')!.click();
    await nextTick();
    expect(trigger.classList.contains('s-table-header-menu-trigger-open')).toBe(false);
  });

  it('打开后聚焦首个菜单项，Escape 关闭菜单', async () => {
    const mounted = mountSTable<Row>({
      columns: [
        {
          id: 'name',
          accessorKey: 'name',
          header: 'Name',
          showMenu: true,
          menuPopup: () => h('button', { class: 'menu-action', type: 'button' }, 'Action'),
        },
      ],
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host.querySelector<HTMLElement>('.s-table-header-menu-trigger')!.click();
    await nextTick();
    await nextTick();

    const popup = document.querySelector<HTMLElement>('.s-table-header-menu-popup')!;
    const action = popup.querySelector<HTMLElement>('.menu-action')!;
    expect(document.activeElement).toBe(action);

    action.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();
    // happy-dom 不执行完整的过渡动画，退场节点会短暂保留；以 isOpen 状态为准。
    expect(
      host!
        .querySelector<HTMLElement>('.s-table-header-menu-trigger')!
        .getAttribute('aria-expanded')
    ).toBe('false');
  });

  it('未提供 menuPopup 时不渲染入口', async () => {
    const mounted = mountSTable<Row>({
      columns: [{ id: 'name', accessorKey: 'name', header: 'Name', showMenu: true }],
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();
    expect(host.querySelector('.s-table-header-menu-trigger')).toBeNull();
  });

  it('点击菜单入口不会触发排序', async () => {
    const toggle = vi.fn();
    const mounted = mountSTable<Row>({
      columns: [
        {
          id: 'name',
          accessorKey: 'name',
          header: 'Name',
          sorter: true,
          showMenu: true,
          menuPopup: () => h('span', 'menu'),
        },
      ],
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
      onSortChange: toggle,
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host.querySelector<HTMLElement>('.s-table-header-menu-trigger')!.click();
    await nextTick();
    expect(toggle).not.toHaveBeenCalled();
  });
});
