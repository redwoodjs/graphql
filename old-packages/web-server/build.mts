import fs from 'fs-extra'

import {
  build,
  defaultBuildOptions,
  defaultIgnorePatterns,
} from '@redwoodjs/framework-tools'

// This package uses the name of the bin as `scriptName` for Yargs to keep things in sync.
// There should only be one bin entry for this to work.
// Otherwise we have to rethink the code.
const { bin } = await fs.readJSON('./package.json')
const bins = Object.keys(bin).length

if (bins !== 1) {
  console.error(
    [
      `Error: Expected exactly one bin entry; found ${bins}`,
      './packages/web-server/src/bin.ts uses the bin entry as its scriptName',
    ].join('\n'),
  )
  process.exit(1)
}

// Build the package
await build({
  entryPointOptions: {
    ignore: [...defaultIgnorePatterns, './src/bin.ts', './src/types.ts'],
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
    packages: 'external',
  },
  metafileName: 'meta.bin.json',
})
