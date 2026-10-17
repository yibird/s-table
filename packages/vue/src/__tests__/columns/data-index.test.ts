import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { mountSTable } from '../helpers';

interface Row {
  id: number;
  team: { city: string };
}

describe('dataIndex 列别名', () => {
  it('使用 dataIndex 渲染单元格并推导列 ID（含嵌套路径）', async () => {
    const mounted = mountSTable<Row>({
      columns: [
        { dataIndex: 'id', header: 'ID' },
        { dataIndex: 'team.city', header: '城市' },
      ],
      dataSource: [{ id: 1, team: { city: 'Paris' } }],
      rowKey: 'id',
    });
    await nextTick();

    const cells = [...mounted.host.querySelectorAll('tbody tr.s-table-row td')];
    expect(cells.map((cell) => cell.textContent?.trim())).toEqual(['1', 'Paris']);
    const headers = [...mounted.host.querySelectorAll('thead th')].map((th) =>
      th.textContent?.trim()
    );
    expect(headers).toEqual(['ID', '城市']);

    mounted.app.unmount();
    mounted.host.remove();
  });
});
