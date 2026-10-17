import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, posix, resolve } from 'node:path';
import dts from 'vite-plugin-dts';
import { defineConfig } from 'vite';

const packageRoot = import.meta.dirname;

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
  const resolveSpecifier = (fromDir: string, specifier: string): string => {
    const base = specifier.endsWith('.js') ? specifier.slice(0, -3) : specifier;
    if (files.has(`${posix.join(fromDir, base)}.d.ts`)) return `${base}.js`;
    if (files.has(posix.join(fromDir, base, 'index.d.ts'))) return `${base}/index.js`;
    return `${base}.js`;
  };
  const walk = async (current: string, relative: string): Promise<void> => {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(path, posix.join(relative, entry.name));
        continue;
      }
      if (!entry.name.endsWith('.d.ts') || entry.name.endsWith('.d.ts.map')) continue;
      const code = await readFile(path, 'utf8');
      const replace = (_match: string, prefix: string, specifier: string, suffix: string) =>
        specifier.endsWith('.js') || specifier.endsWith('.d.ts')
          ? `${prefix}${specifier}${suffix}`
          : `${prefix}${resolveSpecifier(relative, specifier)}${suffix}`;
      const next = code
        .replace(/(from\s+["'])(\.[^"']+?)(["'])/g, replace)
        .replace(/(import\(\s*["'])(\.[^"']+?)(["']\s*\))/g, replace);
      if (next !== code) await writeFile(path, next);
    }
  };
  await walk(dir, '');
};

export default defineConfig({
  root: packageRoot,
  plugins: [
    dts({
      tsconfigPath: resolve(packageRoot, 'tsconfig.build.json'),
      entryRoot: resolve(packageRoot, 'src'),
      outDirs: resolve(packageRoot, 'dist'),
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'node_modules', 'dist'],
      afterBuild: async () => {
        await fixDeclarationImports(resolve(packageRoot, 'dist'));
      },
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(packageRoot, 'src/index.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    outDir: resolve(packageRoot, 'dist'),
    emptyOutDir: true,
    sourcemap: true,
    rolldownOptions: {
      external: ['@tanstack/table-core'],
    },
  },
});
