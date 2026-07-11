import { build, defaultBuildOptions } from './src/buildDefaults'

await build({
  buildOptions: {
    ...defaultBuildOptions,
    format: 'esm',
  },
})
