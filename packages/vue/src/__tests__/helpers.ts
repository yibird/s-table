import { createApp, h, type App, type Component } from 'vue';
import type { RowData } from '@tanstack/vue-table';
import STable from '../STable.vue';
import type { STableProps, STableSlots } from '../types';

/**
 * 测试专用：类型安全地挂载 `STable`。
 *
 * 背景：`STable` 是泛型 SFC。在模板中使用（`<STable :columns="..." />`）时 Vue 能正确
 * 推断 `TData`；但用 `h(STable, props)` 渲染函数挂载时，Vue 的 `h()` 重载无法推断 SFC 泛型，
 * `TData` 会退化为 `RowData`，导致 `STableColumn<Row>[]` 因 TanStack 的泛型不变性而报
 * TS2769（详见架构说明「TanStack 耦合」）。
 *
 * 该 helper 用显式泛型参数 `TData` 保持「调用方 props 完整类型检查」（columns / dataSource /
 * rowSelection 等仍按 TData 校验），仅在传入 `h()` 的边界处做一次局部转型，把 `h()` 的推断
 * 限制收敛在这一个地方，而不是散落到每个测试。
 *
 * @template TData 行数据类型。
 * @param props 组件 props（按 TData 强类型校验）。
 * @param slots 可选插槽渲染函数。
 * @returns `{ app, host }`：已挂载的应用实例与宿主 DOM 节点，测试结束需 `app.unmount()` + `host.remove()`。
 */
export function mountSTable<TData extends RowData>(
  props: (STableProps<TData> & { ref?: unknown }) | (() => STableProps<TData> & { ref?: unknown }),
  slots?: Partial<STableSlots<TData>>
): { app: App; host: HTMLElement } {
  const host = document.createElement('div');
  document.body.appendChild(host);
  // 支持传入 props 的 getter：响应式测试（在 render 期读取会被追踪的可变状态）需要每次
  // 渲染重新求值 props，否则闭包只捕获挂载时的一份快照，后续状态变更不会反映到组件。
  const getProps = typeof props === 'function' ? props : () => props;
  const app = createApp({
    render: () => h(STable as unknown as Component, getProps() as Record<string, unknown>, slots),
  });
  app.mount(host);
  return { app, host };
}
