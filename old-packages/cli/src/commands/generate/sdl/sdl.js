import path from 'path'

import boxen from 'boxen'
import camelcase from 'camelcase'
import chalk from 'chalk'
import { Listr } from 'listr2'
import terminalLink from 'terminal-link'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'
import { generate as generateTypes } from '@redwoodjs/internal/dist/generate/generate'
import { getConfig } from '@redwoodjs/project-config'
import { errorTelemetry } from '@redwoodjs/telemetry'

import {
  generateTemplate,
  transformTSToJS,
  getPaths,
  writeFilesTask,
} from '../../../lib'
import c from '../../../lib/colors'
import {
  prepareForRollback,
  addFunctionToRollback,
} from '../../../lib/rollback'
import { pluralize } from '../../../lib/rwPluralize'
import { getSchema, getEnum, verifyModelName } from '../../../lib/schemaHelpers'
import { yargsDefaults } from '../helpers'
import { customOrDefaultTemplatePath, relationsForModel } from '../helpers'
import { files as serviceFiles } from '../service/service'

const DEFAULT_IGNORE_FIELDS_FOR_INPUT = ['createdAt', 'updatedAt']

const missingIdConsoleMessage = () => {
  const line1 =
    chalk.bold.yellow('WARNING') +
    ': Cannot generate CRUD SDL without an `@id` database column.'
  const line2 = 'If you are trying to generate for a many-to-many join table '
  const line3 = "you'll need to update your schema definition to include"
  const line4 = 'an `@id` column. Read more here: '
  const line5 = chalk.underline.blue(
    'https://redwoodjs.com/docs/schema-relations',
  )

  console.error(
    boxen(line1 + '\n\n' + line2 + '\n' + line3 + '\n' + line4 + '\n' + line5, {
      padding: 1,
      margin: { top: 1, bottom: 3, right: 1, left: 2 },
      borderStyle: 'single',
    }),
  )
}

const addFieldGraphQLComment = (field, str) => {
  const description = field.documentation || `Description for ${field.name}.`

  return `
  "${description}"
  ${str}`
}

const modelFieldToSDL = ({
  field,
  required = true,
  types = {},
  docs = false,
}) => {
  if (Object.entries(types).length) {
    field.type =
      field.kind === 'object' ? idType(types[field.type]) : field.type
  }

  const prismaTypeToGraphqlType = {
    Json: 'JSON',
    Decimal: 'Float',
    Bytes: 'Byte',
  }

  const gqlType = prismaTypeToGraphqlType[field.type] || field.type
  const type = field.isList ? `[${gqlType}]` : gqlType
  // lists and id fields are always required (lists can be empty, that's fine)
  const isRequired =
    (field.isRequired && required) || field.isList || field.isId
  const fieldContent = `${field.name}: ${type}${isRequired ? '!' : ''}`

  if (docs) {
    return addFieldGraphQLComment(field, fieldContent)
  } else {
    return fieldContent
  }
}

const querySDL = (model, docs = false) => {
  return model.fields.map((field) => modelFieldToSDL({ field, docs }))
}

const inputSDL = (model, required, types = {}, docs = false) => {
  const ignoredFields = DEFAULT_IGNORE_FIELDS_FOR_INPUT

  return model.fields
    .filter((field) => {
      const idField = model.fields.find((field) => field.isId)

      // Only ignore the id field if it has a default value
      if (idField && idField.default) {
        ignoredFields.push(idField.name)
      }

      return ignoredFields.indexOf(field.name) === -1 && field.kind !== 'object'
    })
    .map((field) => modelFieldToSDL({ field, required, types, docs }))
}

const idInputSDL = (idType, docs) => {
  if (!Array.isArray(idType)) {
    return []
  }
  return idType.map((field) =>
    modelFieldToSDL({ field, required: true, types: {}, docs }),
  )
}

// creates the CreateInput type (all fields are required)
const createInputSDL = (model, types = {}, docs = false) => {
  return inputSDL(model, true, types, docs)
}

// creates the UpdateInput type (not all fields are required)
const updateInputSDL = (model, types = {}, docs = false) => {
  return inputSDL(model, false, types, docs)
}

const idType = (model, crud) => {
  if (!crud) {
    return undefined
  }

  // When using a composite primary key, we need to return an array of fields
  if (model.primaryKey?.fields.length) {
    const { fields: fieldNames } = model.primaryKey
    return fieldNames.map((name) => model.fields.find((f) => f.name === name))
  }

  const idField = model.fields.find((field) => field.isId)

  if (!idField) {
    missingIdConsoleMessage()
    throw new Error('Failed: Could not generate SDL')
  }
  return idField.type
}

const idName = (model, crud) => {
  if (!crud) {
    return undefined
  }

  const idField = model.fields.find((field) => field.isId)
  if (!idField) {
    missingIdConsoleMessage()
    throw new Error('Failed: Could not generate SDL')
  }
  return idField.name
}

const sdlFromSchemaModel = async (name, crud, docs = false) => {
  const model = await getSchema(name)

  // get models for referenced user-defined types
  const types = (
    await Promise.all(
      model.fields
        .filter((field) => field.kind === 'object')
        .map(async (field) => {
          const model = await getSchema(field.type)
          return model
        }),
    )
  ).reduce((acc, cur) => ({ ...acc, [cur.name]: cur }), {})

  // Get enum definition and fields from user-defined types
  const enums = (
    await Promise.all(
      model.fields
        .filter((field) => field.kind === 'enum')
        .map(async (field) => {
          const enumDef = await getEnum(field.type)
          return enumDef
        }),
    )
  ).reduce((acc, curr) => acc.concat(curr), [])

  const modelName = model.name
  const modelDescription =
    model.documentation || `Representation of ${modelName}.`

  const idTypeRes = idType(model, crud)

  return {
    modelName,
    modelDescription,
    query: querySDL(model, docs).join('\n    '),
    createInput: createInputSDL(model, types, docs).join('\n    '),
    updateInput: updateInputSDL(model, types, docs).join('\n    '),
    idInput: idInputSDL(idTypeRes, docs).join('\n    '),
    idType: idType(model, crud),
    idName: idName(model, crud),
    relations: relationsForModel(model),
    enums,
  }
}

export const files = async ({
  name,
  crud = true,
  docs = false,
  tests,
  typescript,
}) => {
  const {
    modelName,
    modelDescription,
    query,
    createInput,
    updateInput,
    idInput,
    idType,
    idName,
    relations,
    enums,
  } = await sdlFromSchemaModel(name, crud, docs)

  const templatePath = customOrDefaultTemplatePath({
    side: 'api',
    generator: 'sdl',
    templatePath: 'sdl.ts.template',
  })

  let template = await generateTemplate(templatePath, {
    docs,
    modelName,
    modelDescription,
    name,
    crud,
    query,
    createInput,
    updateInput,
    idInput,
    idType,
    idName,
    enums,
  })

  const extension = typescript ? 'ts' : 'js'
  let outputPath = path.join(
    getPaths().api.graphql,
    `${camelcase(pluralize(name))}.sdl.${extension}`,
  )

  if (typescript) {
    template = await transformTSToJS(outputPath, template)
  }

  return {
    [outputPath]: template,
    ...(await serviceFiles({
      name,
      crud,
      tests,
      relations,
      typescript,
    })),
  }
}

export const defaults = {
  ...yargsDefaults,
  crud: {
    default: true,
    description: 'Also generate mutations',
    type: 'boolean',
  },
}

export const command = 'sdl <model>'
export const description =
  'Generate a GraphQL schema and service component based on a given DB schema Model'
export const builder = (yargs) => {
  yargs
    .positional('model', {
      description: 'Model to generate the sdl for',
      type: 'string',
    })
    .option('tests', {
      description: 'Generate test files',
      type: 'boolean',
      // don't give it a default value, it gets overwritten in first few lines
      // of the handler
    })
    .option('docs', {
      description: 'Generate SDL and GraphQL comments to use in documentation',
      type: 'boolean',
    })
    .option('rollback', {
      description: 'Revert all generator actions if an error occurs',
      type: 'boolean',
      default: true,
    })
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#generate-sdl',
      )}`,
    )

  // Merge default options in
  Object.entries(defaults).forEach(([option, config]) => {
    yargs.option(option, config)
  })
}
// TODO: Add --dry-run command
export const handler = async ({
  model,
  crud,
  force,
  tests,
  typescript,
  docs,
  rollback,
}) => {
  if (tests === undefined) {
    tests = getConfig().generate.tests
  }

  recordTelemetryAttributes({
    command: 'generate sdl',
    crud,
    force,
    tests,
    typescript,
    docs,
    rollback,
  })

  try {
    const { name } = await verifyModelName({ name: model })

    const tasks = new Listr(
      [
        {
          title: 'Generating SDL files...',
          task: async () => {
            const f = await files({ name, tests, crud, typescript, docs })
            return writeFilesTask(f, { overwriteExisting: force })
          },
        },
        {
          title: `Generating types ...`,
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
      ].filter(Boolean),
      {
        rendererOptions: { collapseSubtasks: false },
        exitOnError: true,
        silentRendererCondition: process.env.NODE_ENV === 'test',
      },
    )

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
