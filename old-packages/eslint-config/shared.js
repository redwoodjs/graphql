// This ESLint configuration is shared between the Redwood framework,
// and Redwood projects.
//
// Our ESLint configuration is a mixture between ESLint's recommended
// rules [^1], React's recommended rules [^2], and a bit of our own stylistic
// flair:
// - no semicolons
// - comma dangle when multiline
// - single quotes
// - always use parenthesis around arrow functions
// - enforced import sorting
//
// [^1] https://eslint.org/docs/rules/
// [^2] https://www.npmjs.com/package/eslint-plugin-react#list-of-supported-rules

module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:prettier/recommended',
    'plugin:jest-dom/recommended',
  ],
  // @NOTE parserOptions defined separately for project and framework
  parser: '@babel/eslint-parser',
  plugins: [
    'prettier',
    '@babel',
    'import',
    'jsx-a11y',
    'react',
    'react-hooks',
    'jest-dom',
    '@redwoodjs',
  ],
  // In addition to this, eslint also has some implicit ignore patterns, like
  // `node_modules`.
  // See https://eslint.org/docs/latest/use/configure/ignore-deprecated
  ignorePatterns: ['dist'],
  settings: {
    react: {
      version: 'detect',
    },
    // For the import/order rule. Configures how it tells if an import is "internal" or not.
    // An "internal" import is basically just one that's aliased.
    //
    // See...
    // - https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/order.md#groups-array
    // - https://github.com/import-js/eslint-plugin-import/blob/main/README.md#importinternal-regex
    'import/internal-regex': '^src/',
  },
  rules: {
    '@redwoodjs/process-env-computed': 'error',
    'prettier/prettier': 'warn',
    'no-console': 'off',
    'prefer-object-spread': 'warn',
    'prefer-spread': 'warn',
    'no-unused-expressions': [
      'error',
      { allowShortCircuit: true, allowTernary: true },
    ],
    'no-useless-escape': 'off',
    camelcase: ['warn', { properties: 'never' }],
    'no-new': 'warn',
    'new-cap': ['error', { newIsCap: true, capIsNew: false }],
    'no-unused-vars': [
      'error',
      { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
    ],
    // React rules
    'react/prop-types': 'off',
    'react/display-name': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    'import/order': [
      'error',
      {
        'newlines-between': 'always',
        // We set this to an empty array to override the default value, which is `['builtin', 'external', 'object']`.
        // Judging by the number of issues on the repo, this option seems to be notoriously tricky to understand.
        // From what I can tell, if the value of this is `['builtin']` that means it won't sort builtins.
        // But we have a rule for builtins below (react), so that's not what we want.
        //
        // See...
        // - https://github.com/import-js/eslint-plugin-import/pull/1570
        // - https://github.com/import-js/eslint-plugin-import/issues/1565
        pathGroupsExcludedImportTypes: [],
        // Only doing this to add internal. The order here maters.
        // See https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/order.md#groups-array
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        pathGroups: [
          {
            pattern: 'react',
            group: 'builtin',
            position: 'after',
          },
          {
            pattern: '@redwoodjs/**',
            group: 'external',
            position: 'after',
          },
          {
            // Matches...
            // - src/directives/**/*.{js,ts}
            // - src/services/**/*.{js,ts}
            // - src/graphql/**/*.sdl.{js,ts}
            //
            // Uses https://github.com/isaacs/minimatch under the hood
            // See https://github.com/isaacs/node-glob#glob-primer for syntax
            pattern: 'src/*/**/*.?(sdl.){js,ts}',
            patternOptions: {
              nobrace: true,
              noglobstar: true,
            },
            group: 'internal',
            position: 'before',
          },
        ],
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['$api/*'],
            message:
              'Importing from $api is only supported in *.routeHooks.{js,ts} files',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['*.tsx', '*.js', '*.jsx'],
      excludedFiles: ['api/src/**'],
      rules: {
        'react-hooks/rules-of-hooks': 'error',
      },
    },
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      extends: ['plugin:@typescript-eslint/recommended', 'prettier'],
      rules: {
        // TODO: look into enabling these eventually
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/prefer-function-type': 'off',

        // Specific 'recommended' rules we alter
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-empty-object-type': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
        ],
      },
    },
    {
      files: ['*.test.*', '**/__mocks__/**'],
      env: {
        node: true,
        es6: true,
        commonjs: true,
        jest: true,
      },
    },
    {
      files: [
        '.babelrc.js',
        'babel.config.js',
        '.eslintrc.js',
        '*.config.js',
        'jest.setup.js',
      ],
      env: {
        node: true,
        commonjs: true,
        jest: true,
      },
    },
    {
      files: [
        'web/src/**/*.routeHooks.{js,ts}',
        'web/src/entry.server.{jsx,tsx}',
      ],
      rules: { 'no-restricted-imports': 'off' },
    },
  ],
}
