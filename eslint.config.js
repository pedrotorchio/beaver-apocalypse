import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      // Add any custom rules here
    },
  },
  {
    files: ['src/general/coordinateSystem.ts'],
    rules: {
      '@typescript-eslint/no-wrapper-object-types': 'off',
    },
  }
);
