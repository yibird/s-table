import { describe, expectTypeOf, it } from 'vite-plus/test';
import type { VNodeChild } from 'vue';
import type { STableSlots, STableTitleContext } from '../../types';

type Row = { id: number; name: string };

describe('STable 插槽类型', () => {
  it('scoped 插槽按 TData 推导行数据', () => {
    type Slots = STableSlots<Row>;
    type ContextMenuScope = Parameters<NonNullable<Slots['contextMenu']>>[0];
    type ExpandedRowScope = Parameters<NonNullable<Slots['expandedRowRender']>>[0];
    type RowDragHandleScope = Parameters<NonNullable<Slots['rowDragHandle']>>[0];
    type CellEditorScope = Parameters<NonNullable<Slots['cellEditor']>>[0];
    type FilterPanelScope = Parameters<NonNullable<Slots['filterPanel']>>[0];

    expectTypeOf<ContextMenuScope['row']>().toEqualTypeOf<Row>();
    expectTypeOf<ContextMenuScope['rowIndex']>().toEqualTypeOf<number>();
    expectTypeOf<ContextMenuScope['close']>().toEqualTypeOf<() => void>();

    expectTypeOf<ExpandedRowScope['record']>().toEqualTypeOf<Row>();
    expectTypeOf<ExpandedRowScope['expanded']>().toEqualTypeOf<boolean>();
    expectTypeOf<RowDragHandleScope['record']>().toEqualTypeOf<Row>();

    expectTypeOf<CellEditorScope['record']>().toEqualTypeOf<Row>();
    expectTypeOf<CellEditorScope['value']>().toEqualTypeOf<unknown>();
    expectTypeOf<CellEditorScope['setValue']>().toEqualTypeOf<(value: unknown) => void>();

    expectTypeOf<FilterPanelScope['selectedKeys']>().toEqualTypeOf<(string | number | boolean)[]>();
    expectTypeOf<FilterPanelScope['setSelectedKeys']>().toEqualTypeOf<
      (values: (string | number | boolean)[]) => void
    >();
  });

  it('无作用域插槽只接受渲染函数', () => {
    type Slots = STableSlots<Row>;
    expectTypeOf<NonNullable<Slots['empty']>>().toEqualTypeOf<() => VNodeChild>();
    expectTypeOf<NonNullable<Slots['summary']>>().toEqualTypeOf<() => VNodeChild>();
    expectTypeOf<STableTitleContext<Row>['currentPageData']>().toEqualTypeOf<Row[]>();
  });
});
