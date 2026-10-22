import { describe, it, expect } from 'vite-plus/test';
import { nextTick, shallowRef } from 'vue';
import { useSortFilter } from '../../hooks/useSortFilter';
import type { STableColumn } from '../../types';

interface Row {
  id: number;
  name: string;
}

describe('useSortFilter 受控 filteredValue 回归', () => {
  it('移除 filteredValue 后旧值不会复活', async () => {
    const filtered = shallowRef<Array<'active' | 'inactive'> | undefined>(['active']);
    const columns = shallowRef<STableColumn<Row>[]>([
      { id: 'id', accessorKey: 'id' },
      {
        id: 'name',
        accessorKey: 'name',
        filters: [
          { text: 'Active', value: 'active' },
          { text: 'Inactive', value: 'inactive' },
        ],
        filteredValue: filtered.value,
        onFilter: (value, record) => (value === 'active' ? record.id === 1 : record.id === 2),
      },
    ]);
    const state = useSortFilter<Row>({ columns });

    expect([...(state.filterState.value.get('name') ?? [])]).toEqual(['active']);

    // 模拟 TanStack 经 onColumnFiltersChange 回写内部状态（覆盖层值参与回写）。
    state.onColumnFiltersChange(() => [
      {
        id: 'name',
        value: { values: ['active'] },
      },
    ]);
    await nextTick();

    // 父层释放控制：filteredValue 变 undefined，旧值不应复活为活动过滤。
    filtered.value = undefined;
    columns.value = [
      { id: 'id', accessorKey: 'id' },
      {
        id: 'name',
        accessorKey: 'name',
        filters: [
          { text: 'Active', value: 'active' },
          { text: 'Inactive', value: 'inactive' },
        ],
        onFilter: (value, record) => (value === 'active' ? record.id === 1 : record.id === 2),
      },
    ];
    await nextTick();

    expect(state.filterState.value.get('name')).toBeUndefined();
  });

  it('受控变化 active -> inactive 仍然生效', async () => {
    const filtered = shallowRef<Array<'active' | 'inactive'> | undefined>(['active']);
    const buildColumns = (): STableColumn<Row>[] => [
      { id: 'id', accessorKey: 'id' },
      {
        id: 'name',
        accessorKey: 'name',
        filters: [{ text: 'Active', value: 'active' }],
        filteredValue: filtered.value,
        onFilter: () => true,
      },
    ];
    const columns = shallowRef<STableColumn<Row>[]>(buildColumns());
    const state = useSortFilter<Row>({ columns });
    expect([...(state.filterState.value.get('name') ?? [])]).toEqual(['active']);

    filtered.value = ['inactive'];
    columns.value = buildColumns();
    await nextTick();
    expect([...(state.filterState.value.get('name') ?? [])]).toEqual(['inactive']);
  });
});

describe('useSortFilter 受控/非受控并存', () => {
  interface Row2 {
    id: number;
    name: string;
    dept: string;
  }
  const filters = [
    { text: 'A', value: 'A' },
    { text: 'B', value: 'B' },
  ];
  const build = (filtered: 'A' | 'B' | undefined): STableColumn<Row2>[] => [
    { id: 'id', accessorKey: 'id' },
    {
      id: 'name',
      accessorKey: 'name',
      filters,
      ...(filtered === undefined ? {} : { filteredValue: [filtered] }),
      onFilter: () => true,
    },
    { id: 'dept', accessorKey: 'dept', filters, onFilter: () => true },
  ];

  it('操作非受控列不会把受控列的值固化进内部状态', async () => {
    const filtered = shallowRef<'A' | 'B' | undefined>('A');
    const columns = shallowRef<STableColumn<Row2>[]>(build(filtered.value));
    const state = useSortFilter<Row2>({ columns });

    state.setFilter('dept', ['B']);
    expect([...state.filterState.value.get('dept')!]).toEqual(['B']);

    filtered.value = undefined;
    columns.value = build(undefined);
    await nextTick();

    expect(state.filterState.value.get('name')).toBeUndefined();
    expect([...state.filterState.value.get('dept')!]).toEqual(['B']);
  });

  it('clearFilter 清除非受控列、保留受控列', async () => {
    const filtered = shallowRef<'A' | 'B' | undefined>('A');
    const columns = shallowRef<STableColumn<Row2>[]>(build(filtered.value));
    const state = useSortFilter<Row2>({ columns });

    state.setFilter('dept', ['B']);
    state.clearFilter();
    await nextTick();

    expect(state.filterState.value.get('dept')).toBeUndefined();
    expect([...state.filterState.value.get('name')!]).toEqual(['A']);
  });

  it('clearFilterByColumn 忽略受控列', async () => {
    const filtered = shallowRef<'A' | 'B' | undefined>('A');
    const columns = shallowRef<STableColumn<Row2>[]>(build(filtered.value));
    const state = useSortFilter<Row2>({ columns });

    state.clearFilterByColumn('name');
    await nextTick();

    expect([...state.filterState.value.get('name')!]).toEqual(['A']);
  });
});
