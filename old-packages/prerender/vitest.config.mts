import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '**/fixtures', '**/__fixtures__'],
    globals: true,
  },
})
