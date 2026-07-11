import fs from 'fs'

import { codegen } from '@graphql-codegen/core'
import type { Types as CodegenTypes } from '@graphql-codegen/plugin-helpers'
import * as schemaAstPlugin from '@graphql-codegen/schema-ast'
import { CodeFileLoader } from '@graphql-tools/code-file-loader'
import type { LoadSchemaOptions } from '@graphql-tools/load'
import { loadSchema } from '@graphql-tools/load'
import { getSchema } from '@prisma/internals'
import chalk from 'chalk'
import type { DocumentNode } from 'graphql'
import { print } from 'graphql'
import terminalLink from 'terminal-link'

import { rootSchema } from '@redwoodjs/graphql-server'
import type { ScalarSchemaKeys } from '@redwoodjs/graphql-server/src/rootSchema'
import { getPaths, getConfig, resolveFile } from '@redwoodjs/project-config'

export const generateGraphQLSchema = async () => {
  const redwoodProjectPaths = getPaths()
  const redwoodProjectConfig = getConfig()

  const schemaPointerMap = {
    [print(rootSchema.schema)]: {},
    'graphql/**/*.sdl.{js,ts}': {},
    'directives/**/*.{js,ts}': {},
    'subscriptions/**/*.{js,ts}': {},
  }

  for (const [name, schema] of Object.entries(rootSchema.scalarSchemas)) {
    if (redwoodProjectConfig.graphql.includeScalars[name as ScalarSchemaKeys]) {
      schemaPointerMap[print(schema)] = {}
    }
  }

  // If we're serverful and the user is using realtime, we need to include the live directive for realtime support.
  // Note the `ERR_  prefix in`ERR_MODULE_NOT_FOUND`. Since we're using `await import`,
  // if the package (here, `@redwoodjs/realtime`) can't be found, it throws this error, with the prefix.
  // Whereas `require('@redwoodjs/realtime')` would throw `MODULE_NOT_FOUND`.
  if (resolveFile(`${getPaths().api.src}/server`)) {
    try {
      const { liveDirectiveTypeDefs } = await import('@redwoodjs/realtime')
      schemaPointerMap[liveDirectiveTypeDefs] = {}
    } catch (error) {
      if ((error as { code: string }).code !== 'ERR_MODULE_NOT_FOUND') {
        throw error
      }
    }
  }

  const loadSchemaConfig: LoadSchemaOptions = {
    assumeValidSDL: true,
    sort: true,
    convertExtensions: true,
    includeSources: true,
    cwd: redwoodProjectPaths.api.src,
    schema: Object.keys(schemaPointerMap),
    generates: {
      [redwoodProjectPaths.generated.schema]: {
        plugins: ['schema-ast'],
      },
    },
    silent: false,
    errorsOnly: false,
    pluginContext: {},
    loaders: [new CodeFileLoader()],
  }

  let loadedSchema
  const errors: { message: string; error: unknown }[] = []

  try {
    loadedSchema = await loadSchema(schemaPointerMap, loadSchemaConfig)
  } catch (e) {
    if (e instanceof Error) {
      const match = e.message.match(/Unknown type: "(\w+)"/)
      const name = match?.[1]
      const schemaPrisma = (
        await getSchema(redwoodProjectPaths.api.dbSchema)
      ).toString()

      const errorObject = {
        message: `Schema loading failed. ${e.message}`,
        error: e,
      }

      errors.push(errorObject)

      if (name && schemaPrisma.includes(`model ${name}`)) {
        // Not all SDLs need to be backed by a DB model, but if they are we can
        // provide a more helpful error message

        errorObject.message = [
          errorObject.message,
          '',
          `  ${chalk.bgYellow(` ${chalk.black.bold('Heads up')} `)}`,
          '',
          chalk.yellow(
            `  It looks like you have a ${name} model in your Prisma schema.`,
          ),
          chalk.yellow(
            `  If it's part of a relation, you may have to generate SDL or scaffolding for ${name} too.`,
          ),
          chalk.yellow(
            `  So, if you haven't done that yet, ignore this error message and run the SDL or scaffold generator for ${name} now.`,
          ),
          '',
          chalk.yellow(
            `  See the ${terminalLink(
              'Troubleshooting Generators',
              'https://redwoodjs.com/docs/schema-relations#troubleshooting-generators',
            )} section in our docs for more help.`,
          ),
        ].join('\n')
      }
    }
  }

  const options: CodegenTypes.GenerateOptions = {
    config: {}, // no extra config needed for merged schema file generation
    plugins: [{ 'schema-ast': {} }],
    pluginMap: { 'schema-ast': schemaAstPlugin },
    schema: {} as unknown as DocumentNode,
    schemaAst: loadedSchema,
    filename: redwoodProjectPaths.generated.schema,
    documents: [],
  }

  if (loadedSchema) {
    try {
      const schema = await codegen(options)
      fs.writeFileSync(redwoodProjectPaths.generated.schema, schema)
      return { schemaPath: redwoodProjectPaths.generated.schema, errors }
    } catch (e) {
      errors.push({
        message: `GraphQL Schema codegen failed`,
        error: e,
      })
    }
  }

  return { schemaPath: '', errors }
}
