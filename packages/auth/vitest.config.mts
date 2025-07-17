import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '**/fixtures'],
    environment: 'jsdom',
    setupFiles: ['vitest.setup.mts'],
  },
})
