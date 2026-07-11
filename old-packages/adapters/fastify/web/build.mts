import { build, defaultBuildOptions } from '@redwoodjs/framework-tools'

// Build the main entry point
await build({
  buildOptions: {
    ...defaultBuildOptions,
    bundle: true,
    entryPoints: ['./src/web.ts'],
    packages: 'external',
  },
})

// Build the helpers entry point
await build({
  buildOptions: {
    ...defaultBuildOptions,
    entryPoints: ['./src/helpers.ts'],
  },
})
