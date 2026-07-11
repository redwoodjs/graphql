import fs from 'fs'
import path from 'path'

import fg from 'fast-glob'

import { getConfig } from './config.js'
import { getConfigPath } from './configPath.js'

export interface NodeTargetPaths {
  base: string
  dataMigrations: string
  directives: string
  db: string
  dbSchema: string
  src: string
  functions: string
  graphql: string
  lib: string
  generators: string
  services: string
  config: string
  dist: string
  types: string
  models: string
  mail: string
  jobs: string
  distJobs: string
  jobsConfig: string | null
  distJobsConfig: string | null
  logger: string | null
}

export interface WebPaths {
  base: string
  src: string
  storybook: string
  app: string
  document: string
  generators: string
  html: string
  routes: string
  pages: string
  components: string
  layouts: string
  config: string
  viteConfig: string
  entryClient: string | null
  entryServer: string | null
  postcss: string
  storybookConfig: string
  storybookPreviewConfig: string | null
  storybookManagerConfig: string
  dist: string
  distBrowser: string
  distRsc: string
  distSsr: string
  distSsrDocument: string
  distSsrEntryServer: string
  distRouteHooks: string
  distRscEntries: string
  routeManifest: string
  types: string
  graphql: string
}

export interface Paths {
  base: string
  generated: {
    base: string
    schema: string
    types: {
      includes: string
      mirror: string
    }
    prebuild: string
  }
  web: WebPaths
  api: NodeTargetPaths
  scripts: string
}

export interface PagesDependency {
  /** the variable to which the import is assigned */
  importName: string
  /** @alias importName */
  constName: string
  /** absolute path without extension */
  importPath: string
  /** absolute path with extension */
  path: string
  /** const ${importName} = { ...data structure for async imports... } */
  importStatement: string
}

// TODO: Remove these.
const PATH_API_DIR_FUNCTIONS = 'api/src/functions'
const PATH_RW_SCRIPTS = 'scripts'
const PATH_API_DIR_GRAPHQL = 'api/src/graphql'
const PATH_API_DIR_CONFIG = 'api/src/config'
const PATH_API_DIR_MODELS = 'api/src/models'
const PATH_API_DIR_JOBS = 'api/src/jobs'
const PATH_API_DIR_LIB = 'api/src/lib'
const PATH_API_DIR_GENERATORS = 'api/generators'
const PATH_API_DIR_SERVICES = 'api/src/services'
const PATH_API_DIR_DIRECTIVES = 'api/src/directives'
const PATH_API_DIR_SUBSCRIPTIONS = 'api/src/subscriptions'
const PATH_API_DIR_SRC = 'api/src'
const PATH_API_DIR_DIST = 'api/dist'
const PATH_WEB_ROUTES = 'web/src/Routes' // .jsx|.tsx
const PATH_WEB_DIR_LAYOUTS = 'web/src/layouts/'
const PATH_WEB_DIR_PAGES = 'web/src/pages/'
const PATH_WEB_DIR_COMPONENTS = 'web/src/components'
const PATH_WEB_DIR_STORYBOOK_CONFIG = 'web/.storybook'
const PATH_WEB_DIR_SRC = 'web/src'
const PATH_WEB_DIR_SRC_APP = 'web/src/App'
const PATH_WEB_DIR_SRC_DOCUMENT = 'web/src/Document'
const PATH_WEB_INDEX_HTML = 'web/src/index.html'
const PATH_WEB_DIR_GENERATORS = 'web/generators'
const PATH_WEB_DIR_CONFIG = 'web/config'
const PATH_WEB_DIR_CONFIG_VITE = 'web/vite.config' // .js,.ts
const PATH_WEB_DIR_ENTRY_CLIENT = 'web/src/entry.client' // .jsx,.tsx
const PATH_WEB_DIR_ENTRY_SERVER = 'web/src/entry.server' // .jsx,.tsx
const PATH_WEB_DIR_GRAPHQL = 'web/src/graphql' // .js,.ts

const PATH_WEB_DIR_CONFIG_POSTCSS = 'web/config/postcss.config.js'
const PATH_WEB_DIR_CONFIG_STORYBOOK_CONFIG = 'web/.storybook/main.js'
const PATH_WEB_DIR_CONFIG_STORYBOOK_PREVIEW = 'web/.storybook/preview' // .js, .tsx
const PATH_WEB_DIR_CONFIG_STORYBOOK_MANAGER = 'web/.storybook/manager.js'
const PATH_WEB_DIR_DIST = 'web/dist'

// Used by Streaming & RSC builds to output to their individual folders
const PATH_WEB_DIR_DIST_BROWSER = 'web/dist/browser'
const PATH_WEB_DIR_DIST_RSC = 'web/dist/rsc'
const PATH_WEB_DIR_DIST_SSR = 'web/dist/ssr'

const PATH_WEB_DIR_DIST_SSR_ENTRY_SERVER = 'web/dist/ssr/entry.server.mjs'
const PATH_WEB_DIR_DIST_SSR_DOCUMENT = 'web/dist/ssr/Document.mjs'
const PATH_WEB_DIR_DIST_SSR_ROUTEHOOKS = 'web/dist/ssr/routeHooks'
const PATH_WEB_DIR_DIST_RSC_ENTRIES = 'web/dist/rsc/entries.mjs'
const PATH_WEB_DIR_ROUTE_MANIFEST = 'web/dist/ssr/route-manifest.json'

/**
 * The Redwood config file is used as an anchor for the base directory of a project.
 */
export const getBaseDir = (configPath: string = getConfigPath()): string => {
  return path.dirname(configPath)
}

export const getBaseDirFromFile = (file: string) => {
  return getBaseDir(getConfigPath(path.dirname(file)))
}

/**
 * Use this to resolve files when the path to the file is known,
 * but the extension is not.
 */
export const resolveFile = (
  filePath: string,
  extensions: string[] = ['.js', '.tsx', '.ts', '.jsx', '.mjs', '.mts'],
): string | null => {
  for (const extension of extensions) {
    const p = `${filePath}${extension}`
    if (fs.existsSync(p)) {
      return p
    }
  }
  return null
}

/**
 * Path constants that are relevant to a Redwood project.
 */
const getPathsCache = new Map<string, Paths>()
export const getPaths = (BASE_DIR: string = getBaseDir()): Paths => {
  if (getPathsCache.has(BASE_DIR)) {
    return getPathsCache.get(BASE_DIR) as Paths
  }

  const routes = resolveFile(path.join(BASE_DIR, PATH_WEB_ROUTES)) as string
  const { schemaPath } = getConfig(getConfigPath(BASE_DIR)).api
  const schemaDir = path.dirname(schemaPath)
  const viteConfig = resolveFile(
    path.join(BASE_DIR, PATH_WEB_DIR_CONFIG_VITE),
  ) as string

  const paths = {
    base: BASE_DIR,

    generated: {
      base: path.join(BASE_DIR, '.redwood'),
      schema: path.join(BASE_DIR, '.redwood/schema.graphql'),
      types: {
        includes: path.join(BASE_DIR, '.redwood/types/includes'),
        mirror: path.join(BASE_DIR, '.redwood/types/mirror'),
      },
      prebuild: path.join(BASE_DIR, '.redwood/prebuild'),
    },

    scripts: path.join(BASE_DIR, PATH_RW_SCRIPTS),

    api: {
      base: path.join(BASE_DIR, 'api'),
      dataMigrations: path.join(BASE_DIR, schemaDir, 'dataMigrations'),
      db: path.join(BASE_DIR, schemaDir),
      dbSchema: path.join(BASE_DIR, schemaPath),
      functions: path.join(BASE_DIR, PATH_API_DIR_FUNCTIONS),
      graphql: path.join(BASE_DIR, PATH_API_DIR_GRAPHQL),
      lib: path.join(BASE_DIR, PATH_API_DIR_LIB),
      generators: path.join(BASE_DIR, PATH_API_DIR_GENERATORS),
      config: path.join(BASE_DIR, PATH_API_DIR_CONFIG),
      services: path.join(BASE_DIR, PATH_API_DIR_SERVICES),
      directives: path.join(BASE_DIR, PATH_API_DIR_DIRECTIVES),
      subscriptions: path.join(BASE_DIR, PATH_API_DIR_SUBSCRIPTIONS),
      src: path.join(BASE_DIR, PATH_API_DIR_SRC),
      dist: path.join(BASE_DIR, PATH_API_DIR_DIST),
      types: path.join(BASE_DIR, 'api/types'),
      models: path.join(BASE_DIR, PATH_API_DIR_MODELS),
      mail: path.join(BASE_DIR, PATH_API_DIR_SRC, 'mail'),
      jobs: path.join(path.join(BASE_DIR, PATH_API_DIR_JOBS)),
      distJobs: path.join(path.join(BASE_DIR, PATH_API_DIR_DIST, 'jobs')),
      jobsConfig: resolveFile(path.join(BASE_DIR, PATH_API_DIR_LIB, 'jobs')),
      distJobsConfig: resolveFile(
        path.join(BASE_DIR, PATH_API_DIR_DIST, 'lib', 'jobs'),
      ),
      logger: resolveFile(path.join(BASE_DIR, PATH_API_DIR_LIB, 'logger')),
    },

    web: {
      routes,
      base: path.join(BASE_DIR, 'web'),
      pages: path.join(BASE_DIR, PATH_WEB_DIR_PAGES),
      components: path.join(BASE_DIR, PATH_WEB_DIR_COMPONENTS),
      layouts: path.join(BASE_DIR, PATH_WEB_DIR_LAYOUTS),
      src: path.join(BASE_DIR, PATH_WEB_DIR_SRC),
      storybook: path.join(BASE_DIR, PATH_WEB_DIR_STORYBOOK_CONFIG),
      generators: path.join(BASE_DIR, PATH_WEB_DIR_GENERATORS),
      app: resolveFile(path.join(BASE_DIR, PATH_WEB_DIR_SRC_APP)) as string,
      document: resolveFile(
        path.join(BASE_DIR, PATH_WEB_DIR_SRC_DOCUMENT),
      ) as string,
      html: path.join(BASE_DIR, PATH_WEB_INDEX_HTML),
      config: path.join(BASE_DIR, PATH_WEB_DIR_CONFIG),
      viteConfig,
      postcss: path.join(BASE_DIR, PATH_WEB_DIR_CONFIG_POSTCSS),
      storybookConfig: path.join(
        BASE_DIR,
        PATH_WEB_DIR_CONFIG_STORYBOOK_CONFIG,
      ),
      storybookPreviewConfig: resolveFile(
        path.join(BASE_DIR, PATH_WEB_DIR_CONFIG_STORYBOOK_PREVIEW),
      ),
      storybookManagerConfig: path.join(
        BASE_DIR,
        PATH_WEB_DIR_CONFIG_STORYBOOK_MANAGER,
      ),
      dist: path.join(BASE_DIR, PATH_WEB_DIR_DIST),
      distBrowser: path.join(BASE_DIR, PATH_WEB_DIR_DIST_BROWSER),
      distRsc: path.join(BASE_DIR, PATH_WEB_DIR_DIST_RSC),
      distSsr: path.join(BASE_DIR, PATH_WEB_DIR_DIST_SSR),
      distSsrDocument: path.join(BASE_DIR, PATH_WEB_DIR_DIST_SSR_DOCUMENT),
      distSsrEntryServer: path.join(
        BASE_DIR,
        PATH_WEB_DIR_DIST_SSR_ENTRY_SERVER,
      ),
      distRouteHooks: path.join(BASE_DIR, PATH_WEB_DIR_DIST_SSR_ROUTEHOOKS),
      distRscEntries: path.join(BASE_DIR, PATH_WEB_DIR_DIST_RSC_ENTRIES),
      routeManifest: path.join(BASE_DIR, PATH_WEB_DIR_ROUTE_MANIFEST),
      types: path.join(BASE_DIR, 'web/types'),
      entryClient: resolveFile(path.join(BASE_DIR, PATH_WEB_DIR_ENTRY_CLIENT)), // new vite/stream entry point for client
      entryServer: resolveFile(path.join(BASE_DIR, PATH_WEB_DIR_ENTRY_SERVER)),
      graphql: path.join(BASE_DIR, PATH_WEB_DIR_GRAPHQL),
    },
  }

  fs.mkdirSync(paths.generated.types.includes, { recursive: true })
  fs.mkdirSync(paths.generated.types.mirror, { recursive: true })

  getPathsCache.set(BASE_DIR, paths)
  return paths
}

/**
 * Returns the route hook for the supplied page path.
 * Note that the page name doesn't have to match
 *
 * @param pagePath
 * @returns string
 */
export const getRouteHookForPage = (pagePath: string | undefined | null) => {
  if (!pagePath) {
    return null
  }

  // We just use fg, so if they make typos in the routeHook file name,
  // it's all good, we'll still find it
  return (
    fg
      .sync('*.routeHooks.{js,ts,tsx,jsx}', {
        absolute: true,
        cwd: path.dirname(pagePath), // the page's folder
      })
      .at(0) || null
  )
}

/**
 * Use this function to find the app route hook.
 * If it is present, you get the path to the file - in prod, you get the built version in dist.
 * In dev, you get the source version.
 *
 * @param forProd
 * @returns string | null
 */
export const getAppRouteHook = (forProd = false) => {
  const rwPaths = getPaths()

  if (forProd) {
    const distAppRouteHook = path.join(
      rwPaths.web.distRouteHooks,
      'App.routeHooks.js',
    )

    try {
      // Stat sync throws if file doesn't exist
      fs.statSync(distAppRouteHook).isFile()
      return distAppRouteHook
    } catch {
      return null
    }
  }

  return resolveFile(path.join(rwPaths.web.src, 'App.routeHooks'))
}

/**
 * Process the pages directory and return information useful for automated imports.
 *
 * Note: glob.sync returns posix style paths on Windows machines
 * @deprecated I will write a seperate method that use `getFiles` instead. This
 * is used by structure, babel auto-importer and the eslint plugin.
 */
export const processPagesDir = (
  webPagesDir: string = getPaths().web.pages,
): PagesDependency[] => {
  const pagePaths = fg.sync('**/*Page.{js,jsx,ts,tsx}', {
    cwd: webPagesDir,
    ignore: ['node_modules'],
  })
  return pagePaths.map((pagePath) => {
    const p = path.parse(pagePath)

    const importName = p.dir.replace(/\//g, '')
    const importPath = importStatementPath(
      path.join(webPagesDir, p.dir, p.name),
    )

    const importStatement = `const ${importName} = { name: '${importName}', loader: import('${importPath}') }`
    return {
      importName,
      constName: importName,
      importPath,
      path: path.join(webPagesDir, pagePath),
      importStatement,
    }
  })
}

/**
 * Converts Windows-style paths to Posix-style
 * C:\Users\Bob\dev\Redwood -> /c/Users/Bob/dev/Redwood
 *
 * The conversion only happens on Windows systems, and only for paths that are
 * not already Posix-style
 *
 * @param path Filesystem path
 */
export const ensurePosixPath = (path: string) => {
  let posixPath = path

  if (process.platform === 'win32') {
    if (/^[A-Z]:\\/.test(path)) {
      const drive = path[0].toLowerCase()
      posixPath = `/${drive}/${path.substring(3)}`
    }

    posixPath = posixPath.replace(/\\/g, '/')
  }

  return posixPath
}

/**
 * Switches backslash to regular slash on Windows so the path works in
 * import statements
 * C:\Users\Bob\dev\Redwood\UserPage\UserPage ->
 * C:/Users/Bob/dev/Redwood/UserPage/UserPage
 *
 * @param path Filesystem path
 */
export const importStatementPath = (path: string) => {
  let importPath = path

  if (process.platform === 'win32') {
    importPath = importPath.replaceAll('\\', '/')
  }

  return importPath
}

// Small collection of ESM helpers.

function packageJsonIsEsm(packageJsonPath: string) {
  const packageJsonContents = JSON.parse(
    fs.readFileSync(packageJsonPath, 'utf-8'),
  )
  return packageJsonContents.type === 'module'
}

export function projectRootIsEsm() {
  return packageJsonIsEsm(path.join(getPaths().base, 'package.json'))
}

export function projectSideIsEsm(side: 'api' | 'web') {
  const redwoodProjectPaths = getPaths()
  return packageJsonIsEsm(
    path.join(redwoodProjectPaths[side].base, 'package.json'),
  )
}

export function projectIsEsm() {
  if (!projectRootIsEsm()) {
    return false
  }

  for (const side of ['api', 'web'] as const) {
    if (!projectSideIsEsm(side)) {
      return false
    }
  }

  return true
}

export const isTypeScriptProject = () => {
  const paths = getPaths()
  return (
    fs.existsSync(path.join(paths.web.base, 'tsconfig.json')) ||
    fs.existsSync(path.join(paths.api.base, 'tsconfig.json'))
  )
}
