import fs from 'fs'
import path from 'path'

import { fetch } from '@whatwg-node/fetch'

import { getConfig, getPaths } from '@redwoodjs/project-config'

const INDEX_FILE = path.join(getPaths().web.dist, 'index.html')
const DEFAULT_INDEX = path.join(getPaths().web.dist, '200.html')

export const getRootHtmlPath = () => {
  if (fs.existsSync(DEFAULT_INDEX)) {
    return DEFAULT_INDEX
  } else {
    return INDEX_FILE
  }
}

export const registerShims = (routerPath: string) => {
  const rwjsConfig = getConfig()

  globalThis.RWJS_ENV = {
    RWJS_API_GRAPHQL_URL:
      rwjsConfig.web.apiGraphQLUrl ?? rwjsConfig.web.apiUrl + '/graphql',
    RWJS_API_URL: rwjsConfig.web.apiUrl,
    __REDWOOD__APP_TITLE: rwjsConfig.web.title,
  }

  globalThis.RWJS_DEBUG_ENV = {
    RWJS_SRC_ROOT: getPaths().web.src,
  }

  globalThis.__REDWOOD__PRERENDERING = true

  globalThis.__REDWOOD__HELMET_CONTEXT = {}

  // Let routes auto loader plugin know
  process.env.__REDWOOD__PRERENDERING = '1'

  // This makes code like globalThis.location.pathname work also outside of the
  // router
  globalThis.location = {
    ...globalThis.location,
    pathname: routerPath,
  }
  // Shim fetch in the node.js context
  // This is to avoid using cross-fetch when configuring apollo-client
  // which would cause the client bundle size to increase
  if (!globalThis.fetch) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore-next-line
    globalThis.fetch = fetch
  }
}

export const writeToDist = (outputHtmlPath: string, renderOutput: string) => {
  const dirName = path.dirname(outputHtmlPath)
  const exist = fs.existsSync(dirName)
  if (!exist) {
    fs.mkdirSync(dirName, { recursive: true })
  }

  fs.writeFileSync(outputHtmlPath, renderOutput)
}
