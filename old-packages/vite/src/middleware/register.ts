import fmw from 'find-my-way'
import type Router from 'find-my-way'
import type { ViteDevServer } from 'vite'

import { getPaths } from '@redwoodjs/project-config'
import { MiddlewareResponse } from '@redwoodjs/web/middleware'
import type {
  Middleware,
  MiddlewareClass,
  MiddlewareInvokeOptions,
  MiddlewareRequest,
} from '@redwoodjs/web/middleware'

import type { EntryServer } from '../types.js'
import { makeFilePath, ssrLoadEntryServer } from '../utils.js'

import type { MiddlewareReg } from './types.js'

type GroupedMw = Record<string, Middleware[]>

const validateMw = (mw: MiddlewareClass | Middleware): Middleware => {
  if (typeof mw === 'function') {
    return mw
  } else if (typeof mw === 'object' && typeof mw.invoke === 'function') {
    return mw.invoke.bind(mw)
  } else {
    console.error('Received as middleware: ', mw)
    throw new Error(
      'Please check the return on registerMiddleware. Must be a Middleware ' +
        'function, Class or tuple of [Middleware, string]',
    )
  }
}

export const groupByRoutePatterns = (mwRegList: MiddlewareReg) => {
  const grouped: GroupedMw = {}

  mwRegList.forEach((mwReg) => {
    if (Array.isArray(mwReg)) {
      const [mw, pattern = '*'] = mwReg

      const mwFunction = validateMw(mw)
      if (!grouped[pattern]) {
        grouped[pattern] = []
      }

      grouped[pattern].push(mwFunction)
    } else {
      // When not using tuple syntax
      grouped['*'] = [...(grouped['*'] || []), validateMw(mwReg)]
    }
  })

  return grouped
}

/**
 * Takes an array of middleware, and returns a single middleware function
 * that chains them together, by passing the output of one to the next.
 * @param groupedMw
 */
export const chain = (mwList: Middleware[]) => {
  return async (
    req: MiddlewareRequest,
    res: MiddlewareResponse = MiddlewareResponse.next(),
    options?: MiddlewareInvokeOptions,
  ) => {
    let response = res
    for (const mw of mwList) {
      const mwOutput = await mw(req, response, options)

      // Possible for middleware to return nothing
      if (mwOutput) {
        response = mwOutput
      }
    }

    return response
  }
}

export const addMiddlewareHandlers = (mwRegList: MiddlewareReg = []) => {
  const groupedMw = groupByRoutePatterns(mwRegList)
  const mwRouter = fmw()

  for (const pattern in groupedMw) {
    const mwList = groupedMw[pattern]
    const chainedMw = chain(mwList)

    // @NOTE: as any, because we don't actually use the fmw router to invoke the mw
    // we use it just for matching. FMW doesn't seem to have a way of customizing the handler type
    mwRouter.on(['GET', 'POST'], pattern, chainedMw as any)
  }

  return mwRouter
}

/**
 * If you pass in the vite dev server, we're running in development
 * @param vite
 * @returns Middleware find-my-way Router
 */
export const createMiddlewareRouter = async (
  vite?: ViteDevServer,
): Promise<Router.Instance<any>> => {
  const rwPaths = getPaths()

  const entryServerImport: EntryServer = vite
    ? await ssrLoadEntryServer(vite)
    : await import(makeFilePath(rwPaths.web.distSsrEntryServer))

  const { registerMiddleware } = entryServerImport

  if (!registerMiddleware) {
    // Empty router
    return fmw()
  }

  return addMiddlewareHandlers(await registerMiddleware())
}
