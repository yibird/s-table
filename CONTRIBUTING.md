# 贡献指南

感谢你对 S-Table 项目的关注！我们欢迎任何形式的贡献。

## 🚀 快速开始

### 环境要求

- Node.js >= 20
- pnpm >= 10.32.1

### 克隆项目

```bash
git clone https://github.com/zchengfeng/s-table.git
cd s-table
pnpm install
```

### 开发流程

```bash
# 启动文档站点（开发模式）
pnpm docs:dev

# 运行测试
pnpm test

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint

# 格式检查
pnpm format:check

# 完整检查（提交前）
pnpm check
```

## 📝 提交规范

### Commit Message

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type**:
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具链相关
- `ci`: CI 配置

**示例**:
```bash
feat(table): 添加列宽自适应功能

- 支持双击列边框自动调整宽度
- 支持一键所有列自适应

Closes #123
```

### Pull Request

1. Fork 项目
2. 创建功能分支 (`git checkout -b feat/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feat/amazing-feature`)
5. 创建 Pull Request

**PR 标题**: 遵循 Conventional Commits 规范

**PR 描述**: 清楚说明：
- 改动内容
- 解决的问题
- 测试情况
- 截图（如果是 UI 相关）

## 🧪 测试要求

### 单元测试

- 新功能必须包含单元测试
- 修复 bug 应添加回归测试
- 测试覆盖率不应降低

```bash
pnpm test
pnpm test:watch  # 监听模式
```

### E2E 测试

- 重要交互流程需要 E2E 测试
- 性能敏感功能需要性能基准

```bash
pnpm test:e2e
pnpm test:e2e:ui  # UI 模式
pnpm bench:performance
```

## 📐 代码规范

### TypeScript

- 启用 `strict` 模式
- 避免使用 `any`（除非有充分理由）
- 使用明确的类型注解
- 泛型优先于类型断言

```typescript
// ✅ 推荐
function getUser<T extends User>(id: number): T | undefined {
  return users.find(u => u.id === id) as T | undefined;
}

// ❌ 不推荐
function getUser(id: number): any {
  return users.find(u => u.id === id);
}
```

### Vue

- 使用 Composition API (`<script setup>`)
- Props 明确类型和默认值
- 使用 `shallowRef` / `shallowReactive` 优化性能
- 避免深层响应式对象

```vue
<script setup lang="ts" generic="T extends RowData">
import { shallowRef } from 'vue';

interface Props {
  data: T[];
  columns: Column<T>[];
}

const props = withDefaults(defineProps<Props>(), {
  columns: () => [],
});

const tableData = shallowRef(props.data);
</script>
```

### 命名规范

- 组件: PascalCase (`STable.vue`)
- 文件: kebab-case (`use-table.ts`) 或 PascalCase (`STable.vue`)
- 变量/函数: camelCase (`getUserName`)
- 常量: UPPER_SNAKE_CASE (`MAX_ROWS`)
- 类型/接口: PascalCase (`UserData`)

### 注释

- 复杂逻辑必须添加注释
- 公开 API 使用 JSDoc
- 避免无意义的注释

```typescript
/**
 * 创建虚拟滚动实例
 * 
 * @param options - 虚拟滚动配置
 * @param options.count - 总行数
 * @param options.estimateSize - 预估行高
 * @returns 虚拟滚动实例
 */
export function createVirtualizer(options: VirtualizerOptions) {
  // 实现细节...
}
```

## 🐛 报告 Bug

请使用 [GitHub Issues](https://github.com/zchengfeng/s-table/issues/new) 报告 bug。

**Bug 报告应包含**:
- 问题描述
- 复现步骤
- 预期行为
- 实际行为
- 环境信息（浏览器、Node 版本等）
- 相关代码或截图

## 💡 功能建议

欢迎提出新功能建议！请先：
1. 搜索 Issues 确认是否已有类似建议
2. 创建新 Issue 说明需求场景和预期效果
3. 等待维护者反馈再开始实现

## 📦 发布流程

（仅维护者）

1. 更新版本号 (`package.json`)
2. 更新 `CHANGELOG.md`
3. 提交并打 tag
4. 推送 tag 触发自动发布

```bash
# 更新版本
pnpm version [major|minor|patch]

# 完整检查
pnpm check

# 推送
git push origin main --tags
```

## 🙋 需要帮助？

- 📖 查看文档（待完善）
- 💬 提交 Issue
- 📧 发送邮件: 2684837849@qq.com

## 📜 行为准则

- 尊重他人
- 建设性反馈
- 避免人身攻击
- 遵守开源社区规范

---

再次感谢你的贡献！🎉
