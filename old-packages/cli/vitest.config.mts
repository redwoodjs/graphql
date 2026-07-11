import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 20_000,
    sequence: {
      hooks: 'list',
    },
    logHeapUsage: true,
    workspace: './vitest.workspaces.ts',
  },
})
