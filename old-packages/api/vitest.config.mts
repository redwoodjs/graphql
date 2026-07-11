import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    sequence: {
      hooks: 'list',
    },
    setupFiles: ['./vitest.setup.mts'],
    logHeapUsage: true,
  },
})
