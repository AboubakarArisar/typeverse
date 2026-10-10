import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'coverage', 'playwright-report', 'test-results', 'files'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { window: 'readonly', document: 'readonly', performance: 'readonly' } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-globals': [
        'error',
        { name: 'Date', message: 'No Date in game logic; use KeyInput.t or the loop dt.' },
      ],
    },
  },
  {
    files: ['src/services/**', 'src/ui/**', 'src/app/**', 'tests/**', '*.ts'],
    rules: { 'no-restricted-globals': 'off' },
  },
);
