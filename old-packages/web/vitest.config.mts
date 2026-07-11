import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '**/fixtures', '**/__typetests__'],
    environment: 'jsdom',
    setupFiles: ['vitest.setup.mts'],
  },
  define: {
    RWJS_ENV: {},
  },
})
