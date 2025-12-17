import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.test.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
  {
    files: ['**/*.test.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: './tsconfig.test.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    ignores: ['dist', 'node_modules', 'coverage', '*.config.js', '*.config.ts', 'sandbox'],
  }
);
