import { getPaths } from '@redwoodjs/project-config'
import { getProject } from '@redwoodjs/structure'

export const detectPrerenderRoutes = () => {
  const rwProject = getProject(getPaths().base)
  const routes = rwProject.getRouter().routes

  const prerenderRoutes = routes
    .filter((route) => route.prerender) // only select routes with prerender prop
    .map((route) => ({
      name: route.isNotFound ? '404' : route.name,
      // `path` will be updated/expanded later where route parameters will be
      // replaced with actual values
      path: route.isNotFound ? '/404' : route.path,
      // `routePath` is always the path specified on the <Route> component
      // (or the special /404 path)
      routePath: route.isNotFound ? '/404' : route.path,
      hasParams: route.hasParameters,
      id: route.id,
      isNotFound: route.isNotFound,
      filePath: route.page?.filePath,
      pageIdentifier: route.page_identifier_str,
    }))

  return prerenderRoutes
}
