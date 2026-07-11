import fs from 'fs'
import path from 'path'

import * as fragmentMatcher from '@graphql-codegen/fragment-matcher'
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader'
import { loadDocuments, loadSchemaSync } from '@graphql-tools/load'
import { format } from 'prettier'

import { getConfig, getPaths } from '@redwoodjs/project-config'

import { getLoadDocumentsOptions } from './graphqlCodeGen'

type PossibleTypesResult = {
  possibleTypesFiles: string[]
  errors: { message: string; error: unknown }[]
}

/**
 * Generate possible types from fragments and union types
 *
 * In order to use fragments with unions and interfaces in Apollo Client,
 * you need to tell the client how to discriminate between the different
 * types that implement or belong to a supertype.
 *
 * You pass a possibleTypes option to the InMemoryCache constructor
 * to specify these relationships in your schema.
 *
 * This object maps the name of an interface or union type (the supertype)
 * to the types that implement or belong to it (the subtypes).
 *
 * For example:
 *
 * ```ts
 * possibleTypes: {
 *  Character: ["Jedi", "Droid"],
 *  Test: ["PassingTest", "FailingTest", "SkippedTest"],
 *  Snake: ["Viper", "Python"],
 *  Groceries: ['Fruit', 'Vegetable'],
 * },
 * ```
 *
 * @see https://www.apollographql.com/docs/react/data/fragments/#using-fragments-with-unions-and-interfaces
 **/
export const generatePossibleTypes = async (): Promise<PossibleTypesResult> => {
  const config = getConfig()

  if (!config.graphql.fragments) {
    return {
      possibleTypesFiles: [],
      errors: [],
    }
  }

  const filename = path.join(getPaths().web.graphql, 'possibleTypes.ts')
  const options = getLoadDocumentsOptions(filename)
  const documentsGlob = './web/src/**/!(*.d).{ts,tsx,js,jsx}'

  let documents

  try {
    documents = await loadDocuments([documentsGlob], options)
  } catch {
    // No GraphQL documents present, no need to try to generate possibleTypes
    return {
      possibleTypesFiles: [],
      errors: [],
    }
  }

  const errors: { message: string; error: unknown }[] = []

  try {
    const files = []
    const pluginConfig = {}
    const info = {
      outputFile: filename,
    }
    const schema = loadSchemaSync(getPaths().generated.schema, {
      loaders: [new GraphQLFileLoader()],
      sort: true,
    })

    const possibleTypes = await fragmentMatcher.plugin(
      schema,
      documents,
      pluginConfig,
      info,
    )

    files.push(filename)

    const output = await format(possibleTypes.toString(), {
      trailingComma: 'es5',
      bracketSpacing: true,
      tabWidth: 2,
      semi: false,
      singleQuote: true,
      arrowParens: 'always',
      parser: 'typescript',
    })

    fs.mkdirSync(path.dirname(filename), { recursive: true })
    fs.writeFileSync(filename, output)

    return { possibleTypesFiles: [filename], errors }
  } catch (e) {
    errors.push({
      message: 'Error: Could not generate GraphQL possible types (web)',
      error: e,
    })

    return {
      possibleTypesFiles: [],
      errors,
    }
  }
}
