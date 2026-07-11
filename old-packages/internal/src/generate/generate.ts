#!/usr/bin/env node

import { getConfig, getPaths } from '@redwoodjs/project-config'

import { generateClientPreset } from './clientPreset'
import { generateGraphQLSchema } from './graphqlSchema'
import { generatePossibleTypes } from './possibleTypes'
import { generateTypeDefs } from './typeDefinitions'

export const generate = async () => {
  const config = getConfig()
  const { schemaPath, errors: generateGraphQLSchemaErrors } =
    await generateGraphQLSchema()
  const { typeDefFiles, errors: generateTypeDefsErrors } =
    await generateTypeDefs()

  const clientPresetFiles = []

  const { possibleTypesFiles, errors: generatePossibleTypesErrors } =
    await generatePossibleTypes()

  if (config.graphql.trustedDocuments) {
    const preset = await generateClientPreset()
    clientPresetFiles.push(...preset.clientPresetFiles)
  }

  let files = []

  if (schemaPath !== '') {
    files.push(schemaPath)
  }

  files = [
    ...files,
    ...typeDefFiles,
    ...clientPresetFiles,
    ...possibleTypesFiles,
  ].filter((x) => typeof x === 'string')

  return {
    files,
    errors: [
      ...generateGraphQLSchemaErrors,
      ...generateTypeDefsErrors,
      ...generatePossibleTypesErrors,
    ],
  }
}

export const run = async () => {
  console.log('Generating...')
  console.log()

  const { files, errors } = await generate()
  const rwjsPaths = getPaths()

  for (const f of files) {
    console.log('-', f.replace(rwjsPaths.base + '/', ''))
  }
  console.log()

  if (errors.length === 0) {
    console.log('... done.')
    console.log()
    return
  }
  process.exitCode ||= 1

  console.log('... done with errors.')
  console.log()

  for (const { message, error } of errors) {
    console.error(message)
    console.log()
    console.error(error)
    console.log()
  }
}

if (require.main === module) {
  run()
}
