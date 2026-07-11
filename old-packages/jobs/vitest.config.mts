import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 15_000,
    exclude: [...configDefaults.exclude, '**/fixtures', '**/dist'],
    logHeapUsage: true,
  },
})
