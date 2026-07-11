import path from 'path'

import fs from 'fs-extra'
import { Listr } from 'listr2'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'
import { runPrerender, writePrerenderedHtmlFile } from '@redwoodjs/prerender'
import { detectPrerenderRoutes } from '@redwoodjs/prerender/detection'
import { getConfig, getPaths } from '@redwoodjs/project-config'
import { errorTelemetry } from '@redwoodjs/telemetry'

import c from '../lib/colors'
import { configureBabel, runScriptFunction } from '../lib/exec'

class PathParamError extends Error {}

const mapRouterPathToHtml = (routerPath) => {
  if (routerPath === '/') {
    return 'web/dist/index.html'
  } else {
    return `web/dist${routerPath}.html`
  }
}

function getRouteHooksFilePath(routeFilePath) {
  const routeHooksFilePathTs = routeFilePath.replace(
    /\.[jt]sx?$/,
    '.routeHooks.ts',
  )

  if (fs.existsSync(routeHooksFilePathTs)) {
    return routeHooksFilePathTs
  }

  const routeHooksFilePathJs = routeFilePath.replace(
    /\.[jt]sx?$/,
    '.routeHooks.js',
  )

  if (fs.existsSync(routeHooksFilePathJs)) {
    return routeHooksFilePathJs
  }

  return undefined
}

/**
 * Takes a route with a path like /blog-post/{id:Int}
 * Reads path parameters from BlogPostPage.routeHooks.js and returns a list of
 * routes with the path parameter placeholders (like {id:Int}) replaced by
 * actual values
 *
 * So for values like [{ id: 1 }, { id: 2 }, { id: 3 }] (and, again, a route
 * path like /blog-post/{id:Int}) it will return three routes with the paths
 * /blog-post/1
 * /blog-post/2
 * /blog-post/3
 *
 * The paths will be strings. Parsing those path parameters to the correct
 * datatype according to the type notation ("Int" in the example above) will
 * be handled by the normal router functions, just like when rendering in a
 * client browser
 *
 * Example `route` parameter
 * {
 *   name: 'blogPost',
 *   path: '/blog-post/{id:Int}',
 *   routePath: '/blog-post/{id:Int}',
 *   hasParams: true,
 *   id: 'file:///Users/tobbe/tmp/rw-prerender-cell-ts/web/src/Routes.tsx 1959',
 *   isNotFound: false,
 *   filePath: '/Users/tobbe/tmp/rw-prerender-cell-ts/web/src/pages/BlogPostPage/BlogPostPage.tsx'
 * }
 *
 * When returning from this function, `path` in the above example will have
 * been replaced by an actual url, like /blog-post/15
 */
async function expandRouteParameters(route) {
  const routeHooksFilePath = getRouteHooksFilePath(route.filePath)

  if (!routeHooksFilePath) {
    return [route]
  }

  try {
    const routeParameters = await runScriptFunction({
      path: routeHooksFilePath,
      functionName: 'routeParameters',
      args: {
        name: route.name,
        path: route.path,
        routePath: route.routePath,
        filePath: route.filePath,
      },
    })

    if (routeParameters) {
      return routeParameters.map((pathParamValues) => {
        let newPath = route.path

        Object.entries(pathParamValues).forEach(([paramName, paramValue]) => {
          newPath = newPath.replace(
            new RegExp(`{${paramName}:?[^}]*}`),
            paramValue,
          )
        })

        return { ...route, path: newPath }
      })
    }
  } catch (e) {
    console.error(c.error(e.stack))
    return [route]
  }

  return [route]
}

// This is used directly in build.js for nested ListrTasks
export const getTasks = async (dryrun, routerPathFilter = null) => {
  const prerenderRoutes = detectPrerenderRoutes().filter((route) => route.path)
  const indexHtmlPath = path.join(getPaths().web.dist, 'index.html')
  if (prerenderRoutes.length === 0) {
    console.log('\nSkipping prerender...')
    console.log(
      c.warning(
        'You have not marked any routes with a path as `prerender` in `Routes.{jsx,tsx}` \n',
      ),
    )

    // Don't error out
    return []
  }

  if (!fs.existsSync(indexHtmlPath)) {
    console.error(
      'You must run `yarn rw build web` before trying to prerender.',
    )
    process.exit(1)
    // TODO: Run this automatically at this point.
  }

  configureBabel()

  const expandedRouteParameters = await Promise.all(
    prerenderRoutes.map((route) => expandRouteParameters(route)),
  )

  const listrTasks = expandedRouteParameters.flatMap((routesToPrerender) => {
    // queryCache will be filled with the queries from all the Cells we
    // encounter while prerendering, and the result from executing those
    // queries.
    // We have this cache here because we can potentially reuse result data
    // between different pages. I.e. if the same query, with the same
    // variables is encountered twice, we'd only have to execute it once and
    // then just reuse the cached result the second time.
    const queryCache = {}

    // In principle you could be prerendering a large number of routes, and
    // when this occurs not only can it break but it's also not particularly
    // useful to enumerate all the routes in the output.
    const shouldFold = routesToPrerender.length > 16

    if (shouldFold) {
      // If we're folding the output, we don't need to return the individual
      // routes, just a top level message indicating the route and the progress
      const displayIncrement = Math.max(
        1,
        Math.floor(routesToPrerender.length / 100),
      )
      const title = (i) =>
        `Prerendering ${routesToPrerender[0].name} (${i.toLocaleString()} of ${routesToPrerender.length.toLocaleString()})`
      return [
        {
          title: title(0),
          task: async (_, task) => {
            // Note: This is a sequential loop, not parallelized as there have been previous issues
            // with parallel prerendering. See:https://github.com/redwoodjs/redwood/pull/7321
            for (let i = 0; i < routesToPrerender.length; i++) {
              const routeToPrerender = routesToPrerender[i]

              // Filter out routes that don't match the supplied routePathFilter
              if (
                routerPathFilter &&
                routeToPrerender.path !== routerPathFilter
              ) {
                continue
              }

              await prerenderRoute(
                queryCache,
                routeToPrerender,
                dryrun,
                mapRouterPathToHtml(routeToPrerender.path),
              )

              if (i % displayIncrement === 0) {
                task.title = title(i)
              }
            }
            task.title = title(routesToPrerender.length)
          },
        },
      ]
    }

    // If we're not folding the output, we'll return a list of tasks for each
    // individual case.
    return routesToPrerender.map((routeToPrerender) => {
      // Filter out routes that don't match the supplied routePathFilter
      if (routerPathFilter && routeToPrerender.path !== routerPathFilter) {
        return []
      }

      const outputHtmlPath = mapRouterPathToHtml(routeToPrerender.path)
      return {
        title: `Prerendering ${routeToPrerender.path} -> ${outputHtmlPath}`,
        task: async () => {
          await prerenderRoute(
            queryCache,
            routeToPrerender,
            dryrun,
            outputHtmlPath,
          )
        },
      }
    })
  })

  return listrTasks
}

const diagnosticCheck = () => {
  const checks = [
    {
      message: 'Duplicate React version found in web/node_modules',
      failure: fs.existsSync(
        path.join(getPaths().web.base, 'node_modules/react'),
      ),
    },
    {
      message: 'Duplicate react-dom version found in web/node_modules',
      failure: fs.existsSync(
        path.join(getPaths().web.base, 'node_modules/react-dom'),
      ),
    },
    {
      message: 'Duplicate core-js version found in web/node_modules',
      failure: fs.existsSync(
        path.join(getPaths().web.base, 'node_modules/core-js'),
      ),
    },
    {
      message: 'Duplicate @redwoodjs/web version found in web/node_modules',
      failure: fs.existsSync(
        path.join(getPaths().web.base, 'node_modules/@redwoodjs/web'),
      ),
    },
  ]
  console.log('Running diagnostic checks')

  if (checks.some((checks) => checks.failure)) {
    console.error(c.error('node_modules are being duplicated in `./web` \n'))
    console.log('⚠️  Issues found: ')
    console.log('-'.repeat(50))

    checks
      .filter((check) => check.failure)
      .forEach((check, i) => {
        console.log(`${i + 1}. ${check.message}`)
      })

    console.log('-'.repeat(50))

    console.log(
      'Diagnostic check found issues. See the Redwood Forum link below for help:',
    )

    console.log(
      c.underline(
        'https://community.redwoodjs.com/search?q=duplicate%20package%20found',
      ),
    )

    console.log()

    // Exit, no need to show other messages
    process.exit(1)
  } else {
    console.log('✔ Diagnostics checks passed \n')
  }
}

const prerenderRoute = async (
  queryCache,
  routeToPrerender,
  dryrun,
  outputHtmlPath,
) => {
  // Check if route param templates in e.g. /path/{param1} have been replaced
  if (/\{.*}/.test(routeToPrerender.path)) {
    throw new PathParamError(
      `Could not retrieve route parameters for ${routeToPrerender.path}`,
    )
  }

  try {
    const prerenderedHtml = await runPrerender({
      queryCache,
      renderPath: routeToPrerender.path,
    })

    if (!dryrun) {
      writePrerenderedHtmlFile(outputHtmlPath, prerenderedHtml)
    }
  } catch (e) {
    console.log()
    console.log(c.warning('You can use `yarn rw prerender --dry-run` to debug'))
    console.log()

    console.log(
      `${c.info('-'.repeat(10))} Error rendering path "${
        routeToPrerender.path
      }" ${c.info('-'.repeat(10))}`,
    )

    errorTelemetry(process.argv, `Error prerendering: ${e.message}`)

    console.error(c.error(e.stack))
    console.log()

    throw new Error(`Failed to render "${routeToPrerender.filePath}"`)
  }
}

export const handler = async ({ path: routerPath, dryRun, verbose }) => {
  if (getConfig().experimental?.streamingSsr?.enabled) {
    console.log(
      c.warning(
        'Prerendering is not yet supported with Streaming SSR. Skipping prerender...',
      ),
    )

    return
  }

  recordTelemetryAttributes({
    command: 'prerender',
    dryRun,
    verbose,
  })

  const listrTasks = await getTasks(dryRun, routerPath)

  const tasks = new Listr(listrTasks, {
    renderer: verbose ? 'verbose' : 'default',
    rendererOptions: { collapseSubtasks: false },
    concurrent: false,
  })

  try {
    if (dryRun) {
      console.log(c.info('::: Dry run, not writing changes :::'))
    }

    await tasks.run()
  } catch (e) {
    console.log()
    await diagnosticCheck()

    console.log(c.warning('Tips:'))

    if (e instanceof PathParamError) {
      console.log(
        c.info(
          "- You most likely need to add or update a *.routeHooks.{js,ts} file next to the Page you're trying to prerender",
        ),
      )
    } else {
      console.log(
        c.info(
          `- This could mean that a library you're using does not support SSR.`,
        ),
      )
      console.log(
        c.info(
          '- Avoid using `window` in the initial render path through your React components without checks. \n  See https://redwoodjs.com/docs/prerender#prerender-utils',
        ),
      )

      console.log(
        c.info(
          '- Avoid prerendering Cells with authenticated queries, by conditionally rendering them.\n  See https://redwoodjs.com/docs/prerender#common-warnings--errors',
        ),
      )
    }

    console.log()

    process.exit(1)
  }
}
