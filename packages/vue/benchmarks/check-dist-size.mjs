import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// 预算随能力扩展同步调整：本轮新增 15 组功能后主入口 gzip ≈ 69KB。
// 导出工具已拆到 ./export 子路径，主包只保留运行时必需的实现。
const budgets = [
  { file: 'dist/index.js', maxGzipBytes: 72 * 1024 },
  { file: 'dist/export.js', maxGzipBytes: 1 * 1024 },
  { file: 'dist/style.css', maxGzipBytes: 10 * 1024 },
];

const results = budgets.map(({ file, maxGzipBytes }) => {
  const content = readFileSync(resolve(packageRoot, file));
  const gzipBytes = gzipSync(content).byteLength;
  return {
    file,
    rawBytes: content.byteLength,
    gzipBytes,
    maxGzipBytes,
    status: gzipBytes <= maxGzipBytes ? 'ok' : 'failed',
  };
});

process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
if (results.some((result) => result.status === 'failed')) process.exitCode = 1;
