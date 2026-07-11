import {
  build,
  defaultBuildOptions,
  defaultIgnorePatterns,
} from '@redwoodjs/framework-tools'

// Build the package
await build({
  entryPointOptions: {
    ignore: [...defaultIgnorePatterns, './src/types.ts', './src/bin.ts'],
  },
})

// Build the bin
await build({
  buildOptions: {
    ...defaultBuildOptions,
    banner: {
      js: '#!/usr/bin/env node',
    },
    bundle: true,
    entryPoints: ['./src/bin.ts'],
    minify: true,
    packages: 'external',
  },
  metafileName: 'meta.bin.json',
})
