import { build, defaultBuildOptions } from '@redwoodjs/framework-tools'

await build({
  buildOptions: {
    ...defaultBuildOptions,
    bundle: true,
    entryPoints: ['src/index.ts'],
    packages: 'external',
  },
})
