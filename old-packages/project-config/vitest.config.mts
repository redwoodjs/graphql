import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 15_000,
    include: ['**/__tests__/**/*.[jt]s?(x)', '**/*.test.[jt]s?(x)'],
    exclude: [...configDefaults.exclude, '**/fixtures', '**/dist'],
    alias: {
      'src/(.*)': '<rootDir>/src/$1',
    },
  },
})
