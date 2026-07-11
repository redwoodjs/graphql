import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Globals are enabled for the benefit of '@typescript-eslint/rule-tester'
    globals: true,
  },
})
