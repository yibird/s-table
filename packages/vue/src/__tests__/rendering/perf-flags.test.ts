import { afterEach, describe, expect, it } from 'vite-plus/test';
import { nextTick, reactive, shallowReactive, type App } from 'vue';
import { mountSTable } from '../helpers';
import { createCellRenderCache } from '../../components/body/cellRenderCache';
import type { Cell, TableFeatures } from '@tanstack/vue-table';
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

describe('性能开关', () => {
  it('deepWatchDataSource 让嵌套字段原地修改触发更新', async () => {
    const state = reactive({
      data: [{ id: 1, name: 'a' }] as Row[],
    });
    const mounted = mountSTable<Row>(() => ({
      columns: [{ id: 'name', accessorKey: 'name', header: 'Name' }],
      dataSource: state.data,
      rowKey: 'id',
      deepWatchDataSource: true,
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(host.querySelector('tbody td')?.textContent?.trim()).toBe('a');
    state.data[0]!.name = 'changed';
    await nextTick();
    expect(host.querySelector('tbody td')?.textContent?.trim()).toBe('changed');
  });

  it('deepWatchColumns 让列配置原地修改触发重新归一化', async () => {
    const columns = shallowReactive<STableColumn<Row>[]>([
      { id: 'name', accessorKey: 'name', header: 'Name' },
    ]);
    const mounted = mountSTable<Row>(() => ({
      columns,
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
      deepWatchColumns: true,
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(host.querySelector('thead th')?.textContent?.trim()).toBe('Name');
    columns[0] = { ...columns[0]!, header: 'Renamed' };
    await nextTick();
    expect(host.querySelector('thead th')?.textContent?.trim()).toBe('Renamed');
  });

  it('ignoreCellKey 复用同一渲染状态并忽略行索引变化', () => {
    const cache = createCellRenderCache<Row>({ ignoreCellKey: () => true });
    const cell = {
      row: { id: 'n:1', original: { id: 1, name: 'a' } },
      column: { id: 'name' },
      getContext: () => ({ value: 'a' }),
    } as unknown as Cell<TableFeatures, Row>;
    const render = () => 'x';
    const columnToken = [render];
    const columnSetToken = ['name'];
    const dataSourceToken: unknown[] = [];
    const first = cache(cell, {
      render,
      columnToken,
      columnSetToken,
      dataSourceToken,
      rowIndex: 0,
    });
    const second = cache(cell, {
      render,
      columnToken,
      columnSetToken,
      dataSourceToken,
      rowIndex: 1,
    });
    expect(second).toBe(first);
  });
});
