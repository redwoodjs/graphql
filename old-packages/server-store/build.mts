import { build, defaultBuildOptions } from '@redwoodjs/framework-tools'

await build({
  buildOptions: {
    ...defaultBuildOptions,
    format: 'cjs',
  },
})
