import { afterEach, describe, expect, it } from 'vitest';
import { createApp, h, type App } from 'vue';
import { Loading } from '../../components';

let app: App | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('Loading 默认状态', () => {
  it('渲染表格语义的环形扫描指示器', () => {
    app = createApp({ render: () => h(Loading) });
    host = document.createElement('div');
    document.body.appendChild(host);
    app.mount(host);

    const indicator = host.querySelector('.s-table-loading-indicator');
    expect(indicator?.getAttribute('role')).toBe('status');
    expect(host.querySelector('.s-table-loading-spin')).not.toBeNull();
    expect(host.querySelectorAll('.s-table-loading-grid-cell')).toHaveLength(4);
    expect(host.querySelector('.s-table-loading-dot')).toBeNull();
  });
});
