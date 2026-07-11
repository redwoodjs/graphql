import pascalcase from 'pascalcase'

import { listQueryTypeFieldsInProject } from '@redwoodjs/internal/dist/gql'

export const getCellOperationNames = async () => {
  const { getProject } = await import('@redwoodjs/structure')

  return getProject()
    .cells.map((x) => {
      return x.queryOperationName
    })
    .filter(Boolean)
}

export const uniqueOperationName = async (
  name,
  { index = 1, list = false },
) => {
  let operationName = pascalcase(
    index <= 1 ? `find_${name}_query` : `find_${name}_query_${index}`,
  )

  if (list) {
    operationName =
      index <= 1
        ? `${pascalcase(name)}Query`
        : `${pascalcase(name)}Query_${index}`
  }

  const cellOperationNames = await getCellOperationNames()
  if (!cellOperationNames.includes(operationName)) {
    return operationName
  }
  return uniqueOperationName(name, { index: index + 1 })
}

export const operationNameIsUnique = async (operationName) => {
  const cellOperationNames = await getCellOperationNames()
  return !cellOperationNames.includes(operationName)
}

export const getIdType = (model) => {
  return model.fields.find((field) => field.isId)?.type
}

export const getIdName = (model) => {
  return model.fields.find((field) => field.isId)?.name
}
/**
 *
 * This function checks the project for the field name supplied,
 * assuming the schema file has been generated in .redwood/schema.graphql
 * @example
 * checkProjectForQueryField('blogPost') => true/false
 * checkProjectForQueryField('redwood') => true
 *
 **/
export const checkProjectForQueryField = async (queryFieldName) => {
  const queryFields = await listQueryTypeFieldsInProject()

  return queryFields.includes(queryFieldName)
}
