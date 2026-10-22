import { describe, it, expect, afterEach } from 'vite-plus/test';
import { nextTick, reactive, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn, STableInstance, STableRowKey } from '../../types';

/**
 * 状态所有权表征测试（Phase B-1） *
 * 目的：在把「嵌套配+ 回调」重构为 v-model 之前，锁定选中 / 展开 / 分页的现有行为，
 * 使重构后只需调整「输props 的写法」，而行为断言保持不变——从而确保零回归 *
 * 断言的是行为（DOM 与回调），不API 形状 */

interface Row {
  id: number;
  name: string;
}

let app: App | null = null;
let host: HTMLElement | null = null;

const columns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: 'Name' },
];

const data: Row[] = [
  { id: 1, name: 'a' },
  { id: 2, name: 'b' },
  { id: 3, name: 'c' },
];

const rowClasses = (): string[] =>
  Array.from(host!.querySelectorAll('tbody tr.s-table-row')).map((tr) => tr.className);

const selectedRowIndexes = (): number[] =>
  rowClasses()
    .map((c, i) => (c.includes('s-table-row-selected') ? i : -1))
    .filter((i) => i !== -1);

const bodyCheckboxes = (): HTMLInputElement[] =>
  Array.from(host!.querySelectorAll('tbody .s-table-selection-cell input'));

const expandTriggers = (): HTMLElement[] =>
  Array.from(host!.querySelectorAll('tbody .s-table-expand-trigger'));

const expandedRowCount = (): number =>
  host!.querySelectorAll('tbody tr.s-table-expanded-row').length;

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('表征：行选择', () => {
  it('非受checkbox：点击复选框选中行，触发 onChange(keys, rows)', async () => {
    const calls: { keys: STableRowKey[]; rows: Row[] }[] = [];
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>({
      columns,
      dataSource: data,
      rowKey: 'id',
      rowSelection: { type: 'checkbox' },
      ref: (value: unknown) => {
        instance = value as STableInstance<Row>;
      },
      onSelectChange: (keys: STableRowKey[], rows: Row[]) =>
        calls.push({ keys: [...keys], rows: [...rows] }),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(selectedRowIndexes()).toEqual([]);

    // 勾选第 2 行
    bodyCheckboxes()[1].click();
    expect(instance!.getSelectedRows()).toEqual([{ id: 2, name: 'b' }]);
    await nextTick();

    expect(selectedRowIndexes()).toEqual([1]);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[calls.length - 1].keys).toEqual([2]);
    expect(calls[calls.length - 1].rows).toEqual([{ id: 2, name: 'b' }]);
  });

  it('全选后表头复选框为选中态而不是半选', async () => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource: data,
      rowKey: 'id',
      rowSelection: { type: 'checkbox' },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const headerCheckbox = host.querySelector<HTMLInputElement>(
      'thead .s-table-selection-header input'
    )!;
    headerCheckbox.click();
    await nextTick();

    expect(headerCheckbox.checked).toBe(true);
    expect(headerCheckbox.indeterminate).toBe(false);
  });

  it('受控 checkbox：外keys 决定选中；onChange 不自动改变选中，需外部回填', async () => {
    const state = reactive<{ keys: STableRowKey[] }>({ keys: [1] });
    const captured: STableRowKey[][] = [];
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>(
      () =>
        ({
          columns,
          dataSource: data,
          rowKey: 'id',
          rowSelection: { type: 'checkbox' },
          selectedRowKeys: state.keys,
          ref: (value: unknown) => {
            instance = value as STableInstance<Row>;
          },
          'onUpdate:selectedRowKeys': (keys: STableRowKey[]) => captured.push([...keys]),
        }) as never
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    // 初始受控选中?1
    expect(selectedRowIndexes()).toEqual([0]);

    // 点击?3 行：受控?onChange 收到期望 keys，但不回填则选中不变
    bodyCheckboxes()[2].click();
    await nextTick();
    expect(captured[captured.length - 1]).toEqual([1, 3]);
    expect(selectedRowIndexes()).toEqual([0]);
    // 受控父级未回填时，临时快照只存活当前微任务，不会长期覆盖外部状态。
    expect(instance!.getSelectedRows()).toEqual([data[0]]);

    // 外部回填后选中更新
    state.keys = [1, 3];
    await nextTick();
    expect(selectedRowIndexes()).toEqual([0, 2]);
  });

  it('radio：单选，选中新行替换旧行', async () => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource: data,
      rowKey: 'id',
      rowSelection: { type: 'radio' },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    bodyCheckboxes()[0].click();
    await nextTick();
    expect(selectedRowIndexes()).toEqual([0]);

    bodyCheckboxes()[2].click();
    await nextTick();
    expect(selectedRowIndexes()).toEqual([2]);
  });

  it('radio：默认或受控输入误传多个键时只渲染第一个选中', async () => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource: data,
      rowKey: 'id',
      rowSelection: { type: 'radio' },
      defaultSelectedRowKeys: [1, 2],
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(selectedRowIndexes()).toEqual([0]);
  });
});

describe('表征：行展开', () => {
  it('非受控：点击展开图标展开行，触发 onExpand(true, record)', async () => {
    const calls: { expanded: boolean; record: Row }[] = [];
    const mounted = mountSTable<Row>(
      {
        columns,
        dataSource: data,
        rowKey: 'id',
        expandable: {},
        onExpandChange: (expanded: boolean, record: Row) => calls.push({ expanded, record }),
      } as never,
      {
        expandedRowRender: (scope) => `detail-${(scope.record as Row).id}`,
      }
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(expandedRowCount()).toBe(0);

    expandTriggers()[0].click();
    await nextTick();

    expect(expandedRowCount()).toBe(1);
    expect(calls[calls.length - 1]).toEqual({ expanded: true, record: { id: 1, name: 'a' } });

    // 再次点击收起
    expandTriggers()[0].click();
    await nextTick();
    expect(expandedRowCount()).toBe(0);
  });

  it('受控：外expandedRowKeys 决定展开', async () => {
    const state = reactive<{ keys: STableRowKey[] }>({ keys: [] });
    const mounted = mountSTable<Row>(
      () =>
        ({
          columns,
          dataSource: data,
          rowKey: 'id',
          expandable: {},
          expandedRowKeys: state.keys,
          'onUpdate:expandedRowKeys': (keys: STableRowKey[]) => {
            state.keys = keys;
          },
        }) as never,
      {
        expandedRowRender: (scope) => `detail-${(scope.record as Row).id}`,
      }
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(expandedRowCount()).toBe(0);

    state.keys = [2];
    await nextTick();
    expect(expandedRowCount()).toBe(1);
  });

  it('实例 API 展开与收起单行时保持 expandChange 事件一', async () => {
    const calls: Array<{ expanded: boolean; record: Row }> = [];
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>(
      {
        columns,
        dataSource: data,
        rowKey: 'id',
        expandable: {},
        ref: (value: unknown) => {
          instance = value as STableInstance<Row>;
        },
        onExpandChange: (expanded: boolean, record: Row) => calls.push({ expanded, record }),
      } as never,
      {
        expandedRowRender: (scope) => `detail-${(scope.record as Row).id}`,
      }
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    instance!.expandRow(2);
    await nextTick();
    instance!.collapseRow(2);
    await nextTick();

    expect(calls).toEqual([
      { expanded: true, record: { id: 2, name: 'b' } },
      { expanded: false, record: { id: 2, name: 'b' } },
    ]);
  });

  it('multiple=false expandAll 仍只保留一个展开', async () => {
    let instance: STableInstance<Row> | null = null;
    const mounted = mountSTable<Row>(
      {
        columns,
        dataSource: data,
        rowKey: 'id',
        expandable: { multiple: false },
        ref: (value: unknown) => {
          instance = value as STableInstance<Row>;
        },
      } as never,
      {
        expandedRowRender: (scope) => `detail-${(scope.record as Row).id}`,
      }
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    instance!.expandAll();
    await nextTick();

    expect(expandedRowCount()).toBe(1);
    expect(instance!.getExpandedRowKeys()).toEqual([1]);
  });

  it('multiple=false 时默认展开键误传多个也只展开第一', async () => {
    const mounted = mountSTable<Row>(
      {
        columns,
        dataSource: data,
        rowKey: 'id',
        expandable: { multiple: false },
        defaultExpandedRowKeys: [1, 2],
      },
      {
        expandedRowRender: (scope) => `detail-${(scope.record as Row).id}`,
      }
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(expandedRowCount()).toBe(1);
  });
});
