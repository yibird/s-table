import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, posix, resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import { defineConfig } from 'vite';

const packageRoot = import.meta.dirname;

/**
 * node16 ESM 的模块解析要求声明文件里的相对导入带显式扩展名，且 specifier 必须
 * 命中真实文件：`import '../types'`（源码省略目录索引）在 dist 里要写成
 * `'../types/index.js'`。tsc 生成 d.ts 时保留源码 specifier 原样，这里按 dist 的
 * 实际 .d.ts 布局做「文件 → 目录索引」解析后统一改写。
 */
const fixRelativeImportSpecifiers = (
  code: string,
  fromDir: string,
  files: ReadonlySet<string>
): string => {
  const resolveSpecifier = (specifier: string): string => {
    const base = specifier.endsWith('.js') ? specifier.slice(0, -3) : specifier;
    const direct = `${posix.join(fromDir, base)}.d.ts`;
    if (files.has(direct)) return `${base}.js`;
    const index = posix.join(fromDir, base, 'index.d.ts');
    if (files.has(index)) return `${base}/index.js`;
    // 无法在 dist 内解析的相对引用（生成期不应发生）：按 node16 规则补 .js 兜底。
    return `${base}.js`;
  };

  let next = code;
  next = next.replace(
    /(from\s+["'])(\.[^"']+?)(["'])/g,
    (match, prefix: string, specifier: string, suffix: string) => {
      if (specifier.endsWith('.js') || specifier.endsWith('.d.ts')) return match;
      return `${prefix}${resolveSpecifier(specifier)}${suffix}`;
    }
  );
  next = next.replace(
    /(import\(\s*["'])(\.[^"']+?)(["']\s*\))/g,
    (match, prefix: string, specifier: string, suffix: string) => {
      if (specifier.endsWith('.js') || specifier.endsWith('.d.ts')) return match;
      return `${prefix}${resolveSpecifier(specifier)}${suffix}`;
    }
  );
  return next;
};

const collectDeclarationFiles = async (dir: string): Promise<Set<string>> => {
  const files = new Set<string>();
  const walk = async (current: string, relative: string): Promise<void> => {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(path, posix.join(relative, entry.name));
      } else if (entry.name.endsWith('.d.ts') && !entry.name.endsWith('.d.ts.map')) {
        files.add(posix.join(relative, entry.name));
      }
    }
  };
  await walk(dir, '');
  return files;
};

const fixDeclarationImports = async (dir: string): Promise<void> => {
  const files = await collectDeclarationFiles(dir);
  const walk = async (current: string, relative: string): Promise<void> => {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(path, posix.join(relative, entry.name));
      } else if (entry.name.endsWith('.d.ts') && !entry.name.endsWith('.d.ts.map')) {
        const code = await readFile(path, 'utf8');
        const next = fixRelativeImportSpecifiers(code, relative, files);
        if (next !== code) await writeFile(path, next);
      }
    }
  };
  await walk(dir, '');
};

/** Keep runtime dependencies external in the published library. */
const externalDependencies = [
  /^@zchengfeng\/s-table-core(\/|$)/,
  'vue',
  '@floating-ui/vue',
  '@tanstack/table-core',
  '@tanstack/vue-table',
  '@tanstack/vue-virtual',
  /^hucre(\/|$)/,
];

export default defineConfig({
  root: import.meta.dirname,
  plugins: [
    vue(),
    dts({
      tsconfigPath: resolve(packageRoot, 'tsconfig.build.json'),
      entryRoot: resolve(packageRoot, 'src'),
      // 散落到 dist，保持与 src 相同的目录结构（index.d.ts / features/export.d.ts ...）。
      // 消费端经 package.json exports 的 types 指向对应文件；declarationMap 的
      // sources 是相对路径（../src/...），无需额外重写。
      outDirs: resolve(packageRoot, 'dist'),
      // 把 STable.vue.d.ts 收敛为 STable.d.ts，并把 d.ts 内的 './STable.vue' 引用
      // 改写为 './STable'，消费端无需 vue shim 或 allowArbitraryExtensions。
      cleanVueFileName: true,
      include: ['src/**/*.ts', 'src/**/*.vue', 'env.d.ts'],
      exclude: ['src/__tests__/**', 'src/type-tests/**', 'node_modules', 'dist'],
      compilerOptions: {
        declarationMap: true,
      },
      afterDiagnostic(diagnostics) {
        if (diagnostics.length > 0) {
          throw new Error(`Declaration generation found ${diagnostics.length} type errors.`);
        }
      },
      afterBuild: async () => {
        await fixDeclarationImports(resolve(packageRoot, 'dist'));
      },
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(packageRoot, 'src/index.ts'),
        style: resolve(packageRoot, 'src/styles/index.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
      cssFileName: 'style',
    },
    outDir: resolve(packageRoot, 'dist'),
    emptyOutDir: true,
    sourcemap: true,
    rolldownOptions: {
      external: externalDependencies,
    },
  },
});
