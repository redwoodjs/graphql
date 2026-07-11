import { build, defaultBuildOptions } from '@redwoodjs/framework-tools'

// ESM build
await build({
  buildOptions: {
    ...defaultBuildOptions,
    format: 'esm',
    outdir: 'dist/bins',
  },
})
