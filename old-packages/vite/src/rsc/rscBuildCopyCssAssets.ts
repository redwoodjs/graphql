import fs from 'fs/promises'
import path from 'path'

import { getPaths } from '@redwoodjs/project-config'

import type { rscBuildForServer } from './rscBuildForServer.js'

/**
 * RSC build. Step 5.
 * Copy CSS assets from server to client
 */
export function rscBuildCopyCssAssets(
  serverBuildOutput: Awaited<ReturnType<typeof rscBuildForServer>>,
) {
  console.log('\n')
  console.log('5. rscBuildCopyCssAssets')
  console.log('========================\n')

  const rwPaths = getPaths()

  // TODO (RSC) Some css is now duplicated in two files (i.e. for client
  // components). Probably don't want that.
  // Also not sure if this works on "soft" rerenders (i.e. not a full page
  // load)
  return Promise.all(
    serverBuildOutput
      .filter((item) => {
        return item.type === 'asset' && item.fileName.endsWith('.css')
      })
      .map((cssAsset) => {
        return fs.copyFile(
          path.join(rwPaths.web.distRsc, cssAsset.fileName),
          path.join(rwPaths.web.distBrowser, cssAsset.fileName),
        )
      }),
  )
}
