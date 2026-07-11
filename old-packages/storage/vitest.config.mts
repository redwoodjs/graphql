import path from 'path'
import { fileURLToPath } from 'url'

import { defineConfig, configDefaults } from 'vitest/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '**/fixtures', '**/__typetests__'],
    deps: {
      interopDefault: false,
    },
    globalSetup: ['vitest.setup.mts'],
    alias: {
      // We alias prisma client, otherwise you'll get "prisma client not initialized"
      // Important to have the subpath first here
      '@prisma/client/extension': path.resolve(
        __dirname,
        '../../node_modules/@prisma/client/extension.js',
      ),
      '@prisma/client': path.resolve(__dirname, 'src/__tests__/prisma-client'),
    },
  },
})
