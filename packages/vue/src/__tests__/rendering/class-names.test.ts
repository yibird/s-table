import { describe, expect, it } from 'vite-plus/test';
import { nextTick } from 'vue';
import { mountSTable } from '../helpers';

interface Row {
  id: number;
  name: string;
}

const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: '名称' },
];
const dataSource: Row[] = [{ id: 1, name: 'A' }];

describe('表格类名入口', () => {
  it('classes 注入到对应的语义节点', async () => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      rowKey: 'id',
      classes: { body: 'custom-body', header: 'custom-header' },
    } as never);
    await nextTick();

    const tbody = mounted.host.querySelector('tbody')!;
    const thead = mounted.host.querySelector('thead')!;
    expect(tbody.classList.contains('custom-body')).toBe(true);
    expect(thead.classList.contains('custom-header')).toBe(true);

    mounted.app.unmount();
    mounted.host.remove();
  });
});
