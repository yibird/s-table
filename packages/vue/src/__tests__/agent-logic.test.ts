import { afterEach, describe, expect, it } from 'vite-plus/test';
import { nextTick, reactive, ref, type App } from 'vue';
import { mountSTable } from './helpers';
import type {
  STableColumn,
  STableEditingState,
  STableInstance,
  STableRowKey,
  STableSortItem,
} from '../types';

/**
 * 数据逻辑边界测试：
 * 空值 / 排序稳定性 / 选择组合 / 手动分页 / 受控状态切换 / 固定行 / 分组 / 树 / 导出 / 响应式。
 * 只使用公开 props、实例 API 与 DOM 断言。
 */

interface Row {
  id: number;
  name?: string | null;
  score?: number | null;
  dept?: string | null;
  children?: Row[];
}

let app: App | null = null;
let host: HTMLElement | null = null;
let instance: STableInstance<Row> | null = null;

const setInstance = (value: unknown) => {
  instance = value as STableInstance<Row>;
};

afterEach(() => {
  app?.unmount();
  host?.remove();
  document
    .querySelectorAll(
      '.s-table-selection-dropdown-menu, .s-table-filter-dropdown, .s-table-search-dropdown'
    )
    .forEach((element) => element.remove());
  app = null;
  host = null;
  instance = null;
});

const mount = async (
  props: Record<string, unknown> | (() => Record<string, unknown>)
): Promise<void> => {
  const getProps = typeof props === 'function' ? props : () => props;
  const mounted = mountSTable<Row>(() => ({ ...getProps(), ref: setInstance }) as never);
  app = mounted.app;
  host = mounted.host;
  await nextTick();
};

const bodyRows = (): HTMLElement[] =>
  Array.from(host!.querySelectorAll<HTMLElement>('tbody tr.s-table-row'));

const bodyKeys = (): Array<string | undefined> => bodyRows().map((row) => row.dataset.rowKey);

const bodyCol = (columnIndex: number): string[] =>
  bodyRows().map((row) => {
    const cells = row.querySelectorAll('td.s-table-cell');
    return cells[columnIndex]?.textContent?.trim() ?? '';
  });

const headerCheckbox = (): HTMLInputElement =>
  host!.querySelector<HTMLInputElement>('thead .s-table-selection-header input[type="checkbox"]')!;

const pageLabels = (): string[] =>
  Array.from(
    host!.querySelectorAll<HTMLButtonElement>(
      '.s-pagination-item:not(.s-pagination-prev):not(.s-pagination-next):not(.s-pagination-jump-prev):not(.s-pagination-jump-next)'
    )
  ).map((button) => button.textContent?.trim() ?? '');

const activePage = (): string | undefined =>
  host!.querySelector<HTMLElement>('.s-pagination-item-active')?.textContent?.trim();

const simpleColumns = (): STableColumn<Row>[] => [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: 'Name' },
];

// ==================== 空数据 / 空列 / 单行 ====================

describe('空数据、空列与单行', () => {
  it('空数据渲染空态，行模型为空，导出只保留表头', async () => {
    await mount({
      columns: simpleColumns(),
      dataSource: [],
      rowKey: 'id',
      pagination: { defaultPageSize: 10 },
    });

    expect(host!.querySelector('.s-table-empty')).not.toBeNull();
    expect(bodyRows()).toHaveLength(0);
    // total 为 0 时分页器整体隐藏（没有可翻页的数据）。
    expect(host!.querySelector('.s-pagination')).toBeNull();
    expect(instance!.getExportRows('all')).toEqual([]);
    expect(instance!.exportCsv({ bom: false })).toBe('ID,Name');
  });

  it('空列时不崩溃，行模型仍保留数据；导出列集合为空', async () => {
    await mount({ columns: [], dataSource: [{ id: 1, name: 'a' }], rowKey: 'id' });

    expect(host!.querySelector('.s-table')).not.toBeNull();
    expect(instance!.getTanStackTable().getRowModel().rows).toHaveLength(1);
    expect(instance!.getExportColumns()).toEqual([]);
  });

  it('单行 null 值渲染为空文本而不是 null/undefined 字样', async () => {
    await mount({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID' },
        { id: 'name', accessorKey: 'name', header: 'Name' },
      ],
      dataSource: [{ id: 1, name: null }],
      rowKey: 'id',
    });

    expect(bodyRows()).toHaveLength(1);
    expect(bodyCol(1)).toEqual(['']);
    expect(host!.querySelector('tbody')!.textContent).not.toContain('null');
    expect(host!.querySelector('tbody')!.textContent).not.toContain('undefined');
  });
});

// ==================== null / undefined 参与数据逻辑 ====================

describe('空值参与排序、过滤、搜索与聚合', () => {
  it('null/undefined 排序不丢行，已定义数值保持升降序', async () => {
    const data: Row[] = [
      { id: 1, score: 30 },
      { id: 2, score: undefined },
      { id: 3, score: 10 },
      { id: 4, score: null },
      { id: 5, score: 20 },
    ];
    await mount({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID' },
        { id: 'score', accessorKey: 'score', header: 'Score', sorter: true },
      ],
      dataSource: data,
      rowKey: 'id',
    });

    const sorter = host!.querySelector<HTMLElement>(
      'thead th[data-column-id="score"] .s-table-column-sorter'
    )!;
    sorter.click();
    await nextTick();

    expect(bodyKeys()).toHaveLength(5);
    const definedScores = () =>
      bodyRows()
        .map((row) => row.querySelectorAll('td.s-table-cell')[1]?.textContent?.trim())
        .filter((text) => text !== '' && text !== undefined)
        .map(Number);
    expect(definedScores()).toEqual([10, 20, 30]);

    sorter.click();
    await nextTick();
    expect(bodyKeys()).toHaveLength(5);
    expect(definedScores()).toEqual([30, 20, 10]);
  });

  it('过滤与内置枚举匹配会排除 null/undefined 值且不抛错', async () => {
    await mount({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID' },
        {
          id: 'dept',
          accessorKey: 'dept',
          header: 'Dept',
          filters: [
            { text: 'A', value: 'A' },
            { text: 'B', value: 'B' },
          ],
          filteredValue: ['A'],
        },
      ],
      dataSource: [
        { id: 1, dept: 'A' },
        { id: 2, dept: null },
        { id: 3, dept: undefined },
        { id: 4, dept: 'B' },
      ],
      rowKey: 'id',
    });

    expect(bodyKeys()).toEqual(['1']);
  });

  it('搜索忽略 null 单元格，不抛错也不误命中', async () => {
    await mount({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID' },
        { id: 'name', accessorKey: 'name', header: 'Name', search: true },
      ],
      dataSource: [
        { id: 1, name: 'Alice' },
        { id: 2, name: null },
        { id: 3, name: 'Alicia' },
      ],
      rowKey: 'id',
    });

    host!.querySelector<HTMLElement>('.s-table-search-trigger')!.click();
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('.s-table-search-input')!;
    input.value = 'ali';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector<HTMLElement>('.s-table-search-dropdown-btn-confirm')!.click();
    await nextTick();

    expect(bodyKeys()).toEqual(['1', '3']);
  });

  // 回归：分组键按原始类型区分，字符串值保持原有行为。
  it('分组按原始值区分空值/字符串与数字混合类型', async () => {
    await mount({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID' },
        { id: 'dept', accessorKey: 'dept', header: 'Dept', groupable: true },
      ],
      dataSource: [
        { id: 1, dept: 1 },
        { id: 2, dept: '1' },
        { id: 3, dept: null },
        { id: 4, dept: 'null' },
      ],
      rowKey: 'id',
      defaultGroupBy: ['dept'],
    });

    expect(host!.querySelectorAll('.s-table-row-grouped')).toHaveLength(4);
  });

  it('分组聚合：空值分组保留全部叶子行，sum 忽略非数值', async () => {
    const data: Row[] = [
      { id: 1, dept: 'A', score: 10 },
      { id: 2, dept: 'A', score: 20 },
      { id: 3, dept: null, score: 5 },
      { id: 4, dept: undefined, score: null },
    ];
    await mount({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID' },
        { id: 'dept', accessorKey: 'dept', header: 'Dept', groupable: true },
        {
          id: 'score',
          accessorKey: 'score',
          header: 'Score',
          aggregation: 'sum',
        },
      ],
      dataSource: data,
      rowKey: 'id',
      defaultGroupBy: ['dept'],
    });

    const groupRows = host!.querySelectorAll('.s-table-row-grouped');
    expect(groupRows.length).toBe(3);
    // 全部分组默认展开：每条业务数据恰好出现一次（分组行 key 形如 dept:A）。
    expect(
      bodyKeys()
        .filter((key) => key !== undefined && !key.startsWith('dept:'))
        .sort()
    ).toEqual(['1', '2', '3', '4']);
    const groupTexts = Array.from(groupRows).map((row) => row.textContent ?? '');
    expect(groupTexts.some((text) => text.includes('30'))).toBe(true);
    expect(host!.querySelector('tbody')!.textContent).not.toContain('NaN');
  });
});

// ==================== 排序稳定性与多列排序 ====================

describe('排序稳定性与多列排序', () => {
  it('重复排序键在升序和降序下都保持原始相对顺序', async () => {
    const data: Row[] = [
      { id: 1, dept: 'b' },
      { id: 2, dept: 'a' },
      { id: 3, dept: 'b' },
      { id: 4, dept: 'a' },
      { id: 5, dept: 'b' },
    ];
    const state = reactive<{ sorting: STableSortItem[] }>({
      sorting: [],
    });
    await mount(() => ({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID' },
        { id: 'dept', accessorKey: 'dept', header: 'Dept', sorter: true },
      ],
      dataSource: data,
      rowKey: 'id',
      sorting: state.sorting,
    }));

    state.sorting = [{ columnId: 'dept', order: 'ascend' }];
    await nextTick();
    expect(bodyKeys()).toEqual(['2', '4', '1', '3', '5']);

    state.sorting = [{ columnId: 'dept', order: 'descend' }];
    await nextTick();
    expect(bodyKeys()).toEqual(['1', '3', '5', '2', '4']);
  });

  it('多列排序按数组优先级依次比较', async () => {
    const data: Row[] = [
      { id: 1, dept: 'x', score: 2 },
      { id: 2, dept: 'x', score: 1 },
      { id: 3, dept: 'y', score: 1 },
      { id: 4, dept: 'x', score: 1 },
    ];
    const state = reactive<{ sorting: STableSortItem[] }>({ sorting: [] });
    await mount(() => ({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID' },
        { id: 'dept', accessorKey: 'dept', header: 'Dept', sorter: true },
        { id: 'score', accessorKey: 'score', header: 'Score', sorter: true },
      ],
      dataSource: data,
      rowKey: 'id',
      sorting: state.sorting,
    }));

    state.sorting = [
      { columnId: 'dept', order: 'ascend' },
      { columnId: 'score', order: 'ascend' },
    ];
    await nextTick();
    expect(bodyKeys()).toEqual(['2', '4', '1', '3']);

    // 交换优先级后，score 成为第一排序键；同分时按 dept 升序。
    state.sorting = [
      { columnId: 'score', order: 'ascend' },
      { columnId: 'dept', order: 'ascend' },
    ];
    await nextTick();
    expect(bodyKeys()).toEqual(['2', '4', '3', '1']);
  });

  it('排序/过滤变化时页码修正到第 1 页（排序 + 过滤 + 分页组合）', async () => {
    const data: Row[] = Array.from({ length: 20 }, (_, index) => ({
      id: index + 1,
      dept: (index + 1) % 2 === 1 ? 'odd' : 'even',
    }));
    const state = reactive<{ sorting: STableSortItem[]; filter: string[] }>({
      sorting: [],
      filter: [],
    });
    await mount(() => ({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID', sorter: true },
        {
          id: 'dept',
          accessorKey: 'dept',
          header: 'Dept',
          filters: [
            { text: 'odd', value: 'odd' },
            { text: 'even', value: 'even' },
          ],
          filteredValue: state.filter,
        },
      ],
      dataSource: data,
      rowKey: 'id',
      sorting: state.sorting,
      pagination: { defaultCurrent: 3, defaultPageSize: 5 },
    }));

    expect(bodyCol(0)).toEqual(['11', '12', '13', '14', '15']);

    state.filter = ['odd'];
    await nextTick();
    expect(activePage()).toBe('1');
    expect(bodyCol(0)).toEqual(['1', '3', '5', '7', '9']);

    // 翻到第 2 页后再改变排序，应回到第 1 页并按过滤后的降序渲染。
    host!.querySelector<HTMLElement>('.s-pagination-next')!.click();
    await nextTick();
    expect(bodyCol(0)).toEqual(['11', '13', '15', '17', '19']);

    state.sorting = [{ columnId: 'id', order: 'descend' }];
    await nextTick();
    expect(activePage()).toBe('1');
    expect(bodyCol(0)).toEqual(['19', '17', '15', '13', '11']);
  });
});

// ==================== 选择组合 ====================

describe('选择：过滤结果、当前页与跨页', () => {
  it('过滤后表头全选只选择过滤结果，清除过滤后变为半选', async () => {
    const filter = ref<string[]>(['A']);
    await mount(() => ({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID' },
        {
          id: 'dept',
          accessorKey: 'dept',
          header: 'Dept',
          filters: [
            { text: 'A', value: 'A' },
            { text: 'B', value: 'B' },
          ],
          filteredValue: filter.value,
        },
      ],
      dataSource: [
        { id: 1, dept: 'A' },
        { id: 2, dept: 'B' },
        { id: 3, dept: 'A' },
        { id: 4, dept: 'B' },
        { id: 5, dept: 'A' },
      ],
      rowKey: 'id',
      rowSelection: { type: 'checkbox' },
    }));

    headerCheckbox().click();
    await nextTick();

    expect(instance!.getSelectedRowKeys().sort()).toEqual([1, 3, 5]);
    expect(headerCheckbox().checked).toBe(true);
    expect(headerCheckbox().indeterminate).toBe(false);

    filter.value = [];
    await nextTick();

    expect(headerCheckbox().checked).toBe(false);
    expect(headerCheckbox().indeterminate).toBe(true);
    expect(instance!.getSelectedRowKeys().sort()).toEqual([1, 3, 5]);

    headerCheckbox().click();
    await nextTick();
    expect(instance!.getSelectedRowKeys().sort()).toEqual([1, 2, 3, 4, 5]);
    expect(headerCheckbox().checked).toBe(true);
  });

  it('过滤后表头全选覆盖过滤结果的所有页', async () => {
    await mount({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID' },
        {
          id: 'dept',
          accessorKey: 'dept',
          header: 'Dept',
          filters: [
            { text: 'A', value: 'A' },
            { text: 'B', value: 'B' },
          ],
          filteredValue: ['A'],
        },
      ],
      dataSource: [
        { id: 1, dept: 'A' },
        { id: 2, dept: 'B' },
        { id: 3, dept: 'A' },
        { id: 4, dept: 'B' },
        { id: 5, dept: 'A' },
      ],
      rowKey: 'id',
      rowSelection: { type: 'checkbox' },
      pagination: { defaultCurrent: 1, defaultPageSize: 2 },
    });

    headerCheckbox().click();
    await nextTick();
    expect(instance!.getSelectedRowKeys().sort()).toEqual([1, 3, 5]);
    expect(headerCheckbox().checked).toBe(true);

    host!.querySelector<HTMLElement>('.s-pagination-next')!.click();
    await nextTick();
    expect(bodyKeys()).toEqual(['5']);
    const pageTwoCheckbox = host!.querySelector<HTMLInputElement>(
      'tbody .s-table-selection-cell input'
    )!;
    expect(pageTwoCheckbox.checked).toBe(true);
  });

  it('“选择当前页”只选过滤后当前页，跨页选择保留', async () => {
    await mount({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID' },
        {
          id: 'dept',
          accessorKey: 'dept',
          header: 'Dept',
          filters: [
            { text: 'A', value: 'A' },
            { text: 'B', value: 'B' },
          ],
          filteredValue: ['A'],
        },
      ],
      dataSource: [
        { id: 1, dept: 'A' },
        { id: 2, dept: 'B' },
        { id: 3, dept: 'A' },
        { id: 4, dept: 'B' },
        { id: 5, dept: 'A' },
      ],
      rowKey: 'id',
      rowSelection: { type: 'checkbox' },
      pagination: { defaultCurrent: 1, defaultPageSize: 2 },
    });

    const openSelectionMenu = async () => {
      host!.querySelector<HTMLElement>('.s-table-selection-dropdown-trigger')!.click();
      await nextTick();
    };
    const clickMenuAction = async (text: string) => {
      const item = Array.from(
        document.querySelectorAll<HTMLElement>('.s-table-selection-dropdown-item')
      ).find((element) => element.textContent?.trim() === text);
      expect(item).toBeDefined();
      item!.click();
      await nextTick();
    };

    await openSelectionMenu();
    await clickMenuAction('Select Current Page');
    expect(instance!.getSelectedRowKeys().sort()).toEqual([1, 3]);

    host!.querySelector<HTMLElement>('.s-pagination-next')!.click();
    await nextTick();
    expect(bodyKeys()).toEqual(['5']);

    await openSelectionMenu();
    await clickMenuAction('Select Current Page');
    expect(instance!.getSelectedRowKeys().sort()).toEqual([1, 3, 5]);
  });

  it('跨页选择后删除已选行，选择状态自动收敛到现存行', async () => {
    const state = reactive<{ data: Row[] }>({
      data: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 3, name: 'c' },
        { id: 4, name: 'd' },
      ],
    });
    await mount(() => ({
      columns: simpleColumns(),
      dataSource: state.data,
      rowKey: 'id',
      rowSelection: { type: 'checkbox' },
      pagination: { defaultPageSize: 2 },
    }));

    const checkboxes = () =>
      Array.from(host!.querySelectorAll<HTMLInputElement>('tbody .s-table-selection-cell input'));
    checkboxes()[0]!.click();
    await nextTick();
    host!.querySelector<HTMLElement>('.s-pagination-next')!.click();
    await nextTick();
    checkboxes()[0]!.click();
    await nextTick();

    expect(instance!.getSelectedRowKeys().sort()).toEqual([1, 3]);

    state.data = state.data.filter((row) => row.id !== 3);
    await nextTick();

    expect(instance!.getSelectedRowKeys()).toEqual([1]);
    expect(instance!.getSelectedRows()).toEqual([{ id: 1, name: 'a' }]);
  });
});

// ==================== 手动分页边界 ====================

describe('手动分页边界', () => {
  it('total 决定总页数，current 越界被夹紧且下一页禁用', async () => {
    const state = reactive<{ total: number }>({ total: 25 });
    await mount(() => ({
      columns: simpleColumns(),
      dataSource: [
        { id: 21, name: 'u' },
        { id: 22, name: 'v' },
        { id: 23, name: 'w' },
      ],
      rowKey: 'id',
      manualPagination: true,
      pagination: { total: state.total, defaultCurrent: 3, defaultPageSize: 10 },
    }));

    expect(bodyCol(0)).toEqual(['21', '22', '23']);
    expect(pageLabels()).toEqual(['1', '2', '3']);
    expect(host!.querySelector<HTMLButtonElement>('.s-pagination-next')!.disabled).toBe(true);

    state.total = 15;
    await nextTick();

    expect(pageLabels()).toEqual(['1', '2']);
    expect(activePage()).toBe('2');
    expect(host!.querySelector<HTMLButtonElement>('.s-pagination-next')!.disabled).toBe(true);
  });

  it('外部缩小 pageSize 时受控 current 被夹紧到新的最后一页', async () => {
    const state = reactive<{ pageSize: number }>({ pageSize: 10 });
    await mount(() => ({
      columns: simpleColumns(),
      dataSource: [{ id: 21, name: 'u' }],
      rowKey: 'id',
      manualPagination: true,
      pagination: { total: 25, current: 3, pageSize: state.pageSize },
    }));

    expect(activePage()).toBe('3');

    state.pageSize = 20;
    await nextTick();
    expect(activePage()).toBe('2');
    expect(pageLabels()).toEqual(['1', '2']);
  });

  it('非受控分页在数据缩减后把越界页码夹到最后一页', async () => {
    const state = reactive<{ data: Row[] }>({
      data: Array.from({ length: 25 }, (_, index) => ({ id: index + 1, name: `n${index + 1}` })),
    });
    await mount(() => ({
      columns: simpleColumns(),
      dataSource: state.data,
      rowKey: 'id',
      pagination: { defaultCurrent: 3, defaultPageSize: 10 },
    }));

    expect(bodyCol(0)).toEqual(['21', '22', '23', '24', '25']);

    state.data = state.data.slice(0, 12);
    await nextTick();
    expect(activePage()).toBe('2');
    expect(bodyCol(0)).toEqual(['11', '12']);
  });

  it('pageCount=0 时归一为 0 条并隐藏分页；pageCount 优先于 dataSource 行数', async () => {
    await mount({
      columns: simpleColumns(),
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
      manualPagination: true,
      pagination: { pageCount: 0, defaultPageSize: 10 },
    });
    expect(host!.querySelector('.s-pagination')).toBeNull();

    app!.unmount();
    host!.remove();
    await mount({
      columns: simpleColumns(),
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
      manualPagination: true,
      pagination: { pageCount: 4, defaultPageSize: 10 },
    });
    expect(pageLabels()).toEqual(['1', '2', '3', '4']);
  });
});

// ==================== 受控 / 非受控切换 ====================

describe('受控与非受控状态切换', () => {
  it('sorting 从受控切回非受控时继承最后一次受控排序，之后可交互', async () => {
    const state = reactive<{ controlled: boolean; sorting: STableSortItem[] }>({
      controlled: true,
      sorting: [{ columnId: 'id', order: 'descend' }],
    });
    await mount(() => ({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID', sorter: true },
        { id: 'name', accessorKey: 'name', header: 'Name' },
      ],
      dataSource: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 3, name: 'c' },
      ],
      rowKey: 'id',
      sorting: state.controlled ? state.sorting : undefined,
    }));

    expect(bodyCol(0)).toEqual(['3', '2', '1']);

    state.controlled = false;
    await nextTick();
    expect(bodyCol(0)).toEqual(['3', '2', '1']);

    host!
      .querySelector<HTMLElement>('thead th[data-column-id="id"] .s-table-column-sorter')!
      .click();
    await nextTick();
    // descend -> none，恢复数据源顺序。
    expect(bodyCol(0)).toEqual(['1', '2', '3']);
  });

  it('pagination.current 从受控切回非受控时保留最后页码并可继续翻页', async () => {
    const state = reactive<{ current?: number }>({ current: 2 });
    await mount(() => ({
      columns: simpleColumns(),
      dataSource: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 3, name: 'c' },
        { id: 4, name: 'd' },
        { id: 5, name: 'e' },
        { id: 6, name: 'f' },
      ],
      rowKey: 'id',
      pagination: {
        pageSize: 2,
        ...(state.current === undefined ? {} : { current: state.current }),
      },
    }));

    expect(bodyCol(0)).toEqual(['3', '4']);

    state.current = undefined;
    await nextTick();
    expect(bodyCol(0)).toEqual(['3', '4']);

    host!.querySelector<HTMLElement>('.s-pagination-next')!.click();
    await nextTick();
    expect(bodyCol(0)).toEqual(['5', '6']);
    expect(activePage()).toBe('3');
  });

  it('pinnedRowKeys / groupBy 从受控切换为非受控时继承最后一次受控值', async () => {
    const state = reactive<{
      pinned?: { top: STableRowKey[]; bottom: STableRowKey[] };
      groupBy?: string[];
    }>({
      pinned: { top: [2], bottom: [] },
      groupBy: ['dept'],
    });
    await mount(() => ({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID' },
        { id: 'dept', accessorKey: 'dept', header: 'Dept', groupable: true },
      ],
      dataSource: [
        { id: 1, dept: 'A' },
        { id: 2, dept: 'B' },
        { id: 3, dept: 'A' },
      ],
      rowKey: 'id',
      pinnedRowKeys: state.pinned,
      groupBy: state.groupBy,
    }));

    expect(instance!.getGroupBy()).toEqual(['dept']);
    expect(instance!.getPinnedRowKeys()).toEqual({ top: [2], bottom: [] });

    state.pinned = undefined;
    state.groupBy = undefined;
    await nextTick();

    expect(instance!.getGroupBy()).toEqual(['dept']);
    expect(instance!.getPinnedRowKeys()).toEqual({ top: [2], bottom: [] });
    expect(host!.querySelectorAll('.s-table-row-grouped')).toHaveLength(2);
    expect(
      host!.querySelector('[data-row-key="2"]')?.classList.contains('s-table-row-pinned-top')
    ).toBe(true);
  });

  it('editing 从受控切换为非受控时保留最后一次受控草稿', async () => {
    const state = reactive<{ editing?: STableEditingState | null }>({
      editing: { mode: 'cell', rowKey: 1, columnId: 'name', values: { name: 'draft' } },
    });
    await mount(() => ({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID' },
        { id: 'name', accessorKey: 'name', header: 'Name', editable: true },
      ],
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
      editConfig: { trigger: 'manual' },
      editing: state.editing,
    }));

    expect(instance!.getEditing()?.values.name).toBe('draft');

    state.editing = undefined;
    await nextTick();
    expect(instance!.getEditing()?.values.name).toBe('draft');

    instance!.setEditValue('name', 'next');
    expect(instance!.getEditing()?.values.name).toBe('next');
  });
});

// ==================== 行固定 + 过滤/删除 ====================

describe('行固定与数据失效', () => {
  it('分页时固定行每页只出现一次，并从中心区移除', async () => {
    await mount({
      columns: simpleColumns(),
      dataSource: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 3, name: 'c' },
        { id: 4, name: 'd' },
        { id: 5, name: 'e' },
      ],
      rowKey: 'id',
      defaultPinnedRowKeys: { top: [2], bottom: [] },
      pagination: { defaultCurrent: 1, defaultPageSize: 2 },
    });

    expect(bodyKeys()).toEqual(['2', '1']);

    host!.querySelector<HTMLElement>('.s-pagination-next')!.click();
    await nextTick();
    expect(bodyKeys()).toEqual(['2', '3', '4']);
    expect(host!.querySelectorAll('[data-row-key="2"]')).toHaveLength(1);
  });

  it('固定行被过滤隐藏后仍保留一次，清除过滤后不重复', async () => {
    const filter = ref<string[]>(['A']);
    await mount(() => ({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID' },
        {
          id: 'dept',
          accessorKey: 'dept',
          header: 'Dept',
          filters: [
            { text: 'A', value: 'A' },
            { text: 'B', value: 'B' },
          ],
          filteredValue: filter.value,
        },
      ],
      dataSource: [
        { id: 1, dept: 'A' },
        { id: 2, dept: 'B' },
        { id: 3, dept: 'A' },
      ],
      rowKey: 'id',
      defaultPinnedRowKeys: { top: [2], bottom: [] },
    }));

    expect(
      bodyKeys()
        .filter((key) => key !== undefined)
        .sort()
    ).toEqual(['1', '2', '3']);
    expect(host!.querySelectorAll('[data-row-key="2"]')).toHaveLength(1);

    filter.value = [];
    await nextTick();
    expect(
      bodyKeys()
        .filter((key) => key !== undefined)
        .sort()
    ).toEqual(['1', '2', '3']);
    expect(host!.querySelectorAll('[data-row-key="2"]')).toHaveLength(1);
  });
});

// ==================== 树形 children 更新 ====================

describe('树形 children 更新与数据替换', () => {
  it('展开状态下替换 children 后渲染新子树，移除 children 不残留旧行', async () => {
    const state = reactive<{ data: Row[] }>({
      data: [
        {
          id: 1,
          name: 'parent',
          children: [
            { id: 11, name: 'c1' },
            { id: 12, name: 'c2' },
          ],
        },
      ],
    });
    await mount(() => ({
      columns: simpleColumns(),
      dataSource: state.data,
      rowKey: 'id',
      tree: {},
      defaultExpandedRowKeys: [1],
    }));

    expect(bodyKeys()).toEqual(['1', '11', '12']);

    state.data = [
      {
        id: 1,
        name: 'parent',
        children: [{ id: 13, name: 'c3' }],
      },
    ];
    await nextTick();
    expect(bodyKeys()).toEqual(['1', '13']);

    state.data = [{ id: 1, name: 'parent' }];
    await nextTick();
    expect(bodyKeys()).toEqual(['1']);
    expect(host!.querySelector('[data-row-key="13"]')).toBeNull();
  });
});

// ==================== 导出边界 ====================

describe('导出边界', () => {
  it('隐藏列被排除，dataIndex 与 accessorFn 均能取值', async () => {
    const columns: STableColumn<Row>[] = [
      { id: 'id', dataIndex: 'id', header: 'ID' },
      { id: 'name', accessorKey: 'name', header: 'Name', hidden: true },
      {
        id: 'double',
        accessorFn: (record) => (record.score ?? 0) * 2,
        header: 'Double',
      },
    ];
    await mount({ columns, dataSource: [{ id: 1, name: 'a', score: 5 }], rowKey: 'id' });

    expect(instance!.getExportColumns().map((column) => column.columnId)).toEqual(['id', 'double']);
    expect(instance!.exportCsv({ bom: false })).toBe('ID,Double\r\n1,10');
  });

  it('format 在取值之后执行，公式前缀默认防护且可关闭', async () => {
    await mount({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID' },
        { id: 'name', accessorKey: 'name', header: 'Name' },
        { id: 'score', accessorKey: 'score', header: 'Score' },
      ],
      dataSource: [{ id: 1, name: '=1+1', score: 5 }],
      rowKey: 'id',
    });

    const content = instance!.exportCsv({
      bom: false,
      columns: [
        { columnId: 'name' },
        { columnId: 'score', header: 'S', format: (value) => `v:${String(value)}` },
      ],
    });
    expect(content).toBe("Name,S\r\n'=1+1,v:5");

    const raw = instance!.exportCsv({
      bom: false,
      preventFormulaInjection: false,
      columns: [{ columnId: 'name' }],
    });
    expect(raw).toBe('Name\r\n=1+1');
  });

  it('currentPage 导出遵循过滤与排序后的当前页行序', async () => {
    await mount({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID', sorter: true },
        {
          id: 'dept',
          accessorKey: 'dept',
          header: 'Dept',
          filters: [
            { text: 'odd', value: 'odd' },
            { text: 'even', value: 'even' },
          ],
          filteredValue: ['odd'],
        },
      ],
      dataSource: Array.from({ length: 10 }, (_, index) => ({
        id: index + 1,
        dept: (index + 1) % 2 === 1 ? 'odd' : 'even',
      })),
      rowKey: 'id',
      sorting: [{ columnId: 'id', order: 'descend' }],
      pagination: { defaultCurrent: 1, defaultPageSize: 2 },
    });

    expect(instance!.exportCsv({ bom: false, dataSource: 'currentPage' })).toBe(
      'ID,Dept\r\n9,odd\r\n7,odd'
    );
  });

  it('导出 all 不受分组/树折叠状态影响', async () => {
    await mount({
      columns: [
        { id: 'id', accessorKey: 'id', header: 'ID' },
        { id: 'dept', accessorKey: 'dept', header: 'Dept', groupable: true },
      ],
      dataSource: [
        { id: 1, dept: 'A' },
        { id: 2, dept: 'B' },
        { id: 3, dept: 'A' },
        { id: 4, dept: 'B' },
      ],
      rowKey: 'id',
      defaultGroupBy: ['dept'],
    });

    expect(instance!.getExportRows('all')).toHaveLength(4);
    instance!.collapseAllGroups();
    await nextTick();
    expect(instance!.getExportRows('all')).toHaveLength(4);
    // 分组模型会按分组值重排叶子行，导出顺序跟随可见行序。
    expect(
      instance!
        .exportCsv({ bom: false })
        .replace(/^\uFEFF/, '')
        .split('\r\n')
        .slice(1)
        .sort()
    ).toEqual(['1,A', '2,B', '3,A', '4,B']);
  });

  it('未启用分页时 currentPage 导出应等同全部行', async () => {
    await mount({
      columns: simpleColumns(),
      dataSource: Array.from({ length: 25 }, (_, index) => ({
        id: index + 1,
        name: `n${index + 1}`,
      })),
      rowKey: 'id',
      pagination: false,
    });

    expect(instance!.getExportRows('all')).toHaveLength(25);
    expect(instance!.getExportRows('currentPage')).toHaveLength(25);
    expect(
      instance!.exportCsv({ bom: false, dataSource: 'currentPage' }).split('\r\n')
    ).toHaveLength(26);
  });

  it('selected 导出只包含选中行，且空选择时仅表头', async () => {
    const data: Row[] = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
      { id: 3, name: 'c' },
    ];
    await mount({
      columns: simpleColumns(),
      dataSource: data,
      rowKey: 'id',
      rowSelection: { type: 'checkbox' },
    });

    expect(instance!.exportCsv({ bom: false, dataSource: 'selected' })).toBe('ID,Name');

    instance!.toggleRowSelection(data[0]!, true);
    instance!.toggleRowSelection(data[2]!, true);
    await nextTick();
    expect(instance!.exportCsv({ bom: false, dataSource: 'selected' })).toBe(
      'ID,Name\r\n1,a\r\n3,c'
    );
  });
});

// ==================== 响应式列 exact-breakpoint ====================

describe('响应式列 exact-breakpoint 语义', () => {
  const originalInnerWidth = window.innerWidth;

  const setViewport = (width: number) => {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
  };

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      value: originalInnerWidth,
      configurable: true,
    });
  });

  const responsiveColumns = (): STableColumn<Row>[] => [
    { id: 'id', accessorKey: 'id', header: 'ID' },
    { id: 'lg', accessorKey: 'name', header: 'LG', responsive: ['lg'] },
    { id: 'ml', accessorKey: 'dept', header: 'ML', responsive: ['md', 'lg'] },
    { id: 'hidden', accessorKey: 'name', header: 'Hidden', responsive: ['lg'], hidden: true },
  ];

  const headerIds = () =>
    Array.from(host!.querySelectorAll('thead th[data-column-id]')).map((cell) =>
      cell.getAttribute('data-column-id')
    );

  it('默认断点 lg 在 992px 命中、991px 不命中', async () => {
    setViewport(992);
    await mount({
      columns: responsiveColumns(),
      dataSource: [{ id: 1, name: 'a', dept: 'A' }],
      rowKey: 'id',
    });
    expect(headerIds()).toEqual(['id', 'lg', 'ml']);

    app!.unmount();
    host!.remove();

    setViewport(991);
    await mount({
      columns: responsiveColumns(),
      dataSource: [{ id: 1, name: 'a', dept: 'A' }],
      rowKey: 'id',
    });
    expect(headerIds()).toEqual(['id', 'ml']);
  });

  it('responsive 未包含当前断点即隐藏（xl 不在 [md,lg] 中）', async () => {
    setViewport(1200);
    await mount({
      columns: responsiveColumns(),
      dataSource: [{ id: 1, name: 'a', dept: 'A' }],
      rowKey: 'id',
    });
    expect(headerIds()).toEqual(['id']);
  });

  // 回归：responsive 沿列树继承到叶子列。
  it('分组列上的 responsive 应像 hidden 一样作用于整个子树', async () => {
    setViewport(400);
    await mount({
      columns: [
        {
          id: 'info',
          header: 'Info',
          responsive: ['lg'],
          columns: [{ id: 'name', accessorKey: 'name', header: 'Name' }],
        },
        { id: 'id', accessorKey: 'id', header: 'ID' },
      ],
      dataSource: [{ id: 1, name: 'a' }],
      rowKey: 'id',
    });
    expect(headerIds()).toEqual(['id']);
  });

  it('自定义 breakpoints 按精确阈值生效', async () => {
    setViewport(1000);
    await mount({
      columns: responsiveColumns(),
      dataSource: [{ id: 1, name: 'a', dept: 'A' }],
      rowKey: 'id',
      breakpoints: { lg: 1000 },
    });
    expect(headerIds()).toEqual(['id', 'lg', 'ml']);

    app!.unmount();
    host!.remove();

    setViewport(999);
    await mount({
      columns: responsiveColumns(),
      dataSource: [{ id: 1, name: 'a', dept: 'A' }],
      rowKey: 'id',
      breakpoints: { lg: 1000 },
    });
    expect(headerIds()).toEqual(['id', 'ml']);
  });
});
