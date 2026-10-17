# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与语义化版本（0.x 阶段允许破坏性变更）。

## [0.1.0] - 2026-09-15

首个带架构契约的版本。库尚未发布，API 仍可能破坏性调整。

### Added

- **`classNames` prop**：表格类名的新推荐入口（对齐 Ant Design v5）；原 `classes` 保留兼容并标记废弃，两者同时提供时 `classNames` 优先。
- **列定义 `dataIndex` 别名**：与 `accessorKey` 等价（支持嵌套路径），导出/导入推导同样识别；同时提供时 `accessorKey` 优先，新增 `STableDataIndexColumn` 公开类型。
- **codec 注册表**（core）：`registerSTableDataCodec` / `unregisterSTableDataCodec` / `listSTableDataCodecs` / `hasSTableDataCodec`，以及 `@zchengfeng/s-table-core/codecs` 子入口用于注册 hucre 内置实现。
- **core 列管线**：`normalizeColumnState`、`resolveSTableColumnId`、`getCellRenderToken`、列元数据（pinning / visibility / 宽度 / token），框架无关。
- **core 编辑原语**：`cloneEditingState`、`sameEditingState`、`isColumnEditable`、`replaceRecordInTree`、`applyEditingValues`。
- **`ARCHITECTURE.md`**：核心 / 适配层分层契约与新框架接入清单。

### Changed

- **可读性清理（渲染热路径）**：删除三处无基准收益的隐式缓存——Body 的树缩进行内样式缓存、行选择 `getCheckboxProps` 的微任务缓存、`useRowRenderItems` 的渲染项对象原地复用；渲染项改为每次求值创建，`getCheckboxProps` 回调不再承诺"每行每轮只解析一次"（应为纯函数）。
- **删除转发 shim**：`utils/tree.ts`、`utils/objectPath.ts` 移除，内部直接引用 core。
- **类型按域拆分**：`types/types.ts`（1209 行）拆出功能域类型到 `types/features.ts`（578 行），原文件保留组件 API（Props/Emits/Slots/Instance，491 行）；公开类型导出路径与名称不变。
- **类型域二次拆分**：`features.ts` 退化为 4 行桶文件，功能类型按域拆为 `types/config.ts`（分页/过滤/尺寸/虚拟化/编辑）、`types/interaction.ts`（拖拽/复制/展开/框选）、`types/selection.ts`（选择/样式），单文件均小于 180 行。
- **Body 逻辑拆分**：行渲染辅助（树缩进、列索引、分组行上下文、可见单元格集合）移入 `components/body/useBodyRowRendering.ts`，Body 组件只保留模板与装配。
- **setup 上下文去重**：`STable.vue` 不再逐字段解构 props 再手工映射进 `STableSetupContext`，改为一次 `toRefs(props)` 展开 + 少量派生覆写，删除约 50 行重复映射。
- **列度量独立**：`useSTable.ts` 的可见叶子列宽度计算、固定列标记、sticky 变量与表格根样式抽为 `hooks/useSTableColumnMetrics.ts`，`useSTable.ts` 只保留实例创建与行模型派生。
- **性能门禁脚本**：新增 `pnpm test:e2e:perf`，快速运行既有帧耗时/长任务/堆增长基线（CI 已在三浏览器执行）。
- **token 完整性测试**：新增用例锁定 `getCellRenderToken` 覆盖全部 39 个公开列语义字段，防止未来新增字段漏入 token 导致脏渲染。

- **core 主入口零解析库依赖**：`hucre` 改为可选 peer 依赖；CSV 流式导出使用 core 内置写出器。Vue 主包 gzip 从 60.6 KB 降至 57.2 KB，解析器全部走按需动态加载。
- **`STable.vue` 1301 → 约 530 行**：拆分为 `setup/` 下 7 个 setup composable（纯移动，行为不变）。
- 列归一化与编辑逻辑改为复用 core；Vue 层只保留响应式绑定。
- 受控状态同步统一要求不可变替换（shallow）：`editing`、`groupBy`、`pinnedRowKeys`、`selectionIntent`、`selectedRowKeys`、`expandedRowKeys` 均不再深度监听原地修改；数组原地 `push` / `splice` 不再生效，请替换引用。
- 虚拟行高测量在小批量脏行时改为单次 DOM 遍历（原来每个脏行一次 `querySelector`）。

### Removed

- 根目录过期的 AI 审查文档（`ARCHITECTURE_REVIEW.md`、`REFACTOR_PLAN.md`、`TODO.md`），内容由 `ARCHITECTURE.md` 取代。
- 死代码：`packages/vue/src/types/column.ts`（无引用的兼容入口）与空的 `packages/react/` 目录。
- 两个包补充 `repository` / `homepage` 元数据，满足 npm 发布规范。

### Breaking

- 直接使用 core 内置格式前必须先注册实现：

  ```ts
  import { registerHucreDataCodecs } from '@zchengfeng/s-table-core/codecs';
  registerHucreDataCodecs();
  ```

  `@zchengfeng/s-table-vue` 已自动注册；使用组件的业务方无需改动。

- 非受控 ↔ 受控切换语义不变，但受控数组/对象需以替换引用方式更新（包括 `selectedRowKeys` / `expandedRowKeys`）。
