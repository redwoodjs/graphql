import path from 'path'

import camelcase from 'camelcase'
import { Listr } from 'listr2'
import terminalLink from 'terminal-link'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'
import { errorTelemetry } from '@redwoodjs/telemetry'

import { getPaths, transformTSToJS, writeFilesTask } from '../../../lib'
import c from '../../../lib/colors'
import { prepareForRollback } from '../../../lib/rollback'
import { yargsDefaults } from '../helpers'
import { validateName, templateForComponentFile } from '../helpers'

export const files = async ({
  name,
  typescript: generateTypescript = false,
  tests: generateTests = true,
  ...rest
}) => {
  const extension = generateTypescript ? '.ts' : '.js'

  const functionName = camelcase(name)

  const outputFiles = []

  const functionFiles = await templateForComponentFile({
    name: functionName,
    componentName: functionName,
    extension,
    apiPathSection: 'functions',
    generator: 'function',
    templatePath: 'function.ts.template',
    templateVars: { ...rest, typescript: generateTypescript },
    outputPath: path.join(
      getPaths().api.functions,
      functionName,
      `${functionName}${extension}`,
    ),
  })

  outputFiles.push(functionFiles)

  if (generateTests) {
    const testFile = await templateForComponentFile({
      name: functionName,
      componentName: functionName,
      extension,
      apiPathSection: 'functions',
      generator: 'function',
      templatePath: 'test.ts.template',
      templateVars: { ...rest },
      outputPath: path.join(
        getPaths().api.functions,
        functionName,
        `${functionName}.test${extension}`,
      ),
    })

    const scenarioFile = await templateForComponentFile({
      name: functionName,
      componentName: functionName,
      extension,
      apiPathSection: 'functions',
      generator: 'function',
      templatePath: 'scenarios.ts.template',
      templateVars: { ...rest },
      outputPath: path.join(
        getPaths().api.functions,
        functionName,
        `${functionName}.scenarios${extension}`,
      ),
    })

    outputFiles.push(testFile)
    outputFiles.push(scenarioFile)
  }

  return outputFiles.reduce(async (accP, [outputPath, content]) => {
    const acc = await accP

    const template = generateTypescript
      ? content
      : await transformTSToJS(outputPath, content)

    return {
      [outputPath]: template,
      ...acc,
    }
  }, Promise.resolve({}))
}

export const command = 'function <name>'
export const description = 'Generate a Function'

// This could be built using createYargsForComponentGeneration;
// however, functions shouldn't have a `stories` option. createYargs...
// should be reversed to provide `yargsDefaults` as the default configuration
// and accept a configuration such as its CURRENT default to append onto a command.
export const builder = (yargs) => {
  yargs
    .positional('name', {
      description: 'Name of the Function',
      type: 'string',
    })
    .option('rollback', {
      description: 'Revert all generator actions if an error occurs',
      type: 'boolean',
      default: true,
    })
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#generate-function',
      )}`,
    )

  // Add default options, includes '--typescript', '--javascript', '--force', ...
  Object.entries(yargsDefaults).forEach(([option, config]) => {
    yargs.option(option, config)
  })
}

// This could be built using createYargsForComponentGeneration;
// however, we need to add a message after generating the function files
export const handler = async ({ name, force, ...rest }) => {
  recordTelemetryAttributes({
    command: 'generate function',
    force,
    rollback: rest.rollback,
  })

  validateName(name)

  const tasks = new Listr(
    [
      {
        title: 'Generating function files...',
        task: async () => {
          return writeFilesTask(await files({ name, ...rest }), {
            overwriteExisting: force,
          })
        },
      },
    ],
    { rendererOptions: { collapseSubtasks: false }, exitOnError: true },
  )

  try {
    if (rest.rollback && !force) {
      prepareForRollback(tasks)
    }
    await tasks.run()

    console.info('')
    console.info(c.warning('⚠ Important:'))
    console.info('')

    console.info(
      c.bold(
        'When deployed, a custom serverless function is an open API endpoint and ' +
          'is your responsibility to secure appropriately.',
      ),
    )

    console.info('')
    console.info(
      `Please consult the ${terminalLink(
        'Serverless Function Considerations',
        'https://redwoodjs.com/docs/serverless-functions#security-considerations',
      )} in the RedwoodJS documentation for more information.`,
    )
    console.info('')
  } catch (e) {
    errorTelemetry(process.argv, e.message)
    console.error(c.error(e.message))
    process.exit(e?.exitCode || 1)
  }
}
