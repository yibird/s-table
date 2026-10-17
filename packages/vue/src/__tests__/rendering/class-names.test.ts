import { describe, expect, it } from 'vitest';
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
  it('classNames 优先于已废弃的 classes', async () => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      rowKey: 'id',
      classNames: { body: 'new-body' },
      classes: { body: 'legacy-body' },
    } as never);
    await nextTick();

    const tbody = mounted.host.querySelector('tbody')!;
    expect(tbody.classList.contains('new-body')).toBe(true);
    expect(tbody.classList.contains('legacy-body')).toBe(false);

    mounted.app.unmount();
    mounted.host.remove();
  });

  it('仅提供 classes 时保持兼容', async () => {
    const mounted = mountSTable<Row>({
      columns,
      dataSource,
      rowKey: 'id',
      classes: { body: 'legacy-body' },
    } as never);
    await nextTick();

    expect(mounted.host.querySelector('tbody')!.classList.contains('legacy-body')).toBe(true);

    mounted.app.unmount();
    mounted.host.remove();
  });
});
