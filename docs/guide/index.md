# 介绍

STable 是基于 Vue 3、TypeScript 和 TanStack Table 的数据表格组件。它提供稳定的公开列类型和 Vue 状态契约，并覆盖常见后台列表与数据工作台能力。

## 适用场景

- 需要排序、过滤、搜索、分页和选择的后台列表。
- 需要固定列、列宽调整、展开、汇总和导出的数据管理页面。
- 需要虚拟滚动、框选、右键菜单或行列拖拽的数据工作台。
- 需要以受控状态接入服务端分页、排序和过滤的业务系统。

## 设计原则

- `STableColumn<TData>` 与 TanStack 内部列类型隔离，减少上游类型变化对业务的影响。
- 选择、展开与分页同时支持受控和非受控模式。
- 复杂能力通过明确配置开启，基础表格只需要 columns 和 dataSource。
- CSS Variables 与语义化 styles/classes 分别负责主题和结构定制。

下一步阅读[快速开始](./getting-started)，或直接进入 [STable 能力总览](/components/s-table)。
