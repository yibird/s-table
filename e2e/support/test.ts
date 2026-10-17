import { expect, test as base } from '@playwright/test';
import type { Page } from '@playwright/test';

interface RuntimeErrorFixtures {
  runtimeErrors: string[];
}

/**
 * 每条 E2E 都自动收集浏览器异常和 console.error。
 * 断言放在 fixture 收尾阶段，确保即使业务断言通过，隐藏的 Vue/DOM 异常仍会让测试失败。
 */
export const test = base.extend<RuntimeErrorFixtures>({
  runtimeErrors: [
    async ({ page }, use) => {
      const runtimeErrors: string[] = [];
      page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() === 'error') runtimeErrors.push(`console.error: ${message.text()}`);
      });

      await use(runtimeErrors);
      expect(runtimeErrors, '页面运行期间不应产生未处理异常或 console.error').toEqual([]);
    },
    { auto: true },
  ],
});

/** Vite 首次优化依赖可能重载文档；只等待响应提交，具体页面状态交给 locator 自动等待。 */
export const openFixture = async (page: Page, fixture: string): Promise<void> => {
  await page.goto(`/?fixture=${fixture}`, { waitUntil: 'commit' });
};

export { expect } from '@playwright/test';
