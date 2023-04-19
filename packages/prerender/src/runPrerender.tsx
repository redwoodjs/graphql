import fs from 'fs'
import path from 'path'

import React from 'react'

import { CheerioAPI, load as loadHtml } from 'cheerio'
import ReactDOMServer from 'react-dom/server'

import { registerApiSideBabelHook } from '@redwoodjs/internal/dist/build/babel/api'
import { registerWebSideBabelHook } from '@redwoodjs/internal/dist/build/babel/web'
import { getConfig, getPaths } from '@redwoodjs/project-config'
import { LocationProvider } from '@redwoodjs/router'
import { matchPath } from '@redwoodjs/router/dist/util'
import type { QueryInfo } from '@redwoodjs/web'

import mediaImportsPlugin from './babelPlugins/babel-plugin-redwood-prerender-media-imports'
import { detectPrerenderRoutes } from './detection'
import {
  GqlHandlerImportError,
  JSONParseError,
  PrerenderGqlError,
} from './errors'
import { executeQuery, getGqlHandler } from './graphql/graphql'
import { getRootHtmlPath, registerShims, writeToDist } from './internal'

async function recursivelyRender(
  App: React.ElementType,
  renderPath: string,
  gqlHandler: any,
  queryCache: Record<string, QueryInfo>
): Promise<string> {
  // Load this async, to prevent rwjs/web being loaded before shims
  const {
    CellCacheContextProvider,
    getOperationName,
  } = require('@redwoodjs/web')

  let shouldShowGraphqlHandlerNotFoundWarn = false
  // Execute all gql queries we haven't already fetched
  await Promise.all(
    Object.entries(queryCache).map(async ([cacheKey, value]) => {
      if (value.hasProcessed) {
        // Already fetched, or decided that we can't render this one; skip it!
        return Promise.resolve('')
      }

      try {
        const resultString = await executeQuery(
          gqlHandler,
          value.query,
          value.variables
        )

        let result

        try {
          result = JSON.parse(resultString)
        } catch (e) {
          if (e instanceof SyntaxError) {
            throw new JSONParseError({
              query: value.query,
              variables: value.variables,
              result: resultString,
            })
          }
        }

        if (result.errors) {
          const message =
            result.errors[0].message ?? JSON.stringify(result.errors, null, 4)

          if (result.errors[0]?.extensions?.code === 'UNAUTHENTICATED') {
            console.error(
              `\n \n 🛑  Cannot prerender the query ${getOperationName(
                value.query
              )} as it requires auth. \n`
            )
          }

          throw new PrerenderGqlError(message)
        }

        queryCache[cacheKey] = {
          ...value,
          data: result.data,
          hasProcessed: true,
        }

        return result
      } catch (e) {
        if (e instanceof GqlHandlerImportError) {
          // We need to need to swallow the error here, so that
          // we can continue to render the page, with cells in loading state
          // e.g. if the GQL handler is located elsewhere
          shouldShowGraphqlHandlerNotFoundWarn = true

          queryCache[cacheKey] = {
            ...value,
            // tried to fetch, but failed
            renderLoading: true,
            hasProcessed: true,
          }

          return
        } else {
          // Otherwise forward on the error
          throw e
        }
      }
    })
  )

  const componentAsHtml = ReactDOMServer.renderToString(
    <LocationProvider location={{ pathname: renderPath }}>
      <CellCacheContextProvider queryCache={queryCache}>
        <App />
      </CellCacheContextProvider>
    </LocationProvider>
  )

  if (Object.values(queryCache).some((value) => !value.hasProcessed)) {
    // We found new queries that we haven't fetched yet. Execute all new
    // queries and render again
    return recursivelyRender(App, renderPath, gqlHandler, queryCache)
  } else {
    if (shouldShowGraphqlHandlerNotFoundWarn) {
      console.warn(
        '\n  ⚠️  Could not load your GraphQL handler. \n Your Cells have been prerendered in the "Loading" state. \n'
      )
    }

    return Promise.resolve(componentAsHtml)
  }
}

function insertChunkLoadingScript(
  indexHtmlTree: CheerioAPI,
  renderPath: string,
  vite: boolean
) {
  const prerenderRoutes = detectPrerenderRoutes()

  const route = prerenderRoutes.find((route: any) => {
    return matchPath(route.routePath, renderPath).match
  })

  if (!route) {
    throw new Error('Could not find a Route matching ' + renderPath)
  }

  // For WebPack the code for the page at `/` is already included in
  // app.<hash>.js and won't have a separate chunk
  if (!vite && renderPath === '/') {
    return
  }

  const buildManifest = JSON.parse(
    fs.readFileSync(
      path.join(getPaths().web.dist, 'build-manifest.json'),
      'utf-8'
    )
  )

  if (!route.pageIdentifier) {
    throw new Error(`Route for ${renderPath} has no pageIdentifier`)
  }

  // Webpack
  let chunkPath = buildManifest[`${route?.pageIdentifier}.js`]

  if (!chunkPath && route?.filePath) {
    // Vite

    // TODO: Make sure this works on Windows
    const pagesIndex = route.filePath.indexOf('web/src/pages') + 8
    const pagePath = route.filePath.slice(pagesIndex)

    console.log('buildManifest', buildManifest)
    console.log('pagePath', pagePath)

    // TODO: Check if the initial / is needed
    chunkPath = '/' + buildManifest[pagePath]?.file

    if (!buildManifest[pagePath]?.file) {
      return
    }
  }

  if (!chunkPath) {
    throw new Error('Could not find chunk for ' + route?.pageIdentifier)
  }

  indexHtmlTree('head').prepend(
    `<script defer="defer" src="${chunkPath}" ${
      vite ? 'type="module"' : ''
    }></script>`
  )

  if (!vite) {
    return
  }

  // This is not needed for WebPack

  const fullChunkPath = path.join(getPaths().web.dist, chunkPath)
  const jsChunk = fs.readFileSync(fullChunkPath, 'utf-8')

  // The chunk will end with something like this: ,{});export{y as default};
  // We need to extract the variable name (y) so that we can expose it on
  // `globalThis` as `<PageName>Page`
  const matches = jsChunk.match(/export\s*\{\s*\w+ as default\s*\}/g) || []
  const lastIndex = jsChunk.lastIndexOf(matches[matches.length - 1])
  const varNameMatch = jsChunk
    .slice(lastIndex)
    .match(/export\s*\{\s*(\w+) as default\s*\}/)

  fs.writeFileSync(
    fullChunkPath,
    jsChunk +
      'globalThis.__REDWOOD__PRERENDER_PAGES = globalThis.__REDWOOD__PRERENDER_PAGES || {};\n' +
      `globalThis.__REDWOOD__PRERENDER_PAGES.${route?.pageIdentifier}=${varNameMatch?.[1]};\n`
  )
}

interface PrerenderParams {
  queryCache: Record<string, QueryInfo>
  renderPath: string // The path (url) to render e.g. /about, /dashboard/me, /blog-post/3
}

export const runPrerender = async ({
  queryCache,
  renderPath,
}: PrerenderParams): Promise<string | void> => {
  registerShims(renderPath)
  // registerApiSideBabelHook already includes the default api side babel
  // config. So what we define here is additions to the default config
  registerApiSideBabelHook({
    plugins: [
      [
        'babel-plugin-module-resolver',
        {
          alias: {
            api: getPaths().api.base,
            web: getPaths().web.base,
          },
          loglevel: 'silent', // to silence the unnecessary warnings
        },
      ],
    ],
    overrides: [
      {
        test: ['./api/'],
        plugins: [
          [
            'babel-plugin-module-resolver',
            {
              alias: {
                src: getPaths().api.src,
              },
              loglevel: 'silent',
            },
            'exec-api-src-module-resolver',
          ],
        ],
      },
    ],
  })

  const gqlHandler = await getGqlHandler()
  const vite = getConfig().web.bundler === 'vite'

  // Prerender specific configuration
  // extends projects web/babelConfig
  registerWebSideBabelHook({
    forVite: vite,
    overrides: [
      {
        plugins: [
          ['ignore-html-and-css-imports'], // webpack/postcss handles CSS imports
          [mediaImportsPlugin],
        ],
      },
    ],
  })

  const indexContent = fs.readFileSync(getRootHtmlPath()).toString()
  const { default: App } = await import(getPaths().web.app)

  const componentAsHtml = await recursivelyRender(
    App,
    renderPath,
    gqlHandler,
    queryCache
  )

  const { helmet } = globalThis.__REDWOOD__HELMET_CONTEXT

  const indexHtmlTree = loadHtml(indexContent)

  if (helmet) {
    const helmetElements = `
  ${helmet?.link.toString()}
  ${helmet?.meta.toString()}
  ${helmet?.script.toString()}
  ${helmet?.noscript.toString()}
  `

    // Add all head elements
    indexHtmlTree('head').prepend(helmetElements)

    const titleHtmlTag = helmet.title.toString() // toString from helmet returns HTML, not the same as cherrio!

    // 1. Check if title is set in the helmet context first...
    if (loadHtml(titleHtmlTag)('title').text() !== '') {
      // 2. Check if html already had a title
      if (indexHtmlTree('title').text().length === 0) {
        // If no title defined in the index.html
        indexHtmlTree('head').prepend(titleHtmlTag)
      } else {
        indexHtmlTree('title').replaceWith(titleHtmlTag)
      }
    }
  }

  insertChunkLoadingScript(indexHtmlTree, renderPath, vite)

  indexHtmlTree('#redwood-app').append(componentAsHtml)

  const renderOutput = indexHtmlTree.html()

  return renderOutput
}

// Used by cli at build time
export const writePrerenderedHtmlFile = (
  outputHtmlPath: string,
  content: string
) => {
  const outputHtmlAbsPath = path.join(getPaths().base, outputHtmlPath)
  // Copy default (unprerendered) index.html to 200.html first
  // This is to prevent recursively rendering the home page
  if (outputHtmlPath === 'web/dist/index.html') {
    const html200Path = path.join(getPaths().web.dist, '200.html')

    if (!fs.existsSync(html200Path)) {
      fs.copyFileSync(outputHtmlAbsPath, html200Path)
    }
  }

  writeToDist(outputHtmlAbsPath, content)
}
