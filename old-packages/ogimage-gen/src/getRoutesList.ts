import url from 'node:url'

import type { RWRouteManifestItem } from '@redwoodjs/internal'
import { getPaths } from '@redwoodjs/project-config'

export const getRoutesList = async () => {
  const rwPaths = getPaths()

  if (process.env.NODE_ENV === 'development') {
    const { getProjectRoutes } = await import(
      '@redwoodjs/internal/dist/routes.js'
    )
    return getProjectRoutes()
  } else {
    const routeManifestUrl = url.pathToFileURL(rwPaths.web.routeManifest).href
    const routeManifest: Record<string, RWRouteManifestItem> = (
      await import(routeManifestUrl, { with: { type: 'json' } })
    ).default

    return Object.values(routeManifest)
  }
}
