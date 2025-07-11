import path from 'path'

import fg, { type Options as FastGlobOptions } from 'fast-glob'

import { getPaths } from '@redwoodjs/project-config'

import { getNamedExports, hasDefaultExport, fileToAst } from './ast'

export const findCells = (cwd: string = getPaths().web.src) => {
  const modules = fg.sync('**/*Cell.{js,jsx,ts,tsx}', {
    cwd,
    absolute: true,
    ignore: ['node_modules'],
  })
  return modules.filter(isCellFile)
}

export const findPages = (cwd: string = getPaths().web.pages) => {
  const modules = fg.sync('**/*Page.{tsx,js,jsx}', {
    cwd,
    absolute: true,
    ignore: ['node_modules'],
  })

  return modules.filter(isPageFile)
}

/**
 * This function finds all modules in the 'web' and 'api' directories excluding 'node_modules' and Cell files.
 * Cell files are also directory named modules but they have their special type mirror file, so they are ignored.
 *
 * @param {string} cwd - The directory path to start searching from. By default, it is the base path of the project.
 * @returns {Array} modules - An array of absolute paths for the found modules.
 *
 * @example
 * // Assuming the base directory of your project is '/Users/user/myproject'
 * findDirectoryNamedModules('/Users/user/myproject');
 * // This will return an array with the absolute paths of all matching files, e.g.:
 * // ['/Users/user/myproject/web/src/components/Author/Author.tsx', '/Users/user/myproject/web/src/pages/AboutPage/AboutPage.tsx']
 */
export const findDirectoryNamedModules = (cwd: string = getPaths().base) => {
  const modules = fg.sync('(api|web)/src/**/*.{ts,js,jsx,tsx}', {
    cwd,
    absolute: true,
    ignore: ['node_modules'],
  })

  return modules
    .filter(isDirectoryNamedModuleFile)
    .filter((p) => !isCellFile(p))
}

export const findGraphQLSchemas = (cwd: string = getPaths().api.graphql) => {
  return fg
    .sync('**/*.sdl.{ts,js}', { cwd, absolute: true })
    .filter(isGraphQLSchemaFile)
}

const ignoreApiFiles = [
  '**/*.test.{js,ts}',
  '**/*.scenarios.{js,ts}',
  '**/*.fixtures.{js,ts}',
  '**/*.d.ts',
]

export const findApiFiles = (cwd: string = getPaths().api.src) => {
  const files = fg.sync('**/*.{js,ts,jsx,tsx}', {
    cwd,
    absolute: true,
    ignore: ignoreApiFiles,
  })
  return files
}

export const findWebFiles = (cwd: string = getPaths().web.src) => {
  const files = fg.sync('**/*.{js,ts,jsx,tsx}', {
    cwd,
    absolute: true,
    ignore: [
      '**/*.test.{js,ts,tsx,jsx}',
      '**/*.fixtures.{js,ts,tsx,jsx}',
      '**/*.mock.{js,ts,tsx,jsx}',
      '**/*.d.ts',
    ],
  })
  return files
}

export const findApiServerFunctions = (
  cwd: string = getPaths().api.functions,
) => {
  const files = fg.sync('**/*.{js,ts}', {
    cwd,
    absolute: true,
    deep: 2, // We don't support deeply nested api functions.
    ignore: ignoreApiFiles,
  })

  return files.filter((f) => isApiFunction(f, cwd))
}

/*
 * There is a copy of this function in packages/api-server/src/plugins/lambdaLoader.ts
 * This is done to avoid to avoid @redwoodjs/api-server depending on @redwoodjs/internal
 */
export const findApiDistFunctions = (params: {
  cwd: string
  options?: FastGlobOptions
  discoverfunctionsGlob?: string | string[]
}) => {
  const {
    cwd = getPaths().api.base,
    options = {},
    discoverfunctionsGlob = 'dist/functions/**/*.{ts,js}',
  } = params
  return fg.sync(discoverfunctionsGlob, {
    cwd,
    deep: 2, // We don't support deeply nested api functions, to maximise compatibility with deployment providers
    absolute: true,
    ...options,
  })
}

export const findRouteHooksSrc = (cwd: string = getPaths().web.src) => {
  return fg.sync('**/*.routeHooks.{js,ts,tsx,jsx}', {
    absolute: true,
    cwd,
  })
}

export const isCellFile = (p: string) => {
  const { dir, name } = path.parse(p)

  // If the path isn't on the web side it cannot be a cell
  if (!isFileInsideFolder(p, getPaths().web.src)) {
    return false
  }

  // A Cell must be a directory named module.
  if (!dir.endsWith(name)) {
    return false
  }

  const ast = fileToAst(p)

  // A Cell should not have a default export.
  if (hasDefaultExport(ast)) {
    return false
  }

  // A Cell must export QUERY and Success.
  const exports = getNamedExports(ast)
  const exportedQUERY = exports.findIndex((v) => v.name === 'QUERY') !== -1
  const exportedSuccess = exports.findIndex((v) => v.name === 'Success') !== -1
  if (!exportedQUERY && !exportedSuccess) {
    return false
  }

  return true
}

export const findScripts = (cwd: string = getPaths().scripts) => {
  return fg.sync('./**/*.{js,jsx,ts,tsx}', {
    cwd,
    absolute: true,
    ignore: ['node_modules'],
  })
}

export const isPageFile = (p: string) => {
  const { name } = path.parse(p)

  // A page must end with "Page.{jsx,js,tsx}".
  if (!name.endsWith('Page')) {
    return false
  }

  // A page should be in the `web/src/pages` directory.
  if (!isFileInsideFolder(p, getPaths().web.pages)) {
    return false
  }

  // A Page should have a default export.
  const ast = fileToAst(p)
  if (!hasDefaultExport(ast)) {
    return false
  }

  return true
}
/**
 * This function checks if the given path belongs to a directory named module.
 * A directory named module is where the filename (without extension) is the same as the directory it is in.
 *
 * @param {string} p - The absolute path of the file.
 * @returns {boolean} - Returns true if the path belongs to a directory named module, false otherwise.
 *
 * @example
 * isDirectoryNamedModuleFile('/Users/user/myproject/web/src/components/Author/Author.tsx');
 * // Returns: true
 *
 * isDirectoryNamedModuleFile('/Users/user/myproject/web/src/components/Author/AuthorInfo.tsx');
 * // Returns: false
 */
export const isDirectoryNamedModuleFile = (p: string) => {
  const { dir, name } = path.parse(p)
  return dir.endsWith(name)
}

export const isGraphQLSchemaFile = (p: string) => {
  if (!p.match(/\.sdl\.(ts|js)$/)?.[0]) {
    return false
  }

  const ast = fileToAst(p)
  const exports = getNamedExports(ast)
  return exports.findIndex((v) => v.name === 'schema') !== -1
}

/**
 * The following patterns are supported for api functions:
 *
 * 1. a module at the top level: `/graphql.js`
 * 2. a module in a folder with a module of the same name: `/health/health.js`
 * 3. a module in a folder named index: `/x/index.js`
 */
export const isApiFunction = (p: string, functionsPath: string) => {
  p = path.relative(functionsPath, p)
  const { dir, name } = path.parse(p)
  if (dir === name) {
    // Directory named module
    return true
  } else if (dir === '') {
    // Module in the functions root
    return true
  } else if (dir.length && name === 'index') {
    // Directory with an `index.js` file
    return true
  }
  return false
}

export const isFileInsideFolder = (filePath: string, folderPath: string) => {
  const { dir } = path.parse(filePath)
  const relativePathFromFolder = path.relative(folderPath, dir)
  if (
    !relativePathFromFolder ||
    relativePathFromFolder.startsWith('..') ||
    path.isAbsolute(relativePathFromFolder)
  ) {
    return false
  } else {
    return true
  }
}
