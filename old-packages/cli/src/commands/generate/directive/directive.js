import path from 'path'

import camelcase from 'camelcase'
import execa from 'execa'
import { Listr } from 'listr2'
import prompts from 'prompts'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'
import { getConfig } from '@redwoodjs/project-config'

import { getPaths, writeFilesTask, transformTSToJS } from '../../../lib'
import c from '../../../lib/colors'
import {
  prepareForRollback,
  addFunctionToRollback,
} from '../../../lib/rollback'
import { yargsDefaults } from '../helpers'
import {
  createYargsForComponentGeneration,
  templateForComponentFile,
  validateName,
} from '../helpers'

export const files = async ({ name, typescript = false, type, tests }) => {
  if (tests === undefined) {
    tests = getConfig().generate.tests
  }

  if (!type) {
    throw new Error('You must specify a directive type')
  }

  const camelName = camelcase(name)

  const outputFilename = `${camelName}.${typescript ? 'ts' : 'js'}`

  const directiveFile = await templateForComponentFile({
    name,
    extension: typescript ? '.ts' : '.js',
    generator: 'directive',
    templatePath: `${type}.directive.ts.template`,
    outputPath: path.join(getPaths().api.directives, camelName, outputFilename),
    templateVars: { camelName },
  })

  const files = [directiveFile]

  if (tests) {
    const testOutputFilename = `${camelcase(name)}.test.${
      typescript ? 'ts' : 'js'
    }`

    const testFile = await templateForComponentFile({
      name,
      extension: typescript ? '.test.ts' : '.test.js',
      generator: 'directive',
      templatePath: `${type}.directive.test.ts.template`,
      outputPath: path.join(
        getPaths().api.directives,
        camelName,
        testOutputFilename,
      ),
      templateVars: { camelName },
    })
    files.push(testFile)
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

const positionalsObj = {
  name: {
    description: 'Name of your directive',
    type: 'string',
  },
}

export const { command, description, builder } =
  createYargsForComponentGeneration({
    componentName: 'directive',
    filesFn: files,
    positionalsObj,
    optionsObj: {
      ...yargsDefaults,
      type: {
        type: 'string',
        choices: ['validator', 'transformer'],
        description: 'Whether to generate a validator or transformer directive',
      },
    },
  })

export const handler = async (args) => {
  recordTelemetryAttributes({
    command: 'generate directive',
    type: args.type,
    force: args.force,
    rollback: args.rollback,
  })

  let notes = ''
  const POST_RUN_INSTRUCTIONS = `
   ${c.note('After modifying your directive, you can add it to your SDLs e.g.:')}

    ${c.info('// example todo.sdl.js')}
    ${c.info('# Option A: Add it to a field')}
    type Todo {
      id: Int!
      body: String! ${c.tip(`@${args.name}`)}
    }

    ${c.info('# Option B: Add it to query/mutation')}
    type Query {
      todos: [Todo] ${c.tip(`@${args.name}`)}
    }
`

  validateName(args.name)

  let directiveType = args.type

  // Prompt to select what type if not specified
  if (!directiveType) {
    const response = await prompts({
      type: 'select',
      name: 'directiveType',
      choices: [
        {
          value: 'validator',
          title: 'Validator',
          description:
            'Implement a validation: throw an error if criteria not met to stop execution',
        },
        {
          value: 'transformer',
          title: 'Transformer',
          description: 'Modify values of fields or query responses',
        },
      ],
      message: 'What type of directive would you like to generate?',
    })

    directiveType = response.directiveType
  }

  const tasks = new Listr(
    [
      {
        title: 'Generating directive file ...',
        task: async () => {
          const f = await files({ ...args, type: directiveType })
          return writeFilesTask(f, {
            overwriteExisting: args.force,
          })
        },
      },
      {
        title: 'Generating TypeScript definitions and GraphQL schemas ...',
        task: () => {
          // Regenerate again at the end if we rollback changes
          addFunctionToRollback(async () => {
            await execa('yarn rw-gen', [], {
              stdio: 'pipe',
              shell: true,
            })
          }, true)
          return execa('yarn rw-gen', [], {
            stdio: 'inherit',
            shell: true,
          })
        },
      },
      {
        title: 'Next steps...',
        task: () => {
          // Can't do this, since it strips formatting
          // task.title = POST_RUN_INSTRUCTIONS
          // Instead we just console.log the instructions at the end
          notes = POST_RUN_INSTRUCTIONS
        },
      },
    ].filter(Boolean),
    { rendererOptions: { collapseSubtasks: false } },
  )

  try {
    if (args.rollback && !args.force) {
      prepareForRollback(tasks)
    }
    await tasks.run()
    if (notes) {
      console.log(notes)
    }
  } catch (e) {
    console.log(c.error(e.message))
    process.exit(1)
  }
}
