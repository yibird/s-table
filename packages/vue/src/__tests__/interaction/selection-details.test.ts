import { afterEach, describe, expect, it } from 'vite-plus/test';
import { h, nextTick, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn, STableInstance } from '../../types';

interface Row {
  id: number;
  name: string;
  children?: Row[];
}

const columns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: 'Name' },
];

const flatData: Row[] = [
  { id: 1, name: 'a' },
  { id: 2, name: 'b' },
];

const treeData: Row[] = [
  {
    id: 1,
    name: 'p',
    children: [
      { id: 11, name: 'c1' },
      { id: 12, name: 'c2' },
    ],
  },
  { id: 2, name: 'q' },
];

let app: App | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  app?.unmount();
  host?.remove();
  document.querySelectorAll('.s-table-selection-dropdown-menu').forEach((el) => el.remove());
  app = null;
  host = null;
});

const mount = async (props: Record<string, unknown>) => {
  let instance: STableInstance<Row> | null = null;
  const mounted = mountSTable<Row>({
    columns,
    dataSource: flatData,
    rowKey: 'id',
    ref: (value: unknown) => {
      instance = value as STableInstance<Row>;
    },
    ...props,
  } as never);
  app = mounted.app;
  host = mounted.host;
  await nextTick();
  return instance!;
};

const selectionInputs = () =>
  Array.from(host!.querySelectorAll<HTMLInputElement>('tbody .s-table-selection-cell input'));

describe('选择细节', () => {
  it('allowCancelRadio 控制再次点击已选 Radio 是否取消', async () => {
    const instance = await mount({ rowSelection: { type: 'radio' } });
    selectionInputs()[0]!.click();
    await nextTick();
    selectionInputs()[0]!.click();
    await nextTick();
    expect(instance.getSelectedRowKeys()).toEqual([1]);

    app!.unmount();
    host!.remove();
    const cancellable = await mount({
      rowSelection: { type: 'radio', allowCancelRadio: true },
    });
    selectionInputs()[0]!.click();
    await nextTick();
    selectionInputs()[0]!.click();
    await nextTick();
    expect(cancellable.getSelectedRowKeys()).toEqual([]);
  });

  it('columnTitle 替换内置选择列表头', async () => {
    await mount({
      rowSelection: {
        type: 'checkbox',
        columnTitle: ({ allSelected }: { allSelected: boolean }) =>
          h('span', { class: 'custom-selection-title' }, allSelected ? 'all' : 'none'),
      },
    });

    expect(host!.querySelector('.custom-selection-title')?.textContent).toBe('none');
    expect(host!.querySelector('.s-table-selection-header input[type="checkbox"]')).toBeNull();
  });

  it('hideDefaultSelections 只保留自定义选项', async () => {
    await mount({
      rowSelection: {
        type: 'checkbox',
        hideDefaultSelections: true,
        selections: [{ key: 'custom', text: 'Custom' }],
      },
    });

    host!.querySelector<HTMLElement>('.s-table-selection-dropdown-trigger')!.click();
    await nextTick();
    const items = Array.from(
      document.querySelectorAll<HTMLElement>('.s-table-selection-dropdown-item')
    );
    expect(items.map((item) => item.textContent?.trim())).toEqual(['Custom']);
  });

  it('checkStrictly=false 时父行选择级联到子树', async () => {
    const instance = await mount({
      dataSource: treeData,
      tree: { childrenColumnName: 'children' },
      rowSelection: { type: 'checkbox', checkStrictly: false },
    });

    const parent = host!.querySelector<HTMLElement>('tr[data-row-key="1"]')!;
    parent.querySelector<HTMLInputElement>('.s-table-selection-cell input')!.click();
    await nextTick();

    expect(instance.getSelectedRowKeys().sort()).toEqual([1, 11, 12]);
  });

  it('checkStrictly=true（默认）时父行选择不级联子树', async () => {
    const instance = await mount({
      dataSource: treeData,
      tree: { childrenColumnName: 'children' },
      defaultExpandedRowKeys: [1],
      rowSelection: { type: 'checkbox' },
    });

    const parent = host!.querySelector<HTMLElement>('tr[data-row-key="1"]')!;
    parent.querySelector<HTMLInputElement>('.s-table-selection-cell input')!.click();
    await nextTick();

    expect(instance.getSelectedRowKeys()).toEqual([1]);
  });

  it('checkStrictly=false 时子行全部选中会回填父行', async () => {
    const instance = await mount({
      dataSource: treeData,
      tree: { childrenColumnName: 'children' },
      defaultExpandedRowKeys: [1],
      rowSelection: { type: 'checkbox', checkStrictly: false },
    });

    const child1 = host!.querySelector<HTMLElement>('tr[data-row-key="11"]')!;
    const child2 = host!.querySelector<HTMLElement>('tr[data-row-key="12"]')!;
    child1.querySelector<HTMLInputElement>('.s-table-selection-cell input')!.click();
    await nextTick();
    child2.querySelector<HTMLInputElement>('.s-table-selection-cell input')!.click();
    await nextTick();

    expect(instance.getSelectedRowKeys().sort()).toEqual([1, 11, 12]);
  });
});
