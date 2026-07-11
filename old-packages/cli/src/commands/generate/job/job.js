import path from 'node:path'
import { pathToFileURL } from 'node:url'

import * as changeCase from 'change-case'
import execa from 'execa'
import { Listr } from 'listr2'
import terminalLink from 'terminal-link'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'
import { errorTelemetry } from '@redwoodjs/telemetry'

import { getPaths, transformTSToJS, writeFilesTask } from '../../../lib'
import c from '../../../lib/colors'
import { isTypeScriptProject } from '../../../lib/project'
import { prepareForRollback } from '../../../lib/rollback'
import { yargsDefaults } from '../helpers'
import { validateName, templateForComponentFile } from '../helpers'

// Try to make the name end up looking like: `WelcomeNotice` even if the user
// called it `welcome-notice` or `welcomeNoticeJob` or something like that
const normalizeName = (name) => {
  return changeCase.pascalCase(name).replace(/Job$/, '')
}

export const files = async ({
  name,
  queueName,
  typescript: generateTypescript,
  tests: generateTests = true,
  ...rest
}) => {
  const extension = generateTypescript ? '.ts' : '.js'

  const outputFiles = []

  const jobName = normalizeName(name)

  const jobFiles = await templateForComponentFile({
    name: jobName,
    componentName: jobName,
    extension,
    apiPathSection: 'jobs',
    generator: 'job',
    templatePath: 'job.ts.template',
    templateVars: { name: jobName, queueName, ...rest },
    outputPath: path.join(
      getPaths().api.jobs,
      `${jobName}Job`,
      `${jobName}Job${extension}`,
    ),
  })

  outputFiles.push(jobFiles)

  if (generateTests) {
    const testFile = await templateForComponentFile({
      name: jobName,
      componentName: jobName,
      extension,
      apiPathSection: 'jobs',
      generator: 'job',
      templatePath: 'test.ts.template',
      templateVars: { ...rest },
      outputPath: path.join(
        getPaths().api.jobs,
        `${jobName}Job`,
        `${jobName}Job.test${extension}`,
      ),
    })

    const scenarioFile = await templateForComponentFile({
      name: jobName,
      componentName: jobName,
      extension,
      apiPathSection: 'jobs',
      generator: 'job',
      templatePath: 'scenarios.ts.template',
      templateVars: { ...rest },
      outputPath: path.join(
        getPaths().api.jobs,
        `${jobName}Job`,
        `${jobName}Job.scenarios${extension}`,
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

export const command = 'job <name>'
export const description = 'Generate a Background Job'

// This could be built using createYargsForComponentGeneration;
// however, functions shouldn't have a `stories` option. createYargs...
// should be reversed to provide `yargsDefaults` as the default configuration
// and accept a configuration such as its CURRENT default to append onto a
// command.
export const builder = (yargs) => {
  yargs
    .positional('name', {
      description: 'Name of the Job',
      type: 'string',
    })
    .option('typescript', {
      alias: 'ts',
      description: 'Generate TypeScript files',
      type: 'boolean',
      default: isTypeScriptProject(),
    })
    .option('tests', {
      description: 'Generate test files',
      type: 'boolean',
      default: true,
    })
    .option('rollback', {
      description: 'Revert all generator actions if an error occurs',
      type: 'boolean',
      default: true,
    })
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#generate-job',
      )}`,
    )

  // Add default options. This includes '--typescript', '--javascript',
  // '--force', ...
  Object.entries(yargsDefaults).forEach(([option, config]) => {
    yargs.option(option, config)
  })
}

// This could be built using createYargsForComponentGeneration;
// however, we need to add a message after generating the function files
export const handler = async ({ name, force, ...rest }) => {
  recordTelemetryAttributes({
    command: 'generate job',
    force,
    rollback: rest.rollback,
  })

  validateName(name)

  let queueName = 'default'

  // Attempt to read the first queue in the user's job config file
  try {
    const jobsManagerFile = getPaths().api.distJobsConfig
    const jobManager = await import(pathToFileURL(jobsManagerFile).href)
    queueName = jobManager.jobs?.queues[0] ?? 'default'
  } catch (_e) {
    // We don't care if this fails because we'll fall back to 'default'
  }

  const tasks = new Listr(
    [
      {
        title: 'Generating job files...',
        task: async () => {
          const jobFiles = await files({ name, queueName, ...rest })
          return writeFilesTask(jobFiles, { overwriteExisting: force })
        },
      },
      {
        title: 'Cleaning up...',
        task: () => {
          execa.commandSync('yarn', [
            'eslint',
            '--fix',
            '--config',
            `${getPaths().base}/node_modules/@redwoodjs/eslint-config/shared.js`,
            `${getPaths().api.jobsConfig}`,
          ])
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
  } catch (e) {
    errorTelemetry(process.argv, e.message)
    console.error(c.error(e.message))
    process.exit(e?.exitCode || 1)
  }
}
