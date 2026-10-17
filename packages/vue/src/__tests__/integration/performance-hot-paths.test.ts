import { afterEach, describe, expect, it, vi } from 'vitest';
import { computed, createApp, h, nextTick, ref, shallowRef, type App } from 'vue';
import {
  cellSelectionFeature,
  tableFeatures,
  useTable,
  type Row as TanStackRow,
  type Table,
  type TableFeatures,
} from '@tanstack/vue-table';
import { useRafValue } from '../../hooks/useRafValue';
import { useTableAtoms } from '../../adapter';
import { createCellRenderCache } from '../../components/body/cellRenderCache';
import { useFlipAnimation } from '../../interaction/useFlipAnimation';
import { useCellRange } from '../../hooks/useCellRange';
import { buildRenderedColumnWindow } from '../../hooks/useColumnVirtual';
import { useExpandable } from '../../hooks/useExpandable';
import { useScroll } from '../../hooks/useScroll';
import { measureVirtualRowBlock, useVirtual } from '../../hooks/useVirtual';
import type {
  STableColumn,
  STableExpandable,
  STableInstance,
  STableRowKey,
  STableVirtualProps,
} from '../../types';
import { mountSTable } from '../helpers';

let app: App | null = null;

afterEach(() => {
  app?.unmount();
  app = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const mockAnimationFrame = () => {
  const callbacks: FrameRequestCallback[] = [];
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
    callbacks.push(callback);
    return callbacks.length;
  });
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => undefined);
  return callbacks;
};

describe('性能热路径回', () => {
  it('展开配置的非结构字段变化不会重新扫描完整 Row Model', async () => {
    type Row = { id: number };
    const expandable = ref<STableExpandable<Row>>({ columnWidth: 40 });
    const dataSource = ref<Row[]>([{ id: 1 }]);
    const row = { id: 'n:1', getCanExpand: vi.fn(() => true) } as unknown as TanStackRow<
      TableFeatures,
      Row
    >;
    const getCoreRowModel = vi.fn(() => ({ flatRows: [row] }));
    const table = { getCoreRowModel } as unknown as Table<TableFeatures, Row>;
    const tableRef = shallowRef<Table<TableFeatures, Row>>();

    app = createApp({
      setup() {
        useExpandable<Row>({
          expandable,
          expandedRowKeys: ref<STableRowKey[] | undefined>(undefined),
          defaultExpandedRowKeys: ref<STableRowKey[] | undefined>(undefined),
          dataSource,
          rowKey: ref('id'),
          getTable: () => tableRef.value,
          onUpdateExpandedRowKeys: () => undefined,
          onExpandChange: () => undefined,
          getExpandAriaLabel: () => 'Expand row',
        });
        return () => h('div');
      },
    });
    app.mount(document.createElement('div'));
    tableRef.value = table;
    await nextTick();
    expect(getCoreRowModel).toHaveBeenCalledTimes(1);

    // columnWidth / multiple 只影响控制列和状态约束，不影响哪些行可展开。
    expandable.value = { columnWidth: 46, multiple: false };
    await nextTick();
    expect(getCoreRowModel).toHaveBeenCalledTimes(1);

    // 业务判断函数变化会影响 getCanExpand，必须重新建立可展开行集合。
    expandable.value = { isRowExpandable: () => false };
    await nextTick();
    expect(getCoreRowModel).toHaveBeenCalledTimes(2);
  });

  it('横向虚拟化启用框选时仍只物化窗口 Cell，并与全量访问保持 identity', async () => {
    type Row = { id: number; value: string };
    const tableRef = ref<STableInstance<Row>>();
    const columns: STableColumn<Row>[] = Array.from({ length: 500 }, (_, index) => ({
      id: `column-${index}`,
      header: `Column ${index}`,
      accessorKey: 'value',
      width: 120,
    }));
    const mounted = mountSTable<Row>({
      columns,
      dataSource: [{ id: 1, value: 'value' }],
      rowKey: 'id',
      virtual: { y: false, x: true, columnOverscan: 3 },
      cellRangeSelection: { mode: 'cell' },
      ref: tableRef,
    } as never);
    app = mounted.app;
    await nextTick();

    const table = tableRef.value!.getTanStackTable();
    const row = table.getRowModel().rows[0]! as TanStackRow<TableFeatures, Row> & {
      _cellsCache?: WeakMap<object, object>;
    };
    const renderedIds = [
      ...mounted.host.querySelectorAll<HTMLElement>('tbody td[data-column-id]'),
    ].map((cell) => cell.dataset.columnId!);
    expect(renderedIds.length).toBeGreaterThan(0);
    expect(renderedIds.length).toBeLessThan(20);
    const renderedCols = [...mounted.host.querySelectorAll<HTMLTableColElement>('colgroup col')];
    expect(renderedCols.length).toBeLessThan(20);
    expect(
      renderedCols.reduce((total, column) => total + Number(column.getAttribute('span') ?? 1), 0)
    ).toBe(columns.length);

    const firstColumn = table.getColumn(renderedIds[0]!)!;
    const farColumn = table.getColumn('column-499')!;
    expect(row._cellsCache?.has(firstColumn)).toBe(true);
    expect(row._cellsCache?.has(farColumn)).toBe(false);
    const firstCell = row._cellsCache?.get(firstColumn);

    mounted.host
      .querySelector<HTMLElement>(`tbody td[data-column-id="${renderedIds[0]}"]`)!
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await nextTick();
    expect(row._cellsCache?.has(farColumn)).toBe(false);

    const allCells = row.getAllCells();
    expect(allCells.find((cell) => cell.column.id === renderedIds[0])).toBe(firstCell);
  });

  it('Cell 渲染缓存随列集合版本换代，不保留动态删除列的旧 context', async () => {
    type Row = { id: number; value: string };
    const tableRef = ref<STableInstance<Row>>();
    const dataSource = [{ id: 1, value: 'value' }];
    const mounted = mountSTable<Row>({
      columns: [{ id: 'value', accessorKey: 'value' }],
      dataSource,
      rowKey: 'id',
      ref: tableRef,
    });
    app = mounted.app;
    await nextTick();

    const cell = tableRef.value!.getTanStackTable().getRow('n:1').getAllCellsByColumnId().value!;
    const getState = createCellRenderCache<Row>();
    const firstColumnSet = ['value'];
    const dependencies = {
      render: cell.column.columnDef.cell,
      columnToken: [] as readonly unknown[],
      columnSetToken: firstColumnSet,
      dataSourceToken: dataSource,
      rowIndex: 0,
    };
    const first = getState(cell, dependencies);

    expect(getState(cell, dependencies)).toBe(first);
    expect(getState(cell, { ...dependencies, columnSetToken: [...firstColumnSet] })).not.toBe(
      first
    );
  });

  it('列虚拟化：滚动窗口只读取视口列，不扫描完整中心列集', () => {
    const source = Array.from({ length: 10_000 }, (_, index) => ({
      id: `column-${index}`,
      size: 120,
      hasExplicitWidth: true,
    }));
    let indexReads = 0;
    const centerColumns = new Proxy(source, {
      get(target, property, receiver) {
        if (typeof property === 'string' && /^\d+$/.test(property)) indexReads++;
        return Reflect.get(target, property, receiver);
      },
    });
    const paddingStart = 80;
    const paddingEnd = 90;
    const virtualItems = Array.from({ length: 8 }, (_, offset) => {
      const index = 5_000 + offset;
      const start = paddingStart + index * 120;
      return { index, start, end: start + 120 };
    });

    const rendered = buildRenderedColumnWindow(
      centerColumns,
      virtualItems,
      3,
      [{ id: 'fixed-start' }],
      [{ id: 'fixed-end' }],
      paddingStart,
      paddingEnd,
      paddingStart + source.length * 120 + paddingEnd
    );

    expect(indexReads).toBe(16);
    expect(rendered[0]).toEqual({ type: 'column', id: 'fixed-start' });
    expect(rendered[1]).toEqual({
      type: 'spacer',
      id: '__s_table_column_virtual_before__',
      colSpan: 5_000,
      width: 600_000,
    });
    expect(rendered.slice(2, 10).map((entry) => entry.id)).toEqual(
      virtualItems.map((item) => `column-${item.index}`)
    );
    expect(rendered[10]).toEqual({
      type: 'spacer',
      id: '__s_table_column_virtual_after__',
      colSpan: 4_992,
      width: 599_040,
    });
    expect(rendered[11]).toEqual({ type: 'column', id: 'fixed-end' });
  });

  it('固定列阴影：RO 纵向通知零成本过滤，滚动热路径只读取 scrollLeft', async () => {
    let resizeCallback: ResizeObserverCallback | undefined;
    const observed: Element[] = [];
    class ResizeObserverMock {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }
      observe(element: Element) {
        observed.push(element);
      }
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    const frameCallbacks = mockAnimationFrame();

    let scrollLeft = 0;
    let scrollWidthReads = 0;
    const scrollElement = document.createElement('div');
    const contentElement = document.createElement('table');
    scrollElement.appendChild(contentElement);
    Object.defineProperties(scrollElement, {
      offsetWidth: { get: () => 100 },
      clientWidth: { get: () => 90 },
      scrollWidth: {
        get: () => {
          scrollWidthReads++;
          return 300;
        },
      },
      scrollLeft: { get: () => scrollLeft, set: (value: number) => (scrollLeft = value) },
    });
    let scrollState: ReturnType<typeof useScroll>;
    app = createApp({
      setup() {
        scrollState = useScroll({
          scrollElementRef: ref<HTMLElement | null>(scrollElement),
          fixedColumnShadow: { enabled: computed(() => true) },
        });
        return () => h('div');
      },
    });
    app.mount(document.createElement('div'));

    // 观察目标是容器与表格本身；attach 时同步建立一次布局基线。
    expect(observed).toEqual([scrollElement, contentElement]);
    const attachReads = scrollWidthReads;
    expect(attachReads).toBeGreaterThan(0);

    const entryOf = (target: Element, inlineSize: number, blockSize: number): ResizeObserverEntry =>
      ({
        target,
        contentBoxSize: [{ inlineSize, blockSize }],
        contentRect: { width: inlineSize, height: blockSize },
      }) as unknown as ResizeObserverEntry;

    // 首次通知只建立横向基线；消费掉调度的帧。
    resizeCallback!(
      [entryOf(scrollElement, 90, 200), entryOf(contentElement, 300, 1000)],
      {} as ResizeObserver
    );
    frameCallbacks.splice(0).forEach((callback) => callback(0));

    // 虚拟化行高抖动：横向尺寸不变 → 不读布局、不调度帧。
    const baselineReads = scrollWidthReads;
    resizeCallback!(
      [entryOf(scrollElement, 90, 200), entryOf(contentElement, 300, 9_000)],
      {} as ResizeObserver
    );
    expect(scrollWidthReads).toBe(baselineReads);
    expect(frameCallbacks).toHaveLength(0);

    // 横向尺寸变化 → 下一帧统一重测一次。
    resizeCallback!([entryOf(contentElement, 400, 9_000)], {} as ResizeObserver);
    expect(frameCallbacks).toHaveLength(1);
    frameCallbacks.shift()!(0);
    expect(scrollWidthReads).toBeGreaterThan(baselineReads);

    // 滚动事件只读取 scrollLeft，不再触碰 scrollWidth。
    scrollLeft = 50;
    scrollElement.dispatchEvent(new Event('scroll'));
    expect(scrollState!.hasLeftShadow.value).toBe(true);
    expect(scrollState!.hasRightShadow.value).toBe(true);
    expect(scrollWidthReads).toBe(baselineReads + 1);
  });

  it('事件委托：任意列数只在 thead/tbody 各保留一个 mousedown 监听', async () => {
    type Row = { id: number; value: string };
    const cellAddListener = vi.spyOn(HTMLTableCellElement.prototype, 'addEventListener');
    const sectionAddListener = vi.spyOn(HTMLTableSectionElement.prototype, 'addEventListener');
    const mounted = mountSTable<Row>({
      columns: Array.from({ length: 200 }, (_, index) => ({
        id: `column-${index}`,
        header: `Column ${index}`,
        accessorKey: 'value',
        draggable: true,
      })),
      dataSource: [{ id: 1, value: 'value' }],
      rowKey: 'id',
    });
    app = mounted.app;
    await nextTick();

    expect(cellAddListener.mock.calls.filter(([type]) => type === 'mousedown')).toHaveLength(0);
    const delegatedListeners = sectionAddListener.mock.calls.filter(
      ([type]) => type === 'mousedown'
    );
    expect(delegatedListeners).toHaveLength(2);
    const delegatedTargets = sectionAddListener.mock.instances
      .filter((_, index) => sectionAddListener.mock.calls[index]?.[0] === 'mousedown')
      .map((element) => (element as HTMLTableSectionElement).tagName)
      .sort();
    expect(delegatedTargets).toEqual(['TBODY', 'THEAD']);
  });

  it('TanStack adapter：单个受控状态变更只同步一次 options', async () => {
    type Row = { id: number; name: string };
    const tableRef = ref<STableInstance<Row>>();
    const mounted = mountSTable<Row>({
      columns: [
        {
          id: 'name',
          accessorKey: 'name',
          sorter: true,
          search: true,
          filters: [{ text: 'Ada', value: 'Ada' }],
        },
      ],
      dataSource: Array.from({ length: 12 }, (_, index) => ({
        id: index,
        name: index % 2 === 0 ? 'Ada' : 'Grace',
      })),
      rowKey: 'id',
      pagination: { defaultPageSize: 5 },
      ref: tableRef,
    } as never);
    app = mounted.app;
    await nextTick();

    const table = tableRef.value!.getTanStackTable();
    const setOptions = vi.spyOn(table, 'setOptions');

    table.setSorting([{ id: 'name', desc: false }]);
    await nextTick();
    expect(setOptions).toHaveBeenCalledTimes(1);

    setOptions.mockClear();
    table.getColumn('name')!.setFilterValue({ keyword: 'Ada', normalizedKeyword: 'ada' });
    await nextTick();
    expect(setOptions).toHaveBeenCalledTimes(1);

    setOptions.mockClear();
    table.setPageIndex(1);
    await nextTick();
    expect(setOptions).toHaveBeenCalledTimes(1);
  });

  it('rAF 派生：自动追踪依赖，同一帧多次变化只写入一次状态', async () => {
    const callbacks = mockAnimationFrame();
    const dependency = ref(0);
    let deriveCount = 0;
    let value: ReturnType<typeof useRafValue<number>>;

    app = createApp({
      setup() {
        value = useRafValue(
          () => {
            deriveCount++;
            return dependency.value;
          },
          { enabled: () => true }
        );
        return () => h('div');
      },
    });
    app.mount(document.createElement('div'));

    // watch 建立时同步求值一次，保证初始值可用；rAF 负责合帧写入。
    expect(deriveCount).toBe(1);
    callbacks.shift()!(0);
    expect(value!.value).toBe(0);

    dependency.value = 1;
    dependency.value = 2;
    dependency.value = 3;
    await nextTick();
    // 同一帧内的多次变化只调度一次 rAF，状态只写入一次。
    expect(callbacks).toHaveLength(1);
    callbacks.shift()!(16);
    expect(value!.value).toBe(3);
  });

  it('FLIP：超过 100 个节点时跳过布局读取和动画', () => {
    const container = document.createElement('div');
    const elements = Array.from({ length: 101 }, (_, index) => {
      const element = document.createElement('div');
      element.dataset.key = String(index);
      container.appendChild(element);
      return element;
    });
    const rectSpies = elements.map((element) => vi.spyOn(element, 'getBoundingClientRect'));
    let flip: ReturnType<typeof useFlipAnimation>;

    app = createApp({
      setup() {
        flip = useFlipAnimation({
          containerRef: ref(container),
          selector: '[data-key]',
          axis: 'y',
          getKey: (element) => element.dataset.key,
        });
        return () => h('div');
      },
    });
    app.mount(document.createElement('div'));

    const positions = flip!.capturePositions();
    flip!.animate(new Map([['0', 100]]));

    expect(positions.size).toBe(0);
    expect(rectSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    expect(elements.every((element) => element.style.transform === '')).toBe(true);
  });

  it('框选：复用 TanStack ID 范围、拖拽处理器和边界计', () => {
    type Row = { id: string; a: number; b: number };
    const features: TableFeatures = tableFeatures({ cellSelectionFeature });
    let table: Table<TableFeatures, Row>;
    let range: ReturnType<typeof useCellRange<Row>>;

    app = createApp({
      setup() {
        table = useTable<TableFeatures, Row>({
          features,
          data: [
            { id: 'r0', a: 1, b: 2 },
            { id: 'r1', a: 3, b: 4 },
          ],
          columns: [
            { id: 'a', accessorKey: 'a' },
            { id: 'b', accessorKey: 'b' },
          ],
          getRowId: (row) => row.id,
        });
        range = useCellRange<Row>({
          table,
          cellSelectionState: useTableAtoms(table).cellSelection,
          rows: computed(() => table.getRowModel().rows),
          cellRangeSelection: computed(() => ({ mode: 'cell' as const })),
        });
        return () => h('div');
      },
    });
    app.mount(document.createElement('div'));

    range!.handleCellMouseDown('r0', 'a', new MouseEvent('mousedown'));
    range!.handleCellMouseEnter('r1', 'b');

    expect(table!.atoms.cellSelection?.get()).toEqual([
      {
        anchorRowId: 'r0',
        anchorColumnId: 'a',
        focusRowId: 'r1',
        focusColumnId: 'b',
      },
    ]);
    expect(range!.currentRange.value).toEqual({ startRow: 0, startCol: 0, endRow: 1, endCol: 1 });
    const anchorCell = table!.getRow('r0').getAllCellsByColumnId().a!;
    const focusCell = table!.getRow('r1').getAllCellsByColumnId().b!;
    expect(anchorCell.getIsSelected()).toBe(true);
    expect(anchorCell.getSelectionEdges()).toMatchObject({ top: true, left: true });
    expect(focusCell.getSelectionEdges()).toMatchObject({ bottom: true, right: true });

    document.dispatchEvent(new MouseEvent('mouseup'));
    expect(range!.isDragging.value).toBe(false);
  });

  it('框选焦点在同一矩形内移动时只更新焦点所在行', async () => {
    type Row = { id: string; a: number; b: number };
    const tableRef = ref<STableInstance<Row>>();
    const mounted = mountSTable<Row>({
      columns: [
        { id: 'a', accessorKey: 'a' },
        { id: 'b', accessorKey: 'b' },
      ],
      dataSource: [
        { id: 'r0', a: 1, b: 2 },
        { id: 'r1', a: 3, b: 4 },
      ],
      rowKey: 'id',
      cellRangeSelection: { mode: 'cell' },
      ref: tableRef,
    } as never);
    app = mounted.app;
    await nextTick();

    const table = tableRef.value!.getTanStackTable();
    table.selectCellRange({
      anchorRowId: 's:r0',
      anchorColumnId: 'a',
      focusRowId: 's:r1',
      focusColumnId: 'b',
    });
    await nextTick();

    const cell = (rowId: string, columnId: string) =>
      mounted.host.querySelector<HTMLElement>(
        `tbody tr[data-row-key="${rowId}"] td[data-column-id="${columnId}"]`
      )!;
    expect(cell('r0', 'a').classList).toContain('s-table-cell-range-focused');
    expect(cell('r1', 'b').classList).not.toContain('s-table-cell-range-focused');

    // 只交换角点，矩形边界仍然是两行两列；展示层必须跟随 TanStack 焦点状态更新。
    table.setCellSelection([
      {
        anchorRowId: 's:r1',
        anchorColumnId: 'b',
        focusRowId: 's:r0',
        focusColumnId: 'a',
      },
    ]);
    await nextTick();

    expect(cell('r0', 'a').classList).not.toContain('s-table-cell-range-focused');
    expect(cell('r1', 'b').classList).toContain('s-table-cell-range-focused');
  });

  it('框选：拖拽中途卸载会释放组件监听并停止扩展', () => {
    type Row = { id: string; a: number; b: number };
    const features: TableFeatures = tableFeatures({ cellSelectionFeature });
    let table: Table<TableFeatures, Row>;
    let range: ReturnType<typeof useCellRange<Row>>;

    app = createApp({
      setup() {
        table = useTable<TableFeatures, Row>({
          features,
          data: [{ id: 'r0', a: 1, b: 2 }],
          columns: [
            { id: 'a', accessorKey: 'a' },
            { id: 'b', accessorKey: 'b' },
          ],
          getRowId: (row) => row.id,
        });
        range = useCellRange<Row>({
          table,
          cellSelectionState: useTableAtoms(table).cellSelection,
          rows: computed(() => table.getRowModel().rows),
          cellRangeSelection: computed(() => ({ mode: 'cell' as const })),
        });
        return () => h('div');
      },
    });
    app.mount(document.createElement('div'));

    const removeListener = vi.spyOn(document, 'removeEventListener');
    range!.handleCellMouseDown('r0', 'a', new MouseEvent('mousedown'));
    expect(range!.isDragging.value).toBe(true);
    expect(range!.currentRange.value).toEqual({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });

    app.unmount();
    app = null;

    // 卸载后即使再触发移入，公开选区也不应继续扩展。
    range!.handleCellMouseEnter('r0', 'b');

    const removedMouseUpListeners = removeListener.mock.calls.filter(
      ([type]) => type === 'mouseup'
    );
    expect(removedMouseUpListeners).toHaveLength(1);
    expect(range!.isDragging.value).toBe(false);
    expect(range!.currentRange.value).toEqual({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
  });

  it('框选：功能未启用时不扫描 dataSource 或调用业务 rowKey', async () => {
    type Row = { id: number; value: string };
    const features: TableFeatures = tableFeatures({ cellSelectionFeature });
    const dataSource = shallowRef<Row[]>([{ id: 1, value: 'a' }]);
    const resolveKey = vi.fn((row: Row) => row.id);

    app = createApp({
      setup() {
        const table = useTable<TableFeatures, Row>({
          features,
          data: dataSource,
          columns: [{ id: 'value', accessorKey: 'value' }],
          getRowId: (row) => String(row.id),
        });
        useCellRange({
          table,
          cellSelectionState: useTableAtoms(table).cellSelection,
          rows: computed(() => table.getRowModel().rows),
          cellRangeSelection: computed(() => undefined),
          dataSource: computed(() => dataSource.value),
          rowKey: computed(() => resolveKey),
        });
        return () => h('div');
      },
    });
    app.mount(document.createElement('div'));

    dataSource.value = [{ id: 2, value: 'b' }];
    await nextTick();
    expect(resolveKey).not.toHaveBeenCalled();
  });

  it('固定行高：普通行不读取布局，展开行只读取详情高度', () => {
    const parent = document.createElement('tbody');
    const main = document.createElement('tr');
    const detail = document.createElement('tr');
    detail.className = 's-table-expanded-row';
    parent.append(main, detail);

    let mainHeightReads = 0;
    Object.defineProperty(main, 'offsetHeight', {
      get: () => {
        mainHeightReads++;
        return 999;
      },
    });
    Object.defineProperty(detail, 'offsetHeight', { get: () => 80 });

    expect(measureVirtualRowBlock(main, undefined, 47)).toBe(127);
    expect(mainHeightReads).toBe(0);
    detail.remove();
    expect(measureVirtualRowBlock(main, undefined, 47)).toBe(47);
    expect(mainHeightReads).toBe(0);
  });

  it('自动滚动：容器自scroll 不刷新视口边界，window resize 才刷', async () => {
    const active = ref(false);
    const scrollElement = document.createElement('div');
    const scrollElementRef = ref<HTMLElement | null>(scrollElement);
    const getRect = vi.spyOn(scrollElement, 'getBoundingClientRect');

    app = createApp({
      setup() {
        useScroll({
          scrollElementRef,
          autoScroll: { active: computed(() => active.value) },
        });
        return () => h('div');
      },
    });
    app.mount(document.createElement('div'));

    active.value = true;
    await nextTick();
    expect(getRect).toHaveBeenCalledTimes(1);

    scrollElement.dispatchEvent(new Event('scroll'));
    expect(getRect).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('resize'));
    expect(getRect).toHaveBeenCalledTimes(2);
  });

  it('自动滚动：到达滚动边界后停止 RAF 空转', async () => {
    const callbacks = mockAnimationFrame();
    const active = ref(false);
    const scrollElement = document.createElement('div');
    vi.spyOn(scrollElement, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      right: 100,
      bottom: 100,
      left: 0,
      width: 100,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    // 模拟已经滚到底部：继续写 scrollTop 会被浏览器钳制为原值
    Object.defineProperty(scrollElement, 'scrollTop', { get: () => 0, set: () => undefined });
    Object.defineProperty(scrollElement, 'scrollLeft', { get: () => 0, set: () => undefined });

    app = createApp({
      setup() {
        useScroll({
          scrollElementRef: ref<HTMLElement | null>(scrollElement),
          autoScroll: { active: computed(() => active.value) },
        });
        return () => h('div');
      },
    });
    app.mount(document.createElement('div'));

    active.value = true;
    await nextTick();
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 99 }));
    expect(callbacks).toHaveLength(1);
    callbacks.shift()!(0);
    expect(callbacks).toHaveLength(0);
  });

  it('虚拟展开行：详情节点替换、注销和卸载都会释?ResizeObserver', () => {
    const observed: Element[] = [];
    const unobserved: Element[] = [];
    let disconnectCount = 0;

    class ResizeObserverMock {
      constructor(_callback: ResizeObserverCallback) {}
      observe(element: Element) {
        observed.push(element);
      }
      unobserve(element: Element) {
        unobserved.push(element);
      }
      disconnect() {
        disconnectCount++;
      }
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);

    let virtualApi: ReturnType<typeof useVirtual>;
    app = createApp({
      setup() {
        virtualApi = useVirtual({
          virtual: computed(() => true),
          rows: computed(() => []),
          scrollElementRef: ref<HTMLElement | null>(null),
        });
        return () => h('div');
      },
    });
    app.mount(document.createElement('div'));

    const firstDetail = document.createElement('tr');
    const secondDetail = document.createElement('tr');
    virtualApi!.measureExpandedElement('row-1', firstDetail);
    virtualApi!.measureExpandedElement('row-1', secondDetail);
    virtualApi!.measureExpandedElement('row-1', null);

    expect(observed).toEqual([firstDetail, secondDetail]);
    expect(unobserved).toEqual([firstDetail, secondDetail]);

    virtualApi!.measureExpandedElement('row-2', firstDetail);
    app.unmount();
    app = null;
    expect(disconnectCount).toBe(1);
  });

  it('虚拟主行离屏时把 null ref 交给 TanStack 释放?DOM', () => {
    type VirtualRow = { id: number };
    const observed: Element[] = [];
    const unobserved: Element[] = [];
    class ResizeObserverMock {
      constructor(_callback: ResizeObserverCallback) {}
      observe(element: Element) {
        observed.push(element);
      }
      unobserve(element: Element) {
        unobserved.push(element);
      }
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);

    const scrollElement = document.createElement('div');
    document.body.appendChild(scrollElement);
    const mainRow = document.createElement('tr');
    mainRow.dataset.index = '0';
    scrollElement.appendChild(mainRow);
    const rows = computed(() => [{ id: 'n:1' }] as TanStackRow<TableFeatures, VirtualRow>[]);
    let virtualApi: ReturnType<typeof useVirtual<VirtualRow>>;

    app = createApp({
      setup() {
        virtualApi = useVirtual<VirtualRow>({
          virtual: computed(() => true),
          rows,
          scrollElementRef: ref<HTMLElement | null>(scrollElement),
        });
        return () => h('div');
      },
    });
    app.mount(document.createElement('div'));

    virtualApi!.measureElement(mainRow);
    expect(observed).toContain(mainRow);
    mainRow.remove();
    virtualApi!.measureElement(null);
    expect(unobserved).toContain(mainRow);
    scrollElement.remove();
  });

  it('虚拟展开行：受控 key 数组替换后也会触发行高重测', async () => {
    const expandedKeys = ref<STableRowKey[]>([1, 2]);
    const scrollElement = document.createElement('div');
    const queryRow = vi.spyOn(scrollElement, 'querySelector');

    app = createApp({
      setup() {
        useVirtual({
          virtual: computed(() => true),
          rows: computed(() => []),
          scrollElementRef: ref<HTMLElement | null>(scrollElement),
          expandedRowKeys: computed(() => expandedKeys.value),
        });
        return () => h('div');
      },
    });
    app.mount(document.createElement('div'));
    queryRow.mockClear();

    expandedKeys.value = [2];
    await nextTick();
    await nextTick();

    expect(queryRow).toHaveBeenCalledWith('.s-table-row[data-index][data-row-id="n:1"]');
  });

  it('虚拟行高策略动态变化后会失TanStack 测量缓存', async () => {
    type VirtualRow = { id: number };
    const virtual = ref<boolean | STableVirtualProps>({
      y: true,
      x: false,
      rowHeight: 47,
    });
    const rows = computed(
      () =>
        Array.from({ length: 3 }, (_, index) => ({
          id: `n:${index}`,
        })) as TanStackRow<TableFeatures, VirtualRow>[]
    );
    let virtualApi: ReturnType<typeof useVirtual<VirtualRow>>;

    app = createApp({
      setup() {
        virtualApi = useVirtual<VirtualRow>({
          virtual: computed(() => virtual.value),
          rows,
          scrollElementRef: ref<HTMLElement | null>(null),
        });
        return () => h('div');
      },
    });
    app.mount(document.createElement('div'));

    expect(virtualApi!.totalSize.value).toBe(141);
    virtual.value = { y: true, x: false, rowHeight: 60 };
    await nextTick();
    expect(virtualApi!.totalSize.value).toBe(180);

    // 关闭期间修改配置后重开，也不能复用关闭前的 60px 缓存
    virtual.value = false;
    await nextTick();
    virtual.value = { y: true, x: false, rowHeight: 70 };
    await nextTick();
    expect(virtualApi!.totalSize.value).toBe(210);
  });

  it('触底检测：IntersectionObserver 哨兵替代滚动与布局轮询并在卸载时释放', async () => {
    let observerCallback: IntersectionObserverCallback | undefined;
    let observerOptions: IntersectionObserverInit | undefined;
    let disconnectCount = 0;
    const observed: Element[] = [];
    class IntersectionObserverMock {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        observerCallback = callback;
        observerOptions = options;
      }
      observe(element: Element) {
        observed.push(element);
      }
      unobserve() {}
      disconnect() {
        disconnectCount++;
      }
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);

    const scrollElement = document.createElement('div');
    const sentinel = document.createElement('div');
    scrollElement.appendChild(sentinel);
    const reachedBottom = vi.fn();
    let scrollState: ReturnType<typeof useScroll>;

    app = createApp({
      setup() {
        scrollState = useScroll({
          scrollElementRef: ref<HTMLElement | null>(scrollElement),
          scrollToBottom: {
            sentinel: ref<HTMLElement | null>(sentinel),
            offset: ref(80),
            onScrollToBottom: reachedBottom,
          },
        });
        return () => h('div');
      },
    });
    app.mount(document.createElement('div'));

    // root 为滚动容器；触底阈值通过 rootMargin 表达，滚动热路径不再读取任何布局。
    expect(observerOptions).toMatchObject({
      root: scrollElement,
      rootMargin: '0px 0px 80px 0px',
    });
    expect(observed).toEqual([sentinel]);

    observerCallback!(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
    expect(scrollState!.isScrollToBottom.value).toBe(true);
    expect(reachedBottom).toHaveBeenCalledTimes(1);

    // 同方向重复通知不再触发状态写入或事件派发。
    observerCallback!(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
    expect(reachedBottom).toHaveBeenCalledTimes(1);

    observerCallback!(
      [{ isIntersecting: false } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
    expect(scrollState!.isScrollToBottom.value).toBe(false);

    app.unmount();
    app = null;
    expect(disconnectCount).toBe(1);
  });
});
