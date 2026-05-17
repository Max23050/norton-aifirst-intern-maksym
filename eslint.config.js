const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: [
      '.claude/**',
      'coverage/**',
      'dist/**',
      'node_modules/**',
    ],
  },
  {
    rules: {
      'import/no-unresolved': ['error', { ignore: ['^@env$'] }],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'import/first': 'off',
    },
  },
]);
