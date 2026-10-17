#!/usr/bin/env node
/**
 * 依赖边界检查。
 *
 * 用静态 import 扫描守住架构约束（见 README「架构」与重构计划）：
 * - core 必须框架无关；
 * - components 与 hooks 不得互相依赖；
 * - adapter / context / setup 不得越层读取上层实现。
 *
 * 现有违规集中在 ALLOWLIST，只允许减少；新增违规直接失败。
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, posix, relative, resolve, sep } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const sourceRoots = ['packages/core/src', 'packages/vue/src'];

const toPosix = (value) => value.split(sep).join(posix.sep);

/** 每条规则的 target 是「被禁止导入的路径前缀或包名」。 */
const RULES = [
  {
    name: 'core-framework-free',
    applies: (file) => file.startsWith('packages/core/src/'),
    forbidden: ['vue', '@tanstack/vue-table', '@tanstack/vue-virtual', 'react', 'solid-js'],
    reason: 'core 必须保持框架无关，仅允许 @tanstack/table-core。',
  },
  {
    name: 'hooks-no-components',
    applies: (file) => file.startsWith('packages/vue/src/hooks/'),
    forbidden: ['packages/vue/src/components/'],
    reason: 'hooks 不得依赖渲染组件；内置列工厂应放在 presets/ 或 setup/。',
  },
  {
    name: 'components-no-hooks-setup',
    applies: (file) => file.startsWith('packages/vue/src/components/'),
    forbidden: ['packages/vue/src/hooks/', 'packages/vue/src/setup/'],
    reason: 'components 只消费 props/context 与领域模块，不得依赖状态编排层。',
  },
  {
    name: 'adapter-isolation',
    applies: (file) => file.startsWith('packages/vue/src/adapter/'),
    forbidden: ['packages/vue/src/setup/', 'packages/vue/src/components/'],
    reason: 'adapter 只做 TanStack 桥接，不得反向依赖组合根或组件。',
  },
  {
    name: 'context-isolation',
    applies: (file) => file.startsWith('packages/vue/src/context/'),
    forbidden: ['packages/vue/src/setup/', 'packages/vue/src/hooks/'],
    reason: 'context 只声明注入契约，不得依赖实现层。',
  },
  {
    name: 'setup-no-components',
    applies: (file) => file.startsWith('packages/vue/src/setup/'),
    forbidden: ['packages/vue/src/components/'],
    reason: 'setup 可编排 hooks，但组件间共享类型应放 types/，不得直接依赖组件实现。',
  },
];

/** 允许暂时保留的既有违规（只减不增）。 */
const ALLOWLIST = new Set([]);

const IMPORT_PATTERNS = [
  /(?:^|\n)\s*(?:import|export)\s[^;]*?from\s*["']([^"']+)["']/g,
  /(?:^|\n)\s*import\s*["']([^"']+)["']/g,
  /import\(\s*["']([^"']+)["']\s*\)/g,
];

const collectFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(path)));
    else if (/\.(?:ts|mts|cts|tsx|vue|js|mjs)$/.test(entry.name)) files.push(path);
  }
  return files;
};

const resolveSpecifier = (file, specifier) => {
  if (!specifier.startsWith('.')) return specifier;
  const absolute = resolve(repoRoot, posix.dirname(file), specifier);
  const normalized = toPosix(relative(repoRoot, absolute));
  // 去掉扩展名，便于按目录前缀匹配。
  return normalized.replace(/\.(?:ts|mts|cts|tsx|vue|js|mjs)$/, '').replace(/\/index$/, '');
};

const matches = (target, forbidden) =>
  forbidden.some((prefix) => {
    const clean = prefix.replace(/\/$/, '');
    return target === clean || target.startsWith(`${clean}/`);
  });

const violations = [];
const files = (
  await Promise.all(sourceRoots.map((root) => collectFiles(join(repoRoot, root))))
).flat();

for (const absoluteFile of files) {
  const file = toPosix(relative(repoRoot, absoluteFile));
  const source = await readFile(absoluteFile, 'utf8');
  const specifiers = new Set();
  for (const pattern of IMPORT_PATTERNS) {
    for (const match of source.matchAll(pattern)) specifiers.add(match[1]);
  }
  for (const specifier of specifiers) {
    const target = resolveSpecifier(file, specifier);
    for (const rule of RULES) {
      if (!rule.applies(file) || !matches(target, rule.forbidden)) continue;
      violations.push({ file, target, rule, specifier });
    }
  }
}

const unexpected = violations.filter(({ file, target }) => !ALLOWLIST.has(`${file} -> ${target}`));
const staleAllowlist = [...ALLOWLIST].filter(
  (entry) => !violations.some(({ file, target }) => `${file} -> ${target}` === entry)
);

if (unexpected.length > 0) {
  console.error(`✖ 发现 ${unexpected.length} 处新增依赖边界违规：\n`);
  for (const { file, target, rule } of unexpected) {
    console.error(`  ${file}\n    → ${target}\n    规则：${rule.name}（${rule.reason}）\n`);
  }
  process.exitCode = 1;
}

if (staleAllowlist.length > 0) {
  console.warn(`⚠ ALLOWLIST 中有 ${staleAllowlist.length} 条已失效条目，请删除：`);
  for (const entry of staleAllowlist) console.warn(`  ${entry}`);
}

if (unexpected.length === 0) {
  const remaining = violations.length - unexpected.length;
  console.warn(`✓ 依赖边界检查通过（${files.length} 个文件，${remaining} 条既有豁免待清理）。`);
}
