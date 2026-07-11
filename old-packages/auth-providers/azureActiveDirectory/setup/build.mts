import { build, copyAssets } from '@redwoodjs/framework-tools'

await build()

await copyAssets({
  buildFileUrl: import.meta.url,
  patterns: ['templates/**/*.template'],
})
