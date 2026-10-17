import fs from 'node:fs';
import path from 'node:path';
import type { MarkdownRenderer } from 'vitepress';

const DEMO_TAG_RE = /<demo\s+vue=(['"])([^'"]+)\1([^>]*)\/>/g;

const normalizeImportPath = (filePath: string): string => filePath.replaceAll('\\', '/');

const createFence = (source: string): string => {
  const longestRun = Math.max(3, ...Array.from(source.matchAll(/`+/g), (match) => match[0].length));
  return '`'.repeat(longestRun + 1);
};

export const demoMarkdownPlugin = (md: MarkdownRenderer): void => {
  md.core.ruler.before('normalize', 's-table-demo', (state) => {
    const pagePath = state.env.path;
    if (typeof pagePath !== 'string') return;

    state.src = state.src.replace(
      DEMO_TAG_RE,
      (_tag, _quote: string, demoPath: string, attributes: string) => {
        const absoluteDemoPath = path.resolve(path.dirname(pagePath), demoPath);
        const source = fs.readFileSync(absoluteDemoPath, 'utf8').trimEnd();
        const fence = createFence(source);
        const manual = /\bmanual\b/.test(attributes);
        const normalizedPath = normalizeImportPath(demoPath);

        return `<DemoPreview :loader="() => import('${normalizedPath}')"${manual ? ' manual' : ''} />

<details class="s-demo-source">
<summary>查看源码</summary>

${fence}vue
${source}
${fence}

</details>`;
      }
    );
  });
};
