import { describe, it, expect, afterEach } from 'vite-plus/test';
import { computed, nextTick, reactive, shallowRef, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn, STablePaginationProps } from '../../types';

interface Row {
  id: number;
  name: string;
}

let app: App | null = null;
let host: HTMLElement | null = null;

const mkData = (): Row[] =>
  Array.from({ length: 25 }).map((_, i) => ({ id: i + 1, name: `n${i + 1}` }));

const columns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: 'Name' },
];

const getBodyCol = (colIndex: number): string[] => {
  const bodyRows = Array.from(host!.querySelectorAll('tbody tr.s-table-row'));
  return bodyRows.map((tr) => {
    const cells = tr.querySelectorAll('td.s-table-cell');
    return cells[colIndex]?.textContent?.trim() ?? '';
  });
};

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('config 受控分页（demo 示例2 模式', () => {
  it('父级未回填受current 时只通知变更，不擅自切换内部页码', async () => {
    const changes: Array<{ page: number; pageSize: number }> = [];
    const pageEvents: Array<{ page: number; pageSize: number }> = [];
    const mounted = mountSTable<Row>({
      columns,
      dataSource: mkData(),
      pagination: {
        current: 1,
        pageSize: 10,
        onChange(page: number, pageSize: number) {
          changes.push({ page, pageSize });
        },
      },
      onPageChange: (payload: { page: number; pageSize: number }) => pageEvents.push(payload),
    } as never);
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    host.querySelector<HTMLElement>('.s-pagination-next')!.click();
    await nextTick();

    expect(changes).toEqual([{ page: 2, pageSize: 10 }]);
    expect(pageEvents).toEqual([{ page: 2, pageSize: 10 }]);
    expect(getBodyCol(0)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
  });

  it('父级直接更新受控 current 不会反向触发用户交互事件', async () => {
    const state = reactive({ current: 1 });
    const pageEvents: Array<{ page: number; pageSize: number }> = [];
    const mounted = mountSTable<Row>(
      () =>
        ({
          columns,
          dataSource: mkData(),
          pagination: { current: state.current, pageSize: 10 },
          onPageChange: (payload: { page: number; pageSize: number }) => pageEvents.push(payload),
        }) as never
    );
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    state.current = 2;
    await nextTick();

    expect(getBodyCol(0)).toEqual(['11', '12', '13', '14', '15', '16', '17', '18', '19', '20']);
    expect(pageEvents).toEqual([]);
  });

  it('通过 pagination.current 外部驱动页码变化', async () => {
    const state = reactive({ current: 1, pageSize: 10 });
    const pagination = computed<STablePaginationProps>(() => ({
      current: state.current,
      pageSize: state.pageSize,
      onChange(page: number, size: number) {
        state.current = page;
        state.pageSize = size;
      },
    }));

    const mounted = mountSTable<Row>(() => ({
      columns,
      dataSource: mkData(),
      pagination: pagination.value,
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(getBodyCol(0)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);

    // 外部?current 设为 2，期望表格显示第二页
    state.current = 2;
    await nextTick();

    expect(getBodyCol(0)).toEqual(['11', '12', '13', '14', '15', '16', '17', '18', '19', '20']);
  });

  it('受控 current 越界时分页视图与实际行模型使用同一有效页', async () => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource: mkData(),
      pagination: { current: 99, pageSize: 10 },
    });
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    expect(getBodyCol(0)).toEqual(['21', '22', '23', '24', '25']);
    expect(host.querySelector('.s-pagination-item-active')?.textContent?.trim()).toBe('3');
  });

  it('连续替换数据源时持续更新分页总页数', async () => {
    const source = shallowRef(mkData());
    const mounted = mountSTable<Row>(() => ({
      columns,
      dataSource: source.value,
      pagination: { defaultPageSize: 10 },
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const getPageLabels = () =>
      Array.from(
        host!.querySelectorAll<HTMLButtonElement>(
          '.s-pagination-item:not(.s-pagination-prev):not(.s-pagination-next):not(.s-pagination-jump-prev):not(.s-pagination-jump-next)'
        )
      ).map((button) => button.textContent?.trim());

    expect(getPageLabels()).toEqual(['1', '2', '3']);

    source.value = source.value.slice(0, 15);
    await nextTick();
    expect(getPageLabels()).toEqual(['1', '2']);

    source.value = source.value.slice(0, 5);
    await nextTick();
    expect(getPageLabels()).toEqual(['1']);
  });

  it('点击下一页触onChange 后，表格数据切换到第二页', async () => {
    const state = reactive({ current: 1, pageSize: 10 });
    const pagination = computed<STablePaginationProps>(() => ({
      current: state.current,
      pageSize: state.pageSize,
      onChange(page: number, size: number) {
        state.current = page;
        state.pageSize = size;
      },
    }));

    const mounted = mountSTable<Row>(() => ({
      columns,
      dataSource: mkData(),
      pagination: pagination.value,
    }));
    app = mounted.app;
    host = mounted.host;
    await nextTick();

    const nextBtn = host.querySelector<HTMLElement>('.s-pagination-next')!;
    nextBtn.click();
    await nextTick();

    expect(state.current).toBe(2);
    expect(getBodyCol(0)).toEqual(['11', '12', '13', '14', '15', '16', '17', '18', '19', '20']);
  });
});
