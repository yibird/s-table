// @vitest-environment node

import { describe, expect, it } from 'vite-plus/test';
import { createSSRApp, h, type Component } from 'vue';
import { renderToString } from 'vue/server-renderer';
import STable from '../../STable.vue';
import type { STableColumn } from '../../types';

interface Row {
  id: number;
  name: string;
}

describe('SSR', () => {
  it('在无浏览器全局对象的环境中渲染表格', async () => {
    const columns: STableColumn<Row>[] = [
      { id: 'id', accessorKey: 'id', header: 'ID' },
      { id: 'name', accessorKey: 'name', header: 'Name' },
    ];
    const app = createSSRApp({
      render: () =>
        h(STable as unknown as Component, {
          columns,
          dataSource: [{ id: 1, name: 'Ada' }],
          rowKey: 'id',
          pagination: false,
        }),
    });

    const html = await renderToString(app);

    expect(html).toContain('s-table');
    expect(html).toContain('Name');
    expect(html).toContain('Ada');
  });

  it('SSR 首屏应用 defaultExpandAllRows', async () => {
    interface TreeRow extends Row {
      children?: TreeRow[];
    }
    const columns: STableColumn<TreeRow>[] = [{ id: 'name', accessorKey: 'name', header: 'Name' }];
    const app = createSSRApp({
      render: () =>
        h(STable as unknown as Component, {
          columns,
          dataSource: [{ id: 1, name: 'Parent', children: [{ id: 2, name: 'SSR Child' }] }],
          rowKey: 'id',
          tree: { childrenColumnName: 'children' },
          defaultExpandAllRows: true,
        }),
    });

    const html = await renderToString(app);

    expect(html).toContain('Parent');
    expect(html).toContain('SSR Child');
  });
});
