import {
  build,
  defaultBuildOptions,
  defaultIgnorePatterns,
} from '@redwoodjs/framework-tools'

// Build the package
await build({
  entryPointOptions: {
    ignore: [
      ...defaultIgnorePatterns,
      './src/bin.ts',
      './src/logFormatter/bin.ts',
      './src/types.ts',
      './src/watch.ts',
    ],
  },
})

// Build the rw-server bin
await build({
  buildOptions: {
    ...defaultBuildOptions,
    banner: {
      js: '#!/usr/bin/env node',
    },
    bundle: true,
    entryPoints: ['./src/bin.ts'],
    packages: 'external',
  },
  metafileName: 'meta.rwServer.json',
})

// Build the logFormatter bin
await build({
  buildOptions: {
    ...defaultBuildOptions,
    banner: {
      js: '#!/usr/bin/env node',
    },
    bundle: true,
    entryPoints: ['./src/logFormatter/bin.ts'],
    outdir: './dist/logFormatter',
    packages: 'external',
  },
  metafileName: 'meta.logFormatter.json',
})

// Build the watch bin
await build({
  buildOptions: {
    ...defaultBuildOptions,
    banner: {
      js: '#!/usr/bin/env node',
    },
    bundle: true,
    entryPoints: ['./src/watch.ts'],
    packages: 'external',
  },
  metafileName: 'meta.watch.json',
})
