import { describe, expect, it } from 'vitest';
import { filterFn_includesString } from '@tanstack/table-core';
import {
  getCellRenderToken,
  normalizeColumnState,
  resolveColumnId,
  retainEqualCellRenderTokens,
  type STableColumnLike,
} from '../index';

interface User {
  id: number;
  name: string;
  team: string;
}

type TestColumn = STableColumnLike<User>;

const normalize = (columns: TestColumn[]) =>
  normalizeColumnState<User, unknown, TestColumn>(columns);

describe('framework-agnostic column pipeline', () => {
  it('resolves column ids with the same nested-path rule as TanStack', () => {
    expect(resolveColumnId({ id: 'explicit' })).toBe('explicit');
    expect(resolveColumnId({ accessorKey: 'profile.name' })).toBe('profile_name');
    expect(resolveColumnId({ dataIndex: 'profile.name' })).toBe('profile_name');
    expect(resolveColumnId({})).toBeUndefined();
  });

  it('normalizes Ant Design style dataIndex into a TanStack accessor', () => {
    const { normalizedColumns, metadata } = normalize([
      { dataIndex: 'name', header: '姓名' },
      { dataIndex: 'team', accessorKey: 'id', header: '优先 accessorKey' },
    ]);
    const [nameColumn, preferredColumn] = normalizedColumns as unknown as Array<{
      id: string;
      accessorKey?: string;
    }>;

    expect(nameColumn!.id).toBe('name');
    expect(nameColumn!.accessorKey).toBe('name');
    expect(preferredColumn!.id).toBe('id');
    expect(preferredColumn!.accessorKey).toBe('id');
    expect(metadata.columnMap.get('name')?.header).toBe('姓名');
  });

  it('maps sizing, pinning, visibility and spanning into metadata', () => {
    const { normalizedColumns, metadata } = normalize([
      {
        accessorKey: 'id',
        header: 'ID',
        width: 80,
        fixed: 'left',
        resizable: true,
        sorter: true,
        spanRows: () => 1,
      },
      {
        id: 'group',
        header: '组合列',
        fixed: 'right',
        columns: [
          { accessorKey: 'name', header: '姓名', hidden: true },
          { accessorKey: 'team', header: '团队', maxWidth: 100 },
        ],
      },
    ]);

    const [idColumn, groupColumn] = normalizedColumns as unknown as Array<{
      id: string;
      size?: number;
      minSize?: number;
      maxSize?: number;
      enableResizing: boolean;
      enableSorting: boolean;
      enableColumnFilter: boolean;
      enableGrouping: boolean;
      columns?: Array<{ id: string; size?: number }>;
    }>;

    expect(idColumn!.id).toBe('id');
    expect(idColumn!.size).toBe(80);
    expect(idColumn!.enableResizing).toBe(true);
    expect(idColumn!.enableSorting).toBe(true);
    expect(groupColumn!.columns?.map((column) => column.id)).toEqual(['name', 'team']);

    expect(metadata.columnPinning.start).toEqual(['id']);
    expect(metadata.columnPinning.end).toEqual(['name', 'team']);
    expect(metadata.columnVisibility.name).toBe(false);
    expect(metadata.hasCellSpanning).toBe(true);
    // 分组列继承 fixed，叶子列固定宽度默认 150。
    expect(metadata.explicitMinWidth).toBe(80 + 150 + 100);
    expect(metadata.columnMap.get('id')?.header).toBe('ID');
    expect(metadata.columnMap.get('group')?.header).toBe('组合列');
  });

  it('wraps user sorter so business code only sees original records', () => {
    const { normalizedColumns } = normalize([
      {
        accessorKey: 'id',
        sorter: (a, b) => a.id - b.id,
      },
    ]);
    const sortFn = (
      normalizedColumns[0] as unknown as {
        sortFn: (a: { original: User }, b: { original: User }) => number;
      }
    ).sortFn;

    expect(
      sortFn(
        { original: { id: 2, name: 'b', team: 'B' } },
        { original: { id: 1, name: 'a', team: 'A' } }
      )
    ).toBe(1);
  });

  it('uses the built-in search filter for plain text search and keeps filterValue contract for custom filters', () => {
    const { normalizedColumns } = normalize([
      { accessorKey: 'name', search: true },
      {
        accessorKey: 'team',
        filters: [{ value: 'A', label: 'A' }],
        onFilter: (value, record) => record.team === value,
      },
    ]);

    expect((normalizedColumns[0] as unknown as { filterFn: unknown }).filterFn).toBe(
      filterFn_includesString
    );

    const filterFn = (
      normalizedColumns[1] as unknown as {
        filterFn: (
          row: { original: User; getValue: (columnId: string) => unknown },
          columnId: string,
          value: unknown
        ) => boolean;
      }
    ).filterFn;
    const row = (record: User) => ({
      original: record,
      getValue: (columnId: string) => record[columnId as keyof User],
    });

    expect(filterFn(row({ id: 1, name: 'Ada', team: 'A' }), 'team', { values: ['A'] })).toBe(true);
    expect(filterFn(row({ id: 1, name: 'Ada', team: 'A' }), 'team', { values: ['B'] })).toBe(false);
  });

  it('keeps enum filtering working without a user onFilter by matching accessor values', () => {
    const { normalizedColumns } = normalize([
      { accessorKey: 'team', filters: [{ value: 'A', label: 'A' }] },
    ]);
    const filterFn = (
      normalizedColumns[0] as unknown as {
        filterFn: (
          row: { original: User; getValue: (columnId: string) => unknown },
          columnId: string,
          value: unknown
        ) => boolean;
      }
    ).filterFn;

    expect(
      filterFn({ original: { id: 1, name: 'Ada', team: 'A' }, getValue: () => 'A' }, 'team', {
        values: ['A'],
        valueSet: new Set(['A']),
      })
    ).toBe(true);
    expect(
      filterFn({ original: { id: 1, name: 'Ada', team: 'A' }, getValue: () => 'A' }, 'team', {
        values: ['B'],
        valueSet: new Set(['B']),
      })
    ).toBe(false);
  });

  it('exposes custom aggregation as a stable (values, records) callback', () => {
    const aggregated: Array<{ values: unknown[]; records: User[] }> = [];
    const { normalizedColumns } = normalize([
      {
        accessorKey: 'id',
        aggregation: (values: unknown[], records: User[]) => {
          aggregated.push({ values, records });
          return values.reduce((sum: number, value: unknown) => sum + Number(value), 0);
        },
      },
    ]);
    const aggregationFn = (
      normalizedColumns[0] as unknown as {
        aggregationFn: {
          aggregate: (context: {
            rows: ReadonlyArray<{ original: User }>;
            getValue: (row: never) => unknown;
          }) => unknown;
        };
      }
    ).aggregationFn;

    const rows = [
      { original: { id: 1, name: 'Ada', team: 'A' } },
      { original: { id: 2, name: 'Grace', team: 'A' } },
    ];
    const result = aggregationFn.aggregate({
      rows,
      getValue: (row: never) => (row as unknown as { original: User }).original.id,
    });

    expect(result).toBe(3);
    expect(aggregated[0]!.values).toEqual([1, 2]);
    expect(aggregated[0]!.records.map((record) => record.name)).toEqual(['Ada', 'Grace']);
  });

  it('retains unchanged cell render token references across normalizations', () => {
    const columns: TestColumn[] = [
      { accessorKey: 'id', header: 'ID' },
      { accessorKey: 'name', header: '姓名' },
    ];
    const first = normalize(columns).metadata.cellRenderToken;
    const second = normalize(columns).metadata.cellRenderToken;
    const retained = retainEqualCellRenderTokens(first, second);

    expect(retained.get('id')).toBe(first.get('id'));
    expect(retained.get('name')).toBe(first.get('name'));
    expect(retained).toBe(first);

    const changed = normalize([{ accessorKey: 'id', header: '编号' }, columns[1]!]).metadata
      .cellRenderToken;
    const retainedAfterChange = retainEqualCellRenderTokens(first, changed);
    expect(retainedAfterChange.get('id')).not.toBe(first.get('id'));
    expect(retainedAfterChange.get('name')).toBe(first.get('name'));
  });

  it('cell render token covers every public column field', () => {
    const base: TestColumn = {
      id: 'base',
      header: 'h',
      footer: 'f',
      meta: {},
      accessorKey: 'name',
      dataIndex: 'displayName',
      accessorFn: (record) => record.name,
      cell: 'c',
      width: 1,
      minWidth: 2,
      maxWidth: 3,
      align: 'left',
      fixed: 'left',
      draggable: true,
      resizable: true,
      hidden: true,
      sorter: true,
      sortDirections: ['ascend'],
      defaultSortOrder: 'ascend',
      sortOrder: 'descend',
      filters: [],
      onFilter: () => true,
      filterMode: 'checkbox',
      filterMultiple: true,
      defaultFilteredValues: ['a'],
      filteredValue: ['b'],
      search: true,
      editable: true,
      editableTrigger: 'click',
      editor: 'text',
      valueParser: () => 1,
      valueSetter: () => ({ id: 1, name: 'x', team: 'A' }),
      spanRows: () => 1,
      spanColumns: () => 1,
      onCell: () => ({ colSpan: 1 }),
      groupable: true,
      getGroupingValue: () => 1,
      aggregation: 'sum',
      aggregatedCell: 'ac',
    };
    const baseline = getCellRenderToken(base);

    // 任何公开语义字段变化都必须改变渲染 token，否则会出现脏渲染。
    const mutations: Array<[string, unknown]> = [
      ['id', 'other'],
      ['header', 'h2'],
      ['footer', 'f2'],
      ['meta', { align: 'right' }],
      ['accessorKey', 'otherKey'],
      ['dataIndex', 'otherIndex'],
      ['accessorFn', (record: User) => record.id],
      ['cell', 'c2'],
      ['width', 9],
      ['minWidth', 9],
      ['maxWidth', 9],
      ['align', 'right'],
      ['fixed', 'right'],
      ['draggable', false],
      ['resizable', false],
      ['hidden', false],
      ['sorter', false],
      ['sortDirections', ['descend']],
      ['defaultSortOrder', 'descend'],
      ['sortOrder', 'ascend'],
      ['filters', [{}]],
      ['onFilter', () => false],
      ['filterMode', 'menu'],
      ['filterMultiple', false],
      ['defaultFilteredValues', ['z']],
      ['filteredValue', ['z']],
      ['search', false],
      ['editable', false],
      ['editableTrigger', 'dblclick'],
      ['editor', 'number'],
      ['valueParser', () => 2],
      ['valueSetter', () => ({ id: 2, name: 'y', team: 'B' })],
      ['spanRows', () => 2],
      ['spanColumns', () => 2],
      ['onCell', () => ({ rowSpan: 1 })],
      ['groupable', false],
      ['getGroupingValue', () => 2],
      ['aggregation', 'count'],
      ['aggregatedCell', 'ac2'],
    ];

    for (const [field, value] of mutations) {
      const token = getCellRenderToken({ ...base, [field]: value } as TestColumn);
      expect(token, `字段 ${field} 必须参与渲染 token`).not.toEqual(baseline);
    }
  });
});
