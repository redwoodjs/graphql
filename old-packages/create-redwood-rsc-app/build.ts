import { build, defaultBuildOptions } from './framework-tools.js'

await build({
  buildOptions: {
    ...defaultBuildOptions,
    target: ['node16'],
    format: 'esm',
    packages: 'external',
  },
})
