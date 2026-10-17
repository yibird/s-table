import { describe, it, expect, afterEach } from 'vitest';
import { h, nextTick, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn, STableRowKey } from '../../types';

/**
 * 展开行的测量结构测试（回归用例） *
 * Bug：展开行曾复用主行的测ref（`:ref="item.ref"`）且data-index。虚拟模式下这会
 * 污染 virtualizer size 缓存（indexFromElement 读不data-index NaN），使展开内容
 * 高度不计入总高度、滚动定位失准 *
 * 修复后：展开行是主行的兄`<tr>`，「不」带 data-index、「不」复用测ref；虚拟模式下
 * 其高度由 useVirtual measureElement 并入主行所在「逻辑行块」统一测量 *
 * 该结构不变式在虚/ 非虚拟模式下由同一模板产生，此处用非虚拟模式断言（happy-dom
 * 不做真实布局，虚拟模式因容器高度0 不渲染任何行，无法在此环境验证像素测量） */

interface Row {
  id: number;
  name: string;
}

let app: App | null = null;
let host: HTMLElement | null = null;

const dataSource: Row[] = [
  { id: 1, name: 'a' },
  { id: 2, name: 'b' },
  { id: 3, name: 'c' },
];

const columns: STableColumn<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: 'Name' },
];

const mount = async (defaultExpandedRowKeys: STableRowKey[]) => {
  const mounted = mountSTable<Row>(
    { columns, dataSource, rowKey: 'id', expandable: {}, defaultExpandedRowKeys },
    {
      expandedRowRender: (scope) =>
        h('div', { class: 'expanded-content' }, `detail-${(scope.record as Row).id}`),
    }
  );
  app = mounted.app;
  host = mounted.host;
  await nextTick();
  await nextTick();
};

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('展开行测量结', () => {
  it('展开行作为兄<tr> 渲染，且不携data-index', async () => {
    await mount([1]);

    const expandedRow = host!.querySelector('.s-table-expanded-row');
    expect(expandedRow).not.toBeNull();
    // 关键不变式：展开行不得携?data-index（否则污?virtualizer 测量缓存
    expect(expandedRow!.hasAttribute('data-index')).toBe(false);
    expect(expandedRow!.querySelector('.expanded-content')?.textContent).toBe('detail-1');
  });

  it('展开行是其对应主行紧邻的下一个兄弟节', async () => {
    await mount([1]);

    const mainRows = host!.querySelectorAll('.s-table-row');
    expect(mainRows.length).toBe(3);

    // 第一行展开：其下一个兄弟应为展开
    const sibling = mainRows[0].nextElementSibling;
    expect(sibling?.classList.contains('s-table-expanded-row')).toBe(true);

    // 未展开的第二、三行下一个兄弟不应是展开
    expect(mainRows[1].nextElementSibling?.classList.contains('s-table-expanded-row')).toBe(false);
  });

  it('未展开时不渲染任何展开', async () => {
    await mount([]);

    expect(host!.querySelector('.s-table-expanded-row')).toBeNull();
    expect(host!.querySelectorAll('.s-table-row').length).toBe(3);
  });

  it('多行展开：每个展开行都不带 data-index', async () => {
    await mount([1, 3]);

    const expandedRows = host!.querySelectorAll('.s-table-expanded-row');
    expect(expandedRows.length).toBe(2);
    expandedRows.forEach((row) => {
      expect(row.hasAttribute('data-index')).toBe(false);
    });
  });
});
