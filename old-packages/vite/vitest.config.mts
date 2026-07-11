import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '**/fixtures'],
    deps: {
      /** Note: needed for rsc-routes plugins
         a) Babel packages are CJS
         b) Vite-test doesn't wrap in a default export like Vite when interopDefault is true
         c) Actually running the code in Vite wraps it.
         This change makes Vitest aligned with how Vite behaves in actual use
       */
      interopDefault: false,
    },
  },
})
