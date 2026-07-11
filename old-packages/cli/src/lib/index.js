import { execSync } from 'child_process'
import https from 'https'
import path from 'path'

import * as babel from '@babel/core'
import boxen from 'boxen'
import camelcase from 'camelcase'
import { paramCase } from 'change-case'
import decamelize from 'decamelize'
import execa from 'execa'
import fs from 'fs-extra'
import { Listr } from 'listr2'
import { memoize, template } from 'lodash'
import pascalcase from 'pascalcase'
import { format } from 'prettier'

import {
  getConfig as getRedwoodConfig,
  getPaths as getRedwoodPaths,
  resolveFile as internalResolveFile,
  findUp,
} from '@redwoodjs/project-config'

import c from './colors'
import { addFileToRollback } from './rollback'
import { pluralize, singularize } from './rwPluralize'

export { findUp }

/**
 * Returns variants of the passed `name` for usage in templates. If the given
 * name was "fooBar" then these would be:

 * pascalName: FooBar
 * singularPascalName: FooBar
 * pluralPascalName: FooBars
 * singularCamelName: fooBar
 * pluralCamelName: fooBars
 * singularParamName: foo-bar
 * pluralParamName: foo-bars
 * singularConstantName: FOO_BAR
 * pluralConstantName: FOO_BARS
*/
export const nameVariants = (name) => {
  const normalizedName = pascalcase(paramCase(singularize(name)))

  return {
    pascalName: pascalcase(paramCase(name)),
    camelName: camelcase(name),
    singularPascalName: normalizedName,
    pluralPascalName: pluralize(normalizedName),
    singularCamelName: camelcase(normalizedName),
    pluralCamelName: camelcase(pluralize(normalizedName)),
    singularParamName: paramCase(normalizedName),
    pluralParamName: paramCase(pluralize(normalizedName)),
    singularConstantName: decamelize(normalizedName).toUpperCase(),
    pluralConstantName: decamelize(pluralize(normalizedName)).toUpperCase(),
  }
}

export const generateTemplate = async (templateFilename, { name, ...rest }) => {
  try {
    const templateFn = template(readFile(templateFilename).toString())

    const renderedTemplate = templateFn({
      name,
      ...nameVariants(name),
      ...rest,
    })

    return prettify(templateFilename, renderedTemplate)
  } catch (error) {
    error.message = `Error applying template at ${templateFilename} for ${name}: ${error.message}`
    throw error
  }
}

export const prettify = async (templateFilename, renderedTemplate) => {
  // We format .js and .css templates, we need to tell prettier which parser
  // we're using.
  // https://prettier.io/docs/en/options.html#parser
  const parser = {
    '.css': 'css',
    '.js': 'babel',
    '.jsx': 'babel',
    '.ts': 'babel-ts',
    '.tsx': 'babel-ts',
  }[path.extname(templateFilename.replace('.template', ''))]

  if (typeof parser === 'undefined') {
    return renderedTemplate
  }

  const prettierOptions = await getPrettierOptions()

  return format(renderedTemplate, {
    ...prettierOptions,
    parser,
  })
}

export const readFile = (target) =>
  fs.readFileSync(target, { encoding: 'utf8' })

const SUPPORTED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx']

export const deleteFile = (file) => {
  const extension = path.extname(file)
  if (SUPPORTED_EXTENSIONS.includes(extension)) {
    const baseFile = getBaseFile(file)
    SUPPORTED_EXTENSIONS.forEach((ext) => {
      const f = baseFile + ext
      if (fs.existsSync(f)) {
        fs.unlinkSync(f)
      }
    })
  } else {
    fs.unlinkSync(file)
  }
}

const getBaseFile = (file) => file.replace(/\.\w*$/, '')

export const existsAnyExtensionSync = (file) => {
  const extension = path.extname(file)
  if (SUPPORTED_EXTENSIONS.includes(extension)) {
    const baseFile = getBaseFile(file)
    return SUPPORTED_EXTENSIONS.some((ext) => fs.existsSync(baseFile + ext))
  }

  return fs.existsSync(file)
}

export const writeFile = (
  target,
  contents,
  { overwriteExisting = false } = {},
  task = {},
) => {
  const { base } = getPaths()
  task.title = `Writing \`./${path.relative(base, target)}\``
  if (!overwriteExisting && fs.existsSync(target)) {
    throw new Error(`${target} already exists.`)
  }

  addFileToRollback(target)

  const filename = path.basename(target)
  const targetDir = target.replace(filename, '')
  fs.mkdirSync(targetDir, { recursive: true })
  fs.writeFileSync(target, contents)
  task.title = `Successfully wrote file \`./${path.relative(base, target)}\``
}

export const saveRemoteFileToDisk = (
  url,
  localPath,
  { overwriteExisting = false } = {},
) => {
  if (!overwriteExisting && fs.existsSync(localPath)) {
    throw new Error(`${localPath} already exists.`)
  }

  const downloadPromise = new Promise((resolve, reject) =>
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(fs.createWriteStream(localPath))
        resolve()
      } else {
        reject(
          new Error(`${url} responded with status code ${response.statusCode}`),
        )
      }
    }),
  )

  return downloadPromise
}

export const getInstalledRedwoodVersion = () => {
  try {
    // @ts-ignore TS Config issue, due to src being the rootDir
    const packageJson = require('../../package.json')
    return packageJson.version
  } catch (e) {
    console.error(c.error('Could not find installed redwood version'))
    process.exit(1)
  }
}

export const bytes = (contents) => Buffer.byteLength(contents, 'utf8')

/**
 * This wraps the core version of getPaths into something that catches the exception
 * and displays a helpful error message.
 */
export const _getPaths = () => {
  try {
    return getRedwoodPaths()
  } catch (e) {
    console.error(c.error(e.message))
    process.exit(1)
  }
}
export const getPaths = memoize(_getPaths)
export const resolveFile = internalResolveFile

export const getGraphqlPath = () =>
  resolveFile(path.join(getPaths().api.functions, 'graphql'))

export const graphFunctionDoesExist = () => {
  return fs.existsSync(getGraphqlPath())
}

export const getConfig = () => {
  try {
    return getRedwoodConfig()
  } catch (e) {
    console.error(c.error(e.message))
    process.exit(1)
  }
}

/**
 * This returns the config present in `prettier.config.js` of a Redwood project.
 */
export const getPrettierOptions = async () => {
  try {
    const { default: prettierOptions } = await import(
      `file://${path.join(getPaths().base, 'prettier.config.js')}`
    )
    return prettierOptions
  } catch (e) {
    // If we're in our vitest environment we want to return a consistent set of prettier options
    // such that snapshots don't change unexpectedly.
    if (process.env.VITEST_POOL_ID !== undefined) {
      return {
        trailingComma: 'es5',
        bracketSpacing: true,
        tabWidth: 2,
        semi: false,
        singleQuote: true,
        arrowParens: 'always',
        overrides: [
          {
            files: 'Routes.*',
            options: {
              printWidth: 999,
            },
          },
        ],
      }
    }
    return undefined
  }
}

// TODO: Move this into `generateTemplate` when all templates have TS support
/*
 * Convert a generated TS template file into JS.
 */
export const transformTSToJS = async (filename, content) => {
  const { code } = babel.transform(content, {
    filename,
    // If you ran `yarn rw generate` in `./web` transformSync would import the `.babelrc.js` file,
    // in `./web`? despite us setting `configFile: false`.
    cwd: process.env.NODE_ENV === 'test' ? undefined : getPaths().base,
    configFile: false,
    plugins: [
      [
        '@babel/plugin-transform-typescript',
        {
          isTSX: true,
          allExtensions: true,
        },
      ],
    ],
    retainLines: true,
  })

  return prettify(filename.replace(/\.ts(x)?$/, '.js$1'), code)
}

/**
 * Creates a list of tasks that write files to the disk.
 *
 * @param files - {[filepath]: contents}
 */
export const writeFilesTask = (files, options) => {
  const { base } = getPaths()
  return new Listr(
    Object.keys(files).map((file) => {
      const contents = files[file]
      return {
        title: `...waiting to write file \`./${path.relative(base, file)}\`...`,
        task: (ctx, task) => writeFile(file, contents, options, task),
      }
    }),
  )
}

/**
 * Creates a list of tasks that delete files from the disk.
 *
 * @param files - {[filepath]: contents}
 */
export const deleteFilesTask = (files) => {
  const { base } = getPaths()

  return new Listr([
    ...Object.keys(files).map((file) => {
      return {
        title: `Destroying \`./${path.relative(base, getBaseFile(file))}\`...`,
        skip: () => !existsAnyExtensionSync(file) && `File doesn't exist`,
        task: () => deleteFile(file),
      }
    }),
    {
      title: 'Cleaning up empty directories...',
      task: () => cleanupEmptyDirsTask(files),
    },
  ])
}

/**
 * @param files - {[filepath]: contents}
 * Deletes any empty directories that are more than three levels deep below the base directory
 * i.e. any directory below /web/src/components
 */
export const cleanupEmptyDirsTask = (files) => {
  const { base } = getPaths()
  const endDirs = Object.keys(files).map((file) => path.dirname(file))
  const uniqueEndDirs = [...new Set(endDirs)]
  // get the additional path directories not at the end of the path
  const pathDirs = []
  uniqueEndDirs.forEach((dir) => {
    const relDir = path.relative(base, dir)
    const splitDir = relDir.split(path.sep)
    splitDir.pop()
    while (splitDir.length > 3) {
      const subDir = path.join(base, splitDir.join('/'))
      pathDirs.push(subDir)
      splitDir.pop()
    }
  })
  const uniqueDirs = uniqueEndDirs.concat([...new Set(pathDirs)])

  return new Listr(
    uniqueDirs.map((dir) => {
      return {
        title: `Removing empty \`./${path.relative(base, dir)}\`...`,
        task: () => fs.rmdirSync(dir),
        skip: () => {
          if (!fs.existsSync(dir)) {
            return `Doesn't exist`
          }
          if (fs.readdirSync(dir).length > 0) {
            return 'Not empty'
          }
          return false
        },
      }
    }),
  )
}

const wrapWithSet = (
  routesContent,
  layout,
  routes,
  newLineAndIndent,
  props = {},
) => {
  const [_, indentOne, indentTwo] = routesContent.match(
    /([ \t]*)<Router.*?>[^<]*[\r\n]+([ \t]+)/,
  ) || ['', 0, 2]
  const oneLevelIndent = indentTwo.slice(0, indentTwo.length - indentOne.length)
  const newRoutesWithExtraIndent = routes.map((route) => oneLevelIndent + route)

  // converts { foo: 'bar' } to `foo="bar"`
  const propsString = Object.entries(props)
    .map((values) => `${values[0]}="${values[1]}"`)
    .join(' ')

  return [
    `<Set wrap={${layout}}${propsString && ' ' + propsString}>`,
    ...newRoutesWithExtraIndent,
    `</Set>`,
  ].join(newLineAndIndent)
}

/**
 * Update the project's routes file.
 */
export const addRoutesToRouterTask = (routes, layout, setProps = {}) => {
  const redwoodPaths = getPaths()
  const routesContent = readFile(redwoodPaths.web.routes).toString()
  let newRoutes = routes.filter((route) => !routesContent.match(route))

  if (newRoutes.length) {
    const [routerStart, routerParams, newLineAndIndent] = routesContent.match(
      /\s*<Router(.*?)>(\s*)/s,
    )

    if (/trailingSlashes={?(["'])always\1}?/.test(routerParams)) {
      // newRoutes will be something like:
      // ['<Route path="/foo" page={FooPage} name="foo"/>']
      // and we need to replace `path="/foo"` with `path="/foo/"`
      newRoutes = newRoutes.map((route) => {
        if (route.length > 2000) {
          throw new Error(`Route is too long to process:\n${route}`)
        }
        return route.replace(/ path="(.+?)" /, ' path="$1/" ')
      })
    }

    const routesBatch = layout
      ? wrapWithSet(
          routesContent,
          layout,
          newRoutes,
          newLineAndIndent,
          setProps,
        )
      : newRoutes.join(newLineAndIndent)

    const newRoutesContent = routesContent.replace(
      routerStart,
      `${routerStart + routesBatch + newLineAndIndent}`,
    )

    writeFile(redwoodPaths.web.routes, newRoutesContent, {
      overwriteExisting: true,
    })
  }
}

export const addScaffoldImport = () => {
  const appJsPath = getPaths().web.app
  let appJsContents = readFile(appJsPath).toString()

  if (appJsContents.match('./scaffold.css')) {
    return 'Skipping scaffold style include'
  }

  appJsContents = appJsContents.replace(
    /import ['"]\.\/index\.css['"]/,
    "import './index.css'\nimport './scaffold.css'\n",
  )
  writeFile(appJsPath, appJsContents, { overwriteExisting: true })

  return 'Added scaffold import to App.{jsx,tsx}'
}

const removeEmtpySet = (routesContent, layout) => {
  const setWithLayoutReg = new RegExp(
    `\\s*<Set[^>]*wrap={${layout}}[^<]*>([^<]*)<\/Set>`,
  )
  const [matchedSet, childContent] = routesContent.match(setWithLayoutReg) || []
  if (!matchedSet) {
    return routesContent
  }

  const child = childContent.replace(/\s/g, '')
  if (child.length > 0) {
    return routesContent
  }
  return routesContent.replace(setWithLayoutReg, '')
}

/**
 * Remove named routes from the project's routes file.
 *
 * @param {string[]} routes - Route names
 */
export const removeRoutesFromRouterTask = (routes, layout) => {
  const redwoodPaths = getPaths()
  const routesContent = readFile(redwoodPaths.web.routes).toString()
  const newRoutesContent = routes.reduce((content, route) => {
    const matchRouteByName = new RegExp(`\\s*<Route[^>]*name="${route}"[^>]*/>`)
    return content.replace(matchRouteByName, '')
  }, routesContent)

  const routesWithoutEmptySet = layout
    ? removeEmtpySet(newRoutesContent, layout)
    : newRoutesContent

  writeFile(redwoodPaths.web.routes, routesWithoutEmptySet, {
    overwriteExisting: true,
  })
}

/**
 *
 * Use this util to install dependencies on a user's Redwood app
 *
 * @example addPackagesTask({
 * packages: ['fs-extra', 'somePackage@2.1.0'],
 * side: 'api', // <-- leave empty for project root
 * devDependency: true
 * })
 */
export const addPackagesTask = ({
  packages,
  side = 'project',
  devDependency = false,
}) => {
  const packagesWithSameRWVersion = packages.map((pkg) => {
    if (pkg.includes('@redwoodjs')) {
      return `${pkg}@${getInstalledRedwoodVersion()}`
    } else {
      return pkg
    }
  })

  let installCommand
  // if web,api
  if (side !== 'project') {
    installCommand = [
      'yarn',
      [
        'workspace',
        side,
        'add',
        devDependency && '--dev',
        ...packagesWithSameRWVersion,
      ].filter(Boolean),
    ]
  } else {
    const stdout = execSync('yarn --version')

    const yarnVersion = stdout.toString().trim()

    installCommand = [
      'yarn',
      [
        yarnVersion.startsWith('1') && '-W',
        'add',
        devDependency && '--dev',
        ...packagesWithSameRWVersion,
      ].filter(Boolean),
    ]
  }

  return {
    title: `Adding dependencies to ${side}`,
    task: async () => {
      await execa(...installCommand)
    },
  }
}

export const runCommandTask = async (commands, { verbose }) => {
  const tasks = new Listr(
    commands.map(({ title, cmd, args, opts = {}, cwd = getPaths().base }) => ({
      title,
      task: async () => {
        return execa(cmd, args, {
          shell: true,
          cwd,
          stdio: verbose ? 'inherit' : 'pipe',
          extendEnv: true,
          cleanup: true,
          ...opts,
        })
      },
    })),
    {
      renderer: verbose && 'verbose',
      rendererOptions: { collapseSubtasks: false, dateFormat: false },
    },
  )

  try {
    await tasks.run()
    return true
  } catch (e) {
    console.log(c.error(e.message))
    return false
  }
}

/** Extract default CLI args from an exported builder */
export const getDefaultArgs = (builder) => {
  return Object.entries(builder).reduce(
    (options, [optionName, optionConfig]) => {
      // If a default is defined use it
      options[optionName] = optionConfig.default
      return options
    },
    {},
  )
}

/**
 * Check if user is using VS Code
 *
 * i.e. check for the existence of .vscode folder in root project directory
 */
export const usingVSCode = () => {
  const redwoodPaths = getPaths()
  const VS_CODE_PATH = path.join(redwoodPaths.base, '.vscode')
  return fs.existsSync(VS_CODE_PATH)
}

export const printSetupNotes = (notes) => {
  return {
    title: 'One more thing...',
    task: (_ctx, task) => {
      task.title = `One more thing...\n\n ${boxen(notes.join('\n'), {
        padding: { top: 1, bottom: 1, right: 1, left: 1 },
        margin: 1,
        borderColour: 'gray',
      })}  \n`
    },
  }
}
