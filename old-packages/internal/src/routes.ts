import path from 'path'

import chalk from 'chalk'

import { getPaths, getRouteHookForPage } from '@redwoodjs/project-config'
import { getRouteRegexAndParams } from '@redwoodjs/router/dist/util'
import { getProject } from '@redwoodjs/structure/dist/index.js'
import type { RWRoute } from '@redwoodjs/structure/dist/model/RWRoute'

export interface RouteInformation {
  name?: string
  path?: string
  page?: string
}

/**
 * Returns an array of routes which conflict on their defined names
 */
export function getDuplicateRoutes() {
  const duplicateRoutes: RouteInformation[] = []
  const allRoutes: RWRoute[] = getProject(getPaths().base).router.routes
  const uniqueNames = new Set(
    allRoutes
      .filter((route) => route.name !== undefined)
      .map((route) => route.name),
  )
  uniqueNames.forEach((name) => {
    const routesWithName = allRoutes.filter((route) => {
      return route.name === name
    })
    if (routesWithName.length > 1) {
      duplicateRoutes.push(
        ...routesWithName.map((route) => {
          return {
            name: route.name,
            page: route.page_identifier_str,
            path: route.path,
          }
        }),
      )
    }
  })
  return duplicateRoutes
}

/**
 * Detects any potential duplicate routes and returns a formatted warning message
 * @see {@link getDuplicateRoutes} for how duplicate routes are detected
 * @return {string} Warning message when duplicate routes found, empty string if not
 */
export function warningForDuplicateRoutes() {
  const duplicatedRoutes = getDuplicateRoutes()
  let message = ''
  if (duplicatedRoutes.length > 0) {
    message += chalk.keyword('orange')(
      `Warning: ${duplicatedRoutes.length} duplicate routes have been detected, only the route(s) closest to the top of the file will be used.\n`,
    )
    duplicatedRoutes.forEach((route) => {
      message += ` ${chalk.keyword('orange')('->')} Name: "${
        route.name
      }", Path: "${route.path}", Page: "${route.page}"\n`
    })
  }
  return message.trimEnd()
}

export interface RWRouteManifestItem {
  name: string
  pathDefinition: string
  matchRegexString: string | null
  routeHooks: string | null
  bundle: string | null
  hasParams: boolean
  relativeFilePath: string
  redirect: { to: string; permanent: boolean } | null
  isPrivate: boolean
  unauthenticated: string | null
  roles: string | string[] | null
  pageIdentifier: string | null
  // Probably want isNotFound here, so we can attach a separate 404 handler
}

export interface RouteSpec extends RWRouteManifestItem {
  id: string
  isNotFound: boolean
  filePath: string | undefined
  isPrivate: boolean
  unauthenticated: string | null
  relativeFilePath: string
}

export const getProjectRoutes = (): RouteSpec[] => {
  const rwProject = getProject(getPaths().base)
  const routes = rwProject.getRouter().routes

  // @ts-expect-error "Bundle" is not found but is in the Spec type?
  return routes.map((route: any) => {
    const { matchRegexString, routeParams } = route.isNotFound
      ? { matchRegexString: null, routeParams: null }
      : getRouteRegexAndParams(route.path)

    return {
      name: route.isNotFound ? 'NotFoundPage' : route.name,
      pathDefinition: route.isNotFound ? 'notfound' : route.path,
      hasParams: route.hasParameters,
      id: route.id,
      isNotFound: route.isNotFound,
      filePath: route.page?.filePath,
      relativeFilePath: route.page?.filePath
        ? path.relative(getPaths().web.src, route.page?.filePath)
        : undefined,
      routeHooks: getRouteHookForPage(route.page?.filePath),
      renderMode: route.renderMode,
      matchRegexString: matchRegexString,
      paramNames: routeParams,
      // TODO (STREAMING) deal with permanent/temp later
      redirect: route.redirect
        ? { to: route.redirect, permanent: false }
        : null,
      isPrivate: route.isPrivate,
      unauthenticated: route.unauthenticated,
      roles: route.roles,
      pageIdentifier: route.page_identifier_str,
    }
  })
}
