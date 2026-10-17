import { describe, expect, it } from 'vitest';
import { escapeDelimitedValue, serializeDelimitedCell, serializeDelimitedRows } from '../clipboard';
import {
  moveColumnOrder,
  moveColumnOrderByIndex,
  normalizeColumnOrder,
  swapColumnOrder,
} from '../columns/order';
import {
  DEFAULT_ESTIMATE_SIZE,
  DEFAULT_OVERSCAN,
  resolveEstimateSize,
  resolveFixedRowHeight,
  resolveOverscan,
  resolveSpacerHeights,
} from '../scroll/virtualWindow';
import {
  DEFAULT_PAGE_SIZE,
  normalizePositiveInteger,
  normalizeTotal,
  resolvePageCount,
  resolvePageSizeChange,
  resolvePaginationTotal,
  resolveTanStackPagination,
} from '../state/pagination';
import {
  filterExistingRowKeys,
  resolveRowStateEntries,
  selectableRows,
  selectRowsByParity,
} from '../state/selection';
import { removeInvalidSortEntries, sameSortEntries, toggleSortEntry } from '../state/sorting';

describe('clipboard', () => {
  it('按 RFC 4180 转义分隔符、引号与换行', () => {
    expect(escapeDelimitedValue('plain', ',')).toBe('plain');
    expect(escapeDelimitedValue('a,b', ',')).toBe('"a,b"');
    expect(escapeDelimitedValue('a"b', ',')).toBe('"a""b"');
    expect(escapeDelimitedValue('a\nb', ',')).toBe('"a\nb"');
    expect(escapeDelimitedValue('', ',')).toBe('');
  });

  it('默认阻止公式注入，可显式关闭', () => {
    expect(serializeDelimitedCell('=SUM(1,1)', { delimiter: ',' })).toBe(`"'=SUM(1,1)"`);
    expect(
      serializeDelimitedCell('=SUM(1,1)', { delimiter: ',', preventFormulaInjection: false })
    ).toBe('"=SUM(1,1)"');
    expect(serializeDelimitedCell(null, { delimiter: ',' })).toBe('');
  });

  it('二维矩阵按 CRLF 连接', () => {
    expect(
      serializeDelimitedRows(
        [
          ['a', 'b,c'],
          ['=x', 1],
        ],
        { delimiter: ',' }
      )
    ).toBe(`a,"b,c"\r\n'=x,1`);
  });
});

describe('pagination', () => {
  it('规范化页码、页大小与总数', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(10);
    expect(normalizePositiveInteger(undefined, 3)).toBe(3);
    expect(normalizePositiveInteger(0, 3)).toBe(3);
    expect(normalizePositiveInteger(2.9, 3)).toBe(2);
    expect(normalizeTotal(-1)).toBe(0);
    expect(normalizeTotal(4.8)).toBe(4);
  });

  it('总条数优先级：total > pageCount × pageSize > filteredTotal', () => {
    expect(
      resolvePaginationTotal({
        configuredTotal: 42,
        configuredPageCount: 9,
        filteredTotal: 100,
        pageSize: 10,
      })
    ).toBe(42);
    expect(
      resolvePaginationTotal({ configuredPageCount: 3, filteredTotal: 100, pageSize: 10 })
    ).toBe(30);
    expect(resolvePaginationTotal({ filteredTotal: 27, pageSize: 10 })).toBe(27);
  });

  it('页数至少为 1，pageIndex 会夹紧到有效范围', () => {
    expect(resolvePageCount(0, 10)).toBe(1);
    expect(resolvePageCount(21, 10)).toBe(3);
    expect(resolveTanStackPagination({ requestedPage: 99, pageSize: 10, total: 21 })).toEqual({
      pageIndex: 2,
      pageSize: 10,
    });
    expect(resolveTanStackPagination({ requestedPage: 0, pageSize: 10, total: 21 })).toEqual({
      pageIndex: 0,
      pageSize: 10,
    });
  });

  it('页大小变化时夹紧当前页；显式 pageCount 优先', () => {
    expect(
      resolvePageSizeChange({ currentPage: 5, currentPageSize: 10, nextPageSize: 50, total: 60 })
    ).toEqual({ page: 2, pageSize: 50 });
    expect(
      resolvePageSizeChange({
        currentPage: 5,
        currentPageSize: 10,
        nextPageSize: 50,
        total: 60,
        configuredPageCount: 10,
      })
    ).toEqual({ page: 5, pageSize: 50 });
  });
});

describe('sorting', () => {
  const directions = ['ascend', 'descend'] as const;

  it('none → ascend → descend → none', () => {
    const first = toggleSortEntry<'ascend' | 'descend'>([], 'name', directions);
    expect(first).toEqual([{ columnId: 'name', order: 'ascend' }]);
    const second = toggleSortEntry(first, 'name', directions);
    expect(second).toEqual([{ columnId: 'name', order: 'descend' }]);
    expect(toggleSortEntry(second, 'name', directions)).toEqual([]);
  });

  it('非多列模式只保留当前列，多列模式保留其他列', () => {
    const current = [{ columnId: 'a', order: 'ascend' as const }];
    expect(toggleSortEntry(current, 'b', directions)).toEqual([{ columnId: 'b', order: 'ascend' }]);
    expect(toggleSortEntry(current, 'b', directions, true)).toEqual([
      { columnId: 'a', order: 'ascend' },
      { columnId: 'b', order: 'ascend' },
    ]);
  });

  it('支持自定义方向子集', () => {
    expect(toggleSortEntry([], 'a', ['descend'] as const)).toEqual([
      { columnId: 'a', order: 'descend' },
    ]);
    expect(
      toggleSortEntry([{ columnId: 'a', order: 'descend' }], 'a', ['descend'] as const)
    ).toEqual([]);
  });

  it('清理失效排序列并比较状态', () => {
    const current = [
      { columnId: 'a', order: 'ascend' as const },
      { columnId: 'b', order: 'descend' as const },
    ];
    expect(removeInvalidSortEntries(current, (id) => id === 'b')).toEqual([
      { columnId: 'b', order: 'descend' },
    ]);
    expect(sameSortEntries(current, [...current])).toBe(true);
    expect(sameSortEntries(current, [{ columnId: 'a', order: 'descend' }])).toBe(false);
  });
});

describe('selection rules', () => {
  const rows = [
    { id: 'a', can: true },
    { id: 'b', can: false },
    { id: 'c', can: true },
    { id: 'd', can: true },
  ].map((row) => ({ id: row.id, getCanSelect: () => row.can }));

  it('按可见顺序选择奇偶行并跳过不可选行', () => {
    expect(selectRowsByParity(rows, 0).map((row) => row.id)).toEqual(['a', 'c']);
    expect(selectRowsByParity(rows, 1).map((row) => row.id)).toEqual(['d']);
  });

  it('筛选可选行与已存在行键', () => {
    expect(selectableRows(rows).map((row) => row.id)).toEqual(['a', 'c', 'd']);
    expect(filterExistingRowKeys(['a', 'x'], (key) => key === 'a')).toEqual(['a']);
  });

  it('行状态按树路径排序，并可保留已缺失的键', () => {
    const model = {
      rowsById: {
        root: { id: 'root', index: 0 },
        childA: { id: 'childA', index: 0, parentId: 'root' },
        childB: { id: 'childB', index: 1, parentId: 'root' },
        next: { id: 'next', index: 1 },
      },
      flatRows: [
        { id: 'root', index: 0 },
        { id: 'childA', index: 0, parentId: 'root' },
        { id: 'childB', index: 1, parentId: 'root' },
        { id: 'next', index: 1 },
      ],
    };
    const state = { next: true, childB: true, childA: true, missing: true };
    expect(resolveRowStateEntries(state, model, true).map((entry) => entry.key)).toEqual([
      'childA',
      'childB',
      'next',
      'missing',
    ]);
    expect(resolveRowStateEntries(state, model, false).map((entry) => entry.key)).toEqual([
      'childA',
      'childB',
      'next',
    ]);
  });
});

describe('column order', () => {
  it('去重、剔除未知 ID 并按声明顺序补齐缺失项', () => {
    expect(normalizeColumnOrder(['b', 'x', 'b'], ['a', 'b', 'c'])).toEqual(['b', 'a', 'c']);
  });

  it('交换 / 移动 / 按索引移动', () => {
    expect(swapColumnOrder(['a', 'b', 'c'], 'a', 'c')).toEqual(['c', 'b', 'a']);
    expect(swapColumnOrder(['a', 'b'], 'a', 'x')).toEqual(['a', 'b']);
    expect(moveColumnOrder(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'a', 'c']);
    expect(moveColumnOrder(['a', 'b', 'c'], 'a', 'x')).toEqual(['a', 'b', 'c']);
    expect(moveColumnOrderByIndex(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveColumnOrderByIndex(['a', 'b', 'c'], 0, 9)).toEqual(['a', 'b', 'c']);
  });
});

describe('virtual window', () => {
  it('解析 overscan 的默认值与上限', () => {
    expect(resolveOverscan(undefined)).toBe(DEFAULT_OVERSCAN);
    expect(resolveOverscan(-1)).toBe(DEFAULT_OVERSCAN);
    expect(resolveOverscan(20.8)).toBe(20);
    expect(resolveOverscan(500)).toBe(100);
  });

  it('固定行高下限与估算行高优先级', () => {
    expect(resolveFixedRowHeight(undefined)).toBeNull();
    expect(resolveFixedRowHeight(5)).toBe(20);
    expect(resolveFixedRowHeight(40)).toBe(40);
    expect(resolveEstimateSize(undefined, null)).toBe(DEFAULT_ESTIMATE_SIZE);
    expect(resolveEstimateSize(80, null)).toBe(80);
    expect(resolveEstimateSize(80, 40)).toBe(40);
  });

  it('spacer 高度由虚拟项首尾计算', () => {
    expect(resolveSpacerHeights([], 100)).toEqual({ top: 0, bottom: 0 });
    expect(
      resolveSpacerHeights(
        [
          { start: 10, end: 30 },
          { start: 30, end: 60 },
        ],
        100
      )
    ).toEqual({ top: 10, bottom: 40 });
  });
});
