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

  it.each([false, true])('ignoreCellKey=%s 仍按 Row 身份和数据/列代际失效', (ignoreCellKey) => {
    const cache = createCellRenderCache<Row>({ ignoreCellKey: () => ignoreCellKey });
    const record = { id: 1, name: 'a' };
    const createCell = () => {
      const row = { id: 'n:1', original: record };
      return {
        row,
        column: { id: 'name' },
        getContext: () => ({ row }),
      } as unknown as Cell<TableFeatures, Row>;
    };
    const firstCell = createCell();
    const secondCell = createCell();
    const dependencies = {
      render: () => 'x',
      columnToken: [],
      columnSetToken: ['name'],
      dataSourceToken: [record],
      rowIndex: 0,
    };
    const first = cache(firstCell, dependencies);
    expect(cache(firstCell, dependencies)).toBe(first);
    const second = cache(secondCell, dependencies);
    expect(second).not.toBe(first);
    expect(second.props).toEqual({ row: secondCell.row });
    expect(cache(secondCell, dependencies)).toBe(second);
    const nextData = { ...dependencies, dataSourceToken: [record] };
    const dataState = cache(secondCell, nextData);
    expect(dataState).not.toBe(second);
    expect(cache(secondCell, { ...nextData, columnSetToken: ['name'] })).not.toBe(dataState);
  });

  it('cell cache 按行 LRU 淘汰，缓存行数有界', () => {
    const cache = createCellRenderCache<Row>({ maxRows: 2 });
    const token = [{}];
    const render = () => 'x';
    const columnToken: unknown[] = [];
    const columnSetToken = ['name'];
    const dependencies = (rowIndex = 0) => ({
      render,
      columnToken,
      columnSetToken,
      dataSourceToken: token,
      rowIndex,
    });
    const makeCell = (id: number) => {
      const record = { id, name: `r${id}` };
      return {
        row: { id: `n:${id}`, original: record },
        column: { id: 'name' },
        getContext: () => ({ value: record.name }),
      } as unknown as Cell<TableFeatures, Row>;
    };

    const a = makeCell(1);
    const b = makeCell(2);
    const c = makeCell(3);
    const stateA = cache(a, dependencies());
    const stateB = cache(b, dependencies());
    expect(cache.getCachedRowCount()).toBe(2);

    // 命中 a 后 a 变为最近使用；插入 c 时应淘汰 b。
    expect(cache(a, dependencies())).toBe(stateA);
    cache(c, dependencies());
    expect(cache.getCachedRowCount()).toBe(2);
    expect(cache(a, dependencies())).toBe(stateA);
    expect(cache(b, dependencies())).not.toBe(stateB);
  });

  it('cell cache 在完整浏览大量记录后仍保持最大行数上限', () => {
    const cache = createCellRenderCache<Row>({ maxRows: 50 });
    const token = [{}];
    const dependencies = {
      render: () => 'x',
      columnToken: [],
      columnSetToken: ['name'],
      dataSourceToken: token,
      rowIndex: 0,
    };

    for (let index = 0; index < 1000; index++) {
      const record = { id: index, name: `r${index}` };
      cache(
        {
          row: { id: `n:${index}`, original: record },
          column: { id: 'name' },
          getContext: () => ({ value: record.name }),
        } as unknown as Cell<TableFeatures, Row>,
        dependencies
      );
    }

    expect(cache.getCachedRowCount()).toBe(50);

    // 数据/列代际切换后整代失效。
    cache(
      {
        row: { id: 'n:1', original: { id: 1, name: 'a' } },
        column: { id: 'name' },
        getContext: () => ({}),
      } as unknown as Cell<TableFeatures, Row>,
      { ...dependencies, dataSourceToken: [{}] }
    );
    expect(cache.getCachedRowCount()).toBe(1);
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
