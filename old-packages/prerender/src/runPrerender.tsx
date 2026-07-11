import fs from 'fs'
import path from 'path'

import React from 'react'

import { ApolloClient, InMemoryCache } from '@apollo/client'
import type { CheerioAPI } from 'cheerio'
import { load as loadHtml } from 'cheerio'
import ReactDOMServer from 'react-dom/server'

import {
  registerApiSideBabelHook,
  registerWebSideBabelHook,
} from '@redwoodjs/babel-config'
import { getPaths, ensurePosixPath } from '@redwoodjs/project-config'
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

// Create an apollo client that we can use to prepopulate the cache and restore it client-side
const prerenderApolloClient = new ApolloClient({ cache: new InMemoryCache() })

async function recursivelyRender(
  App: React.ElementType,
  Routes: React.ElementType,
  renderPath: string,
  gqlHandler: any,
  queryCache: Record<string, QueryInfo>,
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
          value.variables,
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
                value.query,
              )} as it requires auth. \n`,
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
    }),
  )

  // `renderPath` is *just* a path, but the LocationProvider needs a full URL
  // object so if you need the domain to be something specific when
  // pre-rendering (because you're showing it in HTML output or the og:image
  // uses useLocation().host) you can set the RWJS_PRERENDER_ORIGIN env variable
  // so that it doesn't just default to localhost
  const prerenderUrl =
    process.env.RWJS_PRERENDER_ORIGIN || 'http://localhost' + renderPath

  const componentAsHtml = ReactDOMServer.renderToString(
    <LocationProvider location={new URL(prerenderUrl)}>
      <CellCacheContextProvider queryCache={queryCache}>
        <App>
          <Routes />
        </App>
      </CellCacheContextProvider>
    </LocationProvider>,
  )

  if (Object.values(queryCache).some((value) => !value.hasProcessed)) {
    // We found new queries that we haven't fetched yet. Execute all new
    // queries and render again
    return recursivelyRender(App, Routes, renderPath, gqlHandler, queryCache)
  } else {
    if (shouldShowGraphqlHandlerNotFoundWarn) {
      console.warn(
        '\n  ⚠️  Could not load your GraphQL handler. \n Your Cells have been prerendered in the "Loading" state. \n',
      )
    }

    return Promise.resolve(componentAsHtml)
  }
}

function insertChunkLoadingScript(
  indexHtmlTree: CheerioAPI,
  renderPath: string,
) {
  const prerenderRoutes = detectPrerenderRoutes()

  const route = prerenderRoutes.find((route) => {
    if (!route.routePath) {
      return false
    }

    return matchPath(route.routePath, renderPath).match
  })

  if (!route) {
    throw new Error('Could not find a Route matching ' + renderPath)
  }

  if (!route.pageIdentifier) {
    throw new Error(`Route for ${renderPath} has no pageIdentifier`)
  }

  const buildManifest = JSON.parse(
    fs.readFileSync(
      path.join(getPaths().web.dist, 'client-build-manifest.json'),
      'utf-8',
    ),
  )

  const chunkPaths: string[] = []

  if (route?.filePath) {
    const pagesIndex =
      route.filePath.indexOf(path.join('web', 'src', 'pages')) + 8
    const pagePath = ensurePosixPath(route.filePath.slice(pagesIndex))
    const pageChunkPath = buildManifest[pagePath]?.file

    if (pageChunkPath) {
      // The / is needed, otherwise the path is relative to the current page
      // so for example prerendering /userExamples/new wouldn't work
      chunkPaths.push('/' + pageChunkPath)
    }
  }

  if (chunkPaths.length === 0) {
    // This happens when the page is manually imported in Routes.tsx
    // (as opposed to being auto-imported)
    // It could also be that Vite for some reason didn't create a
    // chunk for this page. In that case it'd be nice to throw an error, but
    // there's no easy way to differentiate between the two cases.
    return
  }

  chunkPaths.forEach((chunkPath) => {
    indexHtmlTree('head').prepend(
      `<script defer="defer" src="${chunkPath}" type="module"></script>`,
    )
  })

  chunkPaths.forEach((chunkPath) => {
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
        `globalThis.__REDWOOD__PRERENDER_PAGES.${route?.pageIdentifier}=${varNameMatch?.[1]};\n`,
    )
  })
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

  // Prerender specific configuration
  // extends projects web/babelConfig
  registerWebSideBabelHook({
    overrides: [
      {
        plugins: [
          ['ignore-html-and-css-imports'], // webpack/postcss handles CSS imports
          [mediaImportsPlugin],
        ],
      },
    ],
    options: {
      forPrerender: true,
    },
  })

  const indexContent = fs.readFileSync(getRootHtmlPath()).toString()
  const { default: App } = require(getPaths().web.app)
  const { default: Routes } = require(getPaths().web.routes)

  const componentAsHtml = await recursivelyRender(
    App,
    Routes,
    renderPath,
    gqlHandler,
    queryCache,
  )

  const { helmet } = globalThis.__REDWOOD__HELMET_CONTEXT

  // Loop over ther queryCache and write the queries to the apollo client cache this will normalize the data
  // and make it available to the app when it hydrates
  Object.keys(queryCache).forEach((queryKey) => {
    const { query, variables, data } = queryCache[queryKey]
    prerenderApolloClient.writeQuery({
      query,
      variables,
      data,
    })
  })

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

  indexHtmlTree('head').append(
    `<script> globalThis.__REDWOOD__APOLLO_STATE = ${JSON.stringify(
      prerenderApolloClient.extract(),
    )}</script>`,
  )

  // Reset the cache after the apollo state is appended into the head
  // If we don't call this all the data will be cached but you can run into issues with the cache being too large
  // or possible cache merge conflicts
  prerenderApolloClient.resetStore()

  insertChunkLoadingScript(indexHtmlTree, renderPath)

  indexHtmlTree('#redwood-app').append(componentAsHtml)

  const renderOutput = indexHtmlTree.html()

  return renderOutput
}

// Used by cli at build time
export const writePrerenderedHtmlFile = (
  outputHtmlPath: string,
  content: string,
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
