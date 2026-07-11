import {
  getConfig,
  getDMMF,
  getSchema as getSchemaPrisma,
} from '@prisma/internals'

import { ensureUniquePlural } from './pluralHelpers'
import { singularize, isPlural } from './rwPluralize'

import { getPaths } from './'

/**
 * Used to memoize results from `getSchema()` so we don't have to go through
 * the work of opening and parsing the file from scratch each time `getSchema()`
 * is called with the same model name.
 */
const schemaMemo = {}

/**
 * Searches for the given model (ignoring case) in `schema.prisma`
 * and returns the name as it is written by the user, or
 * `undefined` if no model could be found
 */
const getExistingModelName = async (name) => {
  if (!name) {
    return undefined
  }

  // Support PascalCase, camelCase, kebab-case, UPPER_CASE,
  // and lowercase model names
  const modelName = name.replace(/[_-]/g, '').toLowerCase()
  for (let model of Object.values(schemaMemo)) {
    if (model.name.toLowerCase() === modelName) {
      return model.name
    }
  }

  const schema = (await getSchemaDefinitions()).datamodel
  for (let model of schema.models) {
    if (model.name.toLowerCase() === modelName) {
      return model.name
    }
  }

  return undefined
}

/**
 * Returns the database schema for the given `name` database table parsed from
 * the schema.prisma of the target application. If no `name` is given then the
 * entire schema is returned.
 */
export const getSchema = async (name) => {
  const schema = (await getSchemaDefinitions()).datamodel

  if (!name) {
    return schema
  }

  const modelName = await getExistingModelName(name)
  if (!modelName) {
    throw new Error(
      `No schema definition found for \`${name}\` in schema.prisma file`,
    )
  }

  if (schemaMemo[modelName]) {
    return schemaMemo[modelName]
  }

  const model = schema.models.find((model) => model.name === modelName)
  if (!model) {
    // TODO: Can this happen, and if yes, should we prefer throwing an error?
    return undefined
  }

  // Look for any fields that are enums and attach the possible enum values
  // so we can put them in generated test files
  model.fields.forEach((field) => {
    const fieldEnum = schema.enums.find((e) => field.type === e.name)
    if (fieldEnum) {
      field.enumValues = fieldEnum.values
    }
  })

  // Memoize based on the model name
  schemaMemo[modelName] = model

  return model
}

/**
 * Returns the enum defined with the given `name` parsed from the
 * `schema.prisma` of the target application. If no `name` is given
 * then all enum definitions are returned
 */
export const getEnum = async (name) => {
  const schema = await getSchemaDefinitions()
  if (!name) {
    return schema.metadata.datamodel.enums
  }

  const model = schema.datamodel.enums.find((model) => model.name === name)
  if (!model) {
    throw new Error(
      `No enum schema definition found for \`${name}\` in schema.prisma file`,
    )
  }

  return model
}

/*
 * Returns the data model defined in `schema.prisma` (models, enums, etc.)
 */
export const getDataModel = (path = getPaths().api.dbSchema) => {
  return getSchemaPrisma(path)
}

/*
 * Returns the DMMF defined by `prisma` resolving the relevant `schema.prisma` path.
 */
export const getSchemaDefinitions = () => {
  return getDMMF({ datamodel: getDataModel() })
}

/*
 * Returns the config info defined in `schema.prisma` (provider, datasource, etc.)
 */
export const getSchemaConfig = () =>
  getConfig({
    datamodel: getDataModel(),
  })

export async function verifyModelName(options) {
  const modelName =
    (await getExistingModelName(options.name)) ||
    (await getExistingModelName(singularize(options.name)))

  if (modelName === undefined) {
    throw new Error(
      `"${options.name}" model not found, check if it exists in "./api/db/schema.prisma"`,
    )
  }

  await ensureUniquePlural({
    model: modelName,
    isDestroyer: options.isDestroyer,
    forcePrompt: isPlural(modelName),
  })

  return { ...options, name: modelName }
}
