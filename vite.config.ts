import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    plugins: ['oxc', 'typescript', 'unicorn', 'vue'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      'no-unused-vars': 'error',
      'no-empty': 'warn',
      'prefer-const': ['error', { ignoreReadBeforeAssign: true }],
      'no-var': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-eval': 'error',
      'no-new-wrappers': 'error',
      'no-throw-literal': 'error',
      'no-void': 'error',
    },
    overrides: [
      {
        files: ['**/*.vue'],
        rules: {
          'no-unused-vars': 'off',
        },
      },
    ],
    ignorePatterns: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.min.js',
      '**/.vitepress/cache/**',
      '**/.vitepress/dist/**',
      '**/*.timestamp-*.mjs',
    ],
  },
  fmt: {
    semi: true,
    singleQuote: true,
    tabWidth: 2,
    printWidth: 100,
    trailingComma: 'es5',
    useTabs: false,
    bracketSpacing: true,
    arrowParens: 'always',
    endOfLine: 'lf',
    vueIndentScriptAndStyle: false,
    ignorePatterns: [
      'node_modules',
      'dist',
      '**/*.min.js',
      'docs/.vitepress/config.ts.timestamp-*.mjs',
    ],
  },
});
