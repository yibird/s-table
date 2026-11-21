import { afterEach, describe, expect, it } from 'vite-plus/test';
import { createApp, createCommentVNode, h, nextTick, shallowRef, type App } from 'vue';
import { Loading } from '../../components';
import STable from '../../STable.vue';

let app: App | null = null;
let host: HTMLElement | null = null;

const mount = (render: () => ReturnType<typeof h>) => {
  app = createApp({ render });
  host = document.createElement('div');
  document.body.appendChild(host);
  app.mount(host);
  return host;
};

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('Loading', () => {
  it('默认渲染四点指示器并保留状态标签', () => {
    const element = mount(() => h(Loading));
    const indicator = element.querySelector('.s-table-loading-indicator');
    expect(indicator?.getAttribute('role')).toBe('status');
    expect(indicator?.getAttribute('aria-label')).toBeTruthy();
    expect(element.querySelector('.s-table-loading-spin')?.getAttribute('aria-hidden')).toBe(
      'true'
    );
    expect(element.querySelectorAll('.s-table-loading-dot')).toHaveLength(4);
    expect(element.querySelector('.s-table-loading-grid')).toBeNull();
  });

  it('自定义内容替换默认指示器，空插槽恢复默认内容', async () => {
    const custom = shallowRef(false);
    const element = mount(() =>
      h(Loading, null, {
        default: () =>
          custom.value
            ? h('span', { class: 'custom-loading' }, '正在同步')
            : [createCommentVNode(), '  '],
      })
    );
    expect(element.querySelector('.s-table-loading-spin')).not.toBeNull();
    custom.value = true;
    await nextTick();
    expect(element.querySelector('.custom-loading')?.textContent).toBe('正在同步');
    expect(element.querySelector('.s-table-loading-spin')).toBeNull();
    custom.value = false;
    await nextTick();
    expect(element.querySelector('.custom-loading')).toBeNull();
    expect(element.querySelector('.s-table-loading-spin')).not.toBeNull();
  });

  it('动态新增或移除插槽时重新选择回退内容', async () => {
    const custom = shallowRef(false);
    const element = mount(() =>
      h(Loading, null, custom.value ? { default: () => h('span', '自定义加载') } : {})
    );
    expect(element.querySelector('.s-table-loading-spin')).not.toBeNull();
    custom.value = true;
    await nextTick();
    expect(element.textContent).toContain('自定义加载');
    expect(element.querySelector('.s-table-loading-spin')).toBeNull();
    custom.value = false;
    await nextTick();
    expect(element.querySelector('.s-table-loading-spin')).not.toBeNull();
  });

  it('切换 loading 不移除表格数据', async () => {
    const loading = shallowRef(true);
    const element = mount(() =>
      h(STable<{ id: number; name: string }>, {
        columns: [{ id: 'name', accessorKey: 'name', header: '姓名' }],
        dataSource: [{ id: 1, name: 'Alice' }],
        rowKey: 'id',
        pagination: false,
        loading: loading.value,
      })
    );
    expect(element.querySelector('.s-table-loading')).not.toBeNull();
    expect(element.querySelector('tbody')?.textContent).toContain('Alice');
    loading.value = false;
    await nextTick();
    expect(element.querySelector('.s-table-loading')).toBeNull();
    expect(element.querySelector('tbody')?.textContent).toContain('Alice');
  });
});
