import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 20_000,
    exclude: [
      ...configDefaults.exclude,
      '**/__fixtures__/**',
      '**/__testfixtures__/**',
      '**/__tests__/utils/**',
      '.d.ts',
    ],
    setupFiles: ['./vite.setup.mts'],
    pool: 'forks',
  },
})
