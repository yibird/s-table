# S-Table

<p align="center">
  <strong>高性能 Vue 3 数据表格组件</strong>
  <br>
  基于 TanStack Table 构建，支持虚拟滚动、编辑、选择等完整功能
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@zchengfeng/s-table-vue"><img src="https://img.shields.io/npm/v/@zchengfeng/s-table-vue.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@zchengfeng/s-table-vue"><img src="https://img.shields.io/npm/dm/@zchengfeng/s-table-vue.svg" alt="npm downloads"></a>
  <a href="https://github.com/zchengfeng/s-table/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@zchengfeng/s-table-vue.svg" alt="license"></a>
</p>

## 特性

- **高性能虚拟滚动** - 纵向 + 横向虚拟化、动态行高测量，10 万行级数据可用
- **功能完整** - 排序、过滤、分页、编辑、展开、分组、固定列、拖拽、框选、汇总
- **类型安全** - 公开类型不泄漏 TanStack 内部类型，列定义按 `TData` 推导取值类型
- **可复用核心** - 列管线、编辑、选择等核心逻辑位于框架无关的 core 包
- **国际化** - 内置中英文，支持自定义语言包

## 安装

```bash
npm install @zchengfeng/s-table-vue
# 或 pnpm add @zchengfeng/s-table-vue
```

## 快速开始

```vue
<script setup lang="ts">
import { ref } from 'vue';
import STable from '@zchengfeng/s-table-vue';
import '@zchengfeng/s-table-vue/style.css';

interface User {
  id: number;
  name: string;
  age: number;
  email: string;
}

const columns = [
  { accessorKey: 'id', header: 'ID', width: 80 },
  { accessorKey: 'name', header: '姓名', width: 120 },
  { accessorKey: 'age', header: '年龄', width: 100 },
  { accessorKey: 'email', header: '邮箱' },
];

const dataSource = ref<User[]>([
  { id: 1, name: 'Alice', age: 25, email: 'alice@example.com' },
  { id: 2, name: 'Bob', age: 30, email: 'bob@example.com' },
]);
</script>

<template>
  <STable :columns="columns" :data-source="dataSource" row-key="id" />
</template>
```

虚拟滚动、编辑、选择等示例见 `docs/demos/`。

## 文档

文档站点位于 `docs/`（VitePress）：

```bash
pnpm docs:dev      # 本地开发
pnpm docs:build    # 构建静态站点
```

包含 20+ 篇指南与 50+ 个可运行示例（基础、虚拟滚动、编辑、树形、分组、框选、主题等）。

## 架构

```
packages/core   @zchengfeng/s-table-core   框架无关：列管线、编辑、选择等核心逻辑
packages/vue    @zchengfeng/s-table-vue    Vue 3 适配层：响应式绑定、组件渲染、DOM 交互
packages/react                             规划中；接入前请先参考 core 的模块边界与 vue 适配层的组合方式
```

依赖方向严格单向：`vue → core`。core 不引入任何框架依赖。

core 按领域组织：`columns/`（列归一化与列序）、`state/`（分页 / 排序 / 选择状态机）、
`clipboard/`（RFC 4180 与公式注入防护）、`interaction/`、`scroll/`、`editing/`、`utils/`。

Vue 适配层：`setup/` 是唯一组合根；`adapter/` 负责 TanStack 响应式桥；`presets/` 持有内置注入列；
`hooks/` 只放状态与交互 hook（不得依赖组件）；`components/` 不得依赖 hooks/setup；
`locales/`、`theme/`、`types/` 为共享领域模块。依赖边界由 `pnpm check:boundaries` 静态校验。

## 性能基准

以下为 Node 环境 row model 基准（`pnpm bench:performance`），不代表浏览器渲染帧率：

| 数据规模 | Row Model | 排序  | 过滤  | 推荐场景                               |
| -------- | --------- | ----- | ----- | -------------------------------------- |
| 1K 行    | 1.6 ms    | 3 ms  | 2 ms  | 所有功能流畅                           |
| 10K 行   | 14 ms     | 9 ms  | 9 ms  | 推荐场景                               |
| 100K 行  | 99 ms     | 86 ms | 67 ms | 需虚拟滚动 + 固定行高 + 关闭客户端排序 |
| 1M 行    | 2.2 s     | 1.7 s | 1.1 s | 需服务端分页/排序/过滤                 |

Bundle 预算（`pnpm check:bundle-size`）：主包 ≤ 64 KB gzip、样式 ≤ 10 KB gzip。

## API 稳定性

| 分层 | 说明                                                                               |
| ---- | ---------------------------------------------------------------------------------- |
| 稳定 | 组件 props / events / slots / 实例方法中未标注 `experimental` 的部分               |
| 实验 | JSDoc 标注 `@experimental` 的能力：编辑、框选、行/列拖拽、分组、固定行、选择意图等 |
| 内部 | `setup/`、`hooks/` 等非公开导出，不保证兼容                                        |

0.x 阶段的破坏性变更会记录在 `CHANGELOG.md`。

## 开发

```bash
pnpm install
pnpm docs:dev            # 文档开发
pnpm test                # 单元测试（core + vue）
pnpm test:e2e            # Playwright E2E
pnpm typecheck:all       # 全仓类型检查（含 e2e）
pnpm build               # 构建 core + vue
pnpm check               # CI 全量检查
```

测试规模：312 个单元测试（core 35 + vue 277）、40 个 E2E 场景、性能基准与 bundle 预算检查。

## 浏览器支持

现代浏览器（Chrome / Firefox / Safari / Edge 最新两个大版本），Node.js ≥ 20。
Vue 3 不再支持 IE11。

## 贡献

请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。提交信息遵循 Conventional Commits。

## 许可证

[ISC](./LICENSE)
