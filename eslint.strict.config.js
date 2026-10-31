// The strict lint pass's target (ADR-0070, ADR-1011), measured with `pnpm lint:strict`.
// `pnpm lint` and CI still run eslint.config.js. When this reaches zero findings, this becomes
// eslint.config.js and the file goes. Fixes land in batches valid under both, so CI stays green.
import tseslint from 'typescript-eslint'
import { defineConfig } from 'eslint/config'
import base from './eslint.config.js'

export default defineConfig([
  ...base,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // ADR-1011's three, stated so a preset change can't drop them.
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      // ADR-0070: React handlers in arrow shorthand, and numbers in template strings.
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      '@typescript-eslint/restrict-template-expressions': ['error', {
        allowNumber: true,
        allowAny: false, allowBoolean: false, allowNullish: false, allowRegExp: false,
        allowNever: false, allowArray: false,
      }],
      // The base config's own choices, re-stated after the preset (ADR-0009, the `_` convention).
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
  // ADR-0070: the bake and solve scripts are in no tsconfig, so they're linted without types.
  {
    files: ['scripts/**/*.ts'],
    extends: [tseslint.configs.disableTypeChecked],
  },
])
