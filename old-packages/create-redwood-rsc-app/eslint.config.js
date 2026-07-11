import eslint from '@eslint/js'
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs'
import jsdoc from 'eslint-plugin-jsdoc'
import jsonc from 'eslint-plugin-jsonc'
import markdown from 'eslint-plugin-markdown'
import n from 'eslint-plugin-n'
import packageJson from 'eslint-plugin-package-json/configs/recommended'
import perfectionist from 'eslint-plugin-perfectionist'
import * as regexp from 'eslint-plugin-regexp'
import yml from 'eslint-plugin-yml'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['coverage*', 'dist', 'node_modules', '**/*.snap'],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  eslint.configs.recommended,
  ...jsonc.configs['flat/recommended-with-json'],
  ...markdown.configs.recommended,
  ...yml.configs['flat/recommended'],
  ...yml.configs['flat/prettier'],
  comments.recommended,
  jsdoc.configs['flat/recommended-typescript-error'],
  n.configs['flat/recommended'],
  {
    ...packageJson,
    rules: {
      ...packageJson.rules,
      // https://github.com/JoshuaKGoldberg/eslint-plugin-package-json/issues/252
      'package-json/valid-repository-directory': 'off',
    },
  },
  perfectionist.configs['recommended-natural'],
  regexp.configs['flat/recommended'],
  ...tseslint.config({
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    files: ['**/*.js', '**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      // These on-by-default rules aren't useful in this repo.
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',

      // These off-by-default rules work well for this repo and we like them on.
      'jsdoc/informative-docs': 'error',
      'logical-assignment-operators': [
        'error',
        'always',
        { enforceForIfStatements: true },
      ],
      'operator-assignment': 'error',

      // These on-by-default rules don't work well for this repo and we like them off.
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-param': 'off',
      'jsdoc/require-property': 'off',
      'jsdoc/require-returns': 'off',
      'no-constant-condition': 'off',

      // These on-by-default rules work well for this repo if configured
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'all' }],
      'n/hashbang': [
        'error',
        {
          convertPath: [
            {
              include: ['src/**/*.ts'],
              replace: ['src/(.+?).ts', 'dist/$1.js'],
            },
          ],
        },
      ],
      // Stylistic concerns that don't interfere with Prettier
      'no-useless-rename': 'error',
      'object-shorthand': 'error',

      // When specifying object options for cli prompts custom ordering makes
      // them a lot easier to read
      'perfectionist/sort-objects': 'off',
    },
  }),
  {
    files: ['*.jsonc'],
    rules: {
      'jsonc/comma-dangle': 'off',
      'jsonc/no-comments': 'off',
      'jsonc/sort-keys': 'error',
    },
  },
  {
    extends: [tseslint.configs.disableTypeChecked],
    files: ['**/*.md/*.ts'],
    rules: {
      'n/no-missing-import': [
        'error',
        { allowModules: ['create-redwood-rsc-app'] },
      ],
    },
  },
  {
    files: ['**/*.{yml,yaml}'],
    rules: {
      'yml/file-extension': ['error', { extension: 'yml' }],
      'yml/sort-keys': [
        'error',
        {
          order: { type: 'asc' },
          pathPattern: '^.*$',
        },
      ],
      'yml/sort-sequence-values': [
        'error',
        {
          order: { type: 'asc' },
          pathPattern: '^.*$',
        },
      ],
    },
  },
)
