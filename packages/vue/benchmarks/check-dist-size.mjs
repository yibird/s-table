import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const budgets = [
  { file: 'dist/index.js', maxGzipBytes: 64 * 1024 },
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
