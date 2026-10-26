import tseslint from 'typescript-eslint';

const nodeGlobals = Object.fromEntries([
  'AbortSignal', 'Buffer', 'URL', 'clearInterval', 'console', 'fetch', 'performance',
  'process', 'setInterval', 'setTimeout', 'structuredClone',
].map((name) => [name, 'readonly']));

const browserGlobals = Object.fromEntries([
  'Option', 'crypto', 'document', 'fetch', 'Intl',
].map((name) => [name, 'readonly']));

const sharedRules = {
  eqeqeq: ['error', 'always'],
  'no-debugger': 'error',
  'no-undef': 'error',
  'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  quotes: ['error', 'single', { avoidEscape: true }],
  semi: ['error', 'always'],
};

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'playwright-report/**', 'test-results/**', 'evidencias/**'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.mjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: nodeGlobals },
    rules: { ...sharedRules, '@typescript-eslint/no-unused-vars': 'off' },
  },
  {
    files: ['e2e/**/*.mjs'],
    languageOptions: { globals: { document: 'readonly' } },
  },
  {
    files: ['public/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: browserGlobals },
    rules: sharedRules,
  },
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    languageOptions: { globals: browserGlobals },
    rules: {
      ...sharedRules,
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
