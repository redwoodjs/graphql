import { build, defaultBuildOptions } from '@redwoodjs/framework-tools'
import { insertCommonJsPackageJson } from '@redwoodjs/framework-tools/generateTypes'

// ESM build
await build({
  buildOptions: {
    ...defaultBuildOptions,
    format: 'esm',
  },
})

// CJS build
await build({
  buildOptions: {
    ...defaultBuildOptions,
    outdir: 'dist/cjs',
  },
})
await insertCommonJsPackageJson({
  buildFileUrl: import.meta.url,
})
