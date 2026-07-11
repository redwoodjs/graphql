import { execSync } from 'child_process'

import camelcase from 'camelcase'
import { Listr } from 'listr2'
import pascalcase from 'pascalcase'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'
import { generate as generateTypes } from '@redwoodjs/internal/dist/generate/generate'
import { getConfig } from '@redwoodjs/project-config'
import { errorTelemetry } from '@redwoodjs/telemetry'

import {
  addRoutesToRouterTask,
  transformTSToJS,
  writeFilesTask,
} from '../../../lib'
import c from '../../../lib/colors'
import {
  prepareForRollback,
  addFunctionToRollback,
} from '../../../lib/rollback'
import {
  createYargsForComponentGeneration,
  pathName,
  templateForComponentFile,
  mapRouteParamTypeToTsType,
  removeGeneratorName,
  validateName,
} from '../helpers'

const COMPONENT_SUFFIX = 'Page'
const REDWOOD_WEB_PATH_NAME = 'pages'

/** @type {(paramType: 'Int' | 'Boolean' | 'String') } **/
const mapRouteParamTypeToDefaultValue = (paramType) => {
  switch (paramType) {
    case 'Int':
      // "42" is just a value used for demonstrating parameter usage in the
      // generated page-, test-, and story-files.
      return 42

    case 'Float':
      return 42.1

    case 'Boolean':
      return true

    default:
      // Boolean -> boolean, String -> string
      return '42'
  }
}

export const paramVariants = (path) => {
  const param = path?.match(/(\{[\w:]+\})/)?.[1]
  const paramName = param?.replace(/:[^}]+/, '').slice(1, -1)

  if (param === undefined) {
    return {
      propParam: '',
      propValueParam: '',
      argumentParam: '',
      paramName: '',
      paramValue: '',
      paramType: '',
    }
  }

  // set paramType param includes type (e.g. {id:Int}), else use string
  const routeParamType = param?.match(/:/)
    ? param?.replace(/[^:]+/, '').slice(1, -1)
    : 'String'

  const defaultValue = mapRouteParamTypeToDefaultValue(routeParamType)
  const defaultValueAsProp =
    routeParamType === 'String' ? `'${defaultValue}'` : defaultValue

  return {
    propParam: `{ ${paramName} }`,
    propValueParam: `${paramName}={${defaultValueAsProp}}`, // used in story
    argumentParam: `{ ${paramName}: ${defaultValueAsProp} }`,
    paramName,
    paramValue: defaultValue,
    paramType: mapRouteParamTypeToTsType(routeParamType),
  }
}

export const files = async ({ name, tests, stories, typescript, ...rest }) => {
  const extension = typescript ? '.tsx' : '.jsx'
  const pageFile = await templateForComponentFile({
    name,
    suffix: COMPONENT_SUFFIX,
    extension,
    webPathSection: REDWOOD_WEB_PATH_NAME,
    generator: 'page',
    templatePath: 'page.tsx.template',
    templateVars: {
      rscEnabled: getConfig().experimental?.rsc?.enabled,
      ...rest,
    },
  })

  const testFile = await templateForComponentFile({
    name,
    suffix: COMPONENT_SUFFIX,
    extension: `.test${extension}`,
    webPathSection: REDWOOD_WEB_PATH_NAME,
    generator: 'page',
    templatePath: 'test.tsx.template',
    templateVars: rest,
  })

  const storiesFile = await templateForComponentFile({
    name,
    suffix: COMPONENT_SUFFIX,
    extension: `.stories${extension}`,
    webPathSection: REDWOOD_WEB_PATH_NAME,
    generator: 'page',
    templatePath:
      rest.paramName !== ''
        ? 'stories.tsx.parameters.template'
        : 'stories.tsx.template',
    templateVars: rest,
  })

  const files = [pageFile]

  if (tests) {
    files.push(testFile)
  }

  if (stories) {
    files.push(storiesFile)
  }

  // Returns
  // {
  //    "path/to/fileA": "<<<template>>>",
  //    "path/to/fileB": "<<<template>>>",
  // }
  return files.reduce(async (accP, [outputPath, content]) => {
    const acc = await accP

    const template = typescript
      ? content
      : await transformTSToJS(outputPath, content)

    return {
      [outputPath]: template,
      ...acc,
    }
  }, Promise.resolve({}))
}

export const routes = ({ name, path }) => {
  return [
    `<Route path="${path}" page={${pascalcase(name)}Page} name="${camelcase(
      name,
    )}" />`,
  ]
}

const positionalsObj = {
  path: {
    description: 'URL path to the page, or just {param}. Defaults to name',
    type: 'string',
  },
}

// @NOTE: Not exporting handler from function
// As pages need a special handler
export const { command, description, builder } =
  createYargsForComponentGeneration({ componentName: 'page', positionalsObj })

export const handler = async ({
  name,
  path,
  force,
  tests,
  stories,
  typescript = false,
  rollback,
}) => {
  const pageName = removeGeneratorName(name, 'page')
  validateName(pageName)

  if (tests === undefined) {
    tests = getConfig().generate.tests
  }
  if (stories === undefined) {
    stories = getConfig().generate.stories
  }

  recordTelemetryAttributes({
    command: 'generate page',
    force,
    tests,
    stories,
    typescript,
    rollback,
  })

  if (process.platform === 'win32') {
    // running `yarn rw g page home /` on Windows using GitBash
    // POSIX-to-Windows path conversion will kick in.
    // See https://github.com/git-for-windows/build-extra/blob/d715c9e/ReleaseNotes.md
    // As a workaround we try to detect when this has happened, and reverse
    // the action

    try {
      // `cygpath -m /` will return something like 'C:/Program Files/Git/\n'
      const slashPath = execSync('cygpath -m /', {
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .toString()
        .trim()

      // `yarn rw g page home /` =>
      //   page === 'C:/Program Files/Git'
      // `yarn rw g page about /about` =>
      //   page === 'C:/Program Files/Git/about'
      // Sometimes there is a / after 'Git' to match, sometimes there isn't
      path = path.replace(new RegExp(`^${slashPath}?`), '/')
    } catch {
      // probably using PowerShell or cmd, in which case no special handling
      // is needed
    }
  }

  const tasks = new Listr(
    [
      {
        title: 'Generating page files...',
        task: async () => {
          path = pathName(path, pageName)
          const f = await files({
            name: pageName,
            path,
            tests,
            stories,
            typescript,
            ...paramVariants(path),
          })
          return writeFilesTask(f, { overwriteExisting: force })
        },
      },
      {
        title: 'Updating routes file...',
        task: async () => {
          addRoutesToRouterTask(
            routes({ name: pageName, path: pathName(path, pageName) }),
          )
        },
      },
      {
        title: `Generating types...`,
        task: async () => {
          const { errors } = await generateTypes()

          for (const { message, error } of errors) {
            console.error(message)
            console.log()
            console.error(error)
            console.log()
          }
          addFunctionToRollback(generateTypes, true)
        },
      },
      {
        title: 'One more thing...',
        task: (ctx, task) => {
          task.title =
            `One more thing...\n\n` +
            `   ${c.warning('Page created! A note about <Metadata>:')}\n\n` +
            `   At the top of your newly created page is a <Metadata> component,\n` +
            `   which contains the title and description for your page, essential\n` +
            `   to good SEO. Check out this page for best practices: \n\n` +
            `   https://developers.google.com/search/docs/advanced/appearance/good-titles-snippets\n`
        },
      },
    ].filter(Boolean),
    { rendererOptions: { collapseSubtasks: false } },
  )

  try {
    if (rollback && !force) {
      prepareForRollback(tasks)
    }
    await tasks.run()
  } catch (e) {
    errorTelemetry(process.argv, e.message)
    console.error(c.error(e.message))
    process.exit(e?.exitCode || 1)
  }
}
