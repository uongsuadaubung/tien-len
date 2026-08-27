import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '.vite/**', 'coverage/**']
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      // 1. Cấm hoàn toàn việc sử dụng kiểu `any`
      '@typescript-eslint/no-explicit-any': 'error',

      // 2. Cấm ép kiểu tùy hứng (disallow type assertions `as Type`)
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          assertionStyle: 'never'
        }
      ],

      // 3. Cấm tuyệt đối biến thừa không sử dụng (Không chấp nhận tiền tố _var để lách)
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'after-used',
          caughtErrors: 'none'
        }
      ],

      // 4. Ưu tiên const hơn let khi biến không bị gán lại
      'prefer-const': 'error'
    }
  }
];
