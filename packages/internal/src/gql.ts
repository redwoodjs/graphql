import fs from 'fs'

import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader'
import { loadSchema } from '@graphql-tools/load'
import {
  visit,
  DocumentNode,
  OperationTypeNode,
  OperationDefinitionNode,
  FieldNode,
  parse,
  InlineFragmentNode,
} from 'graphql'

import { getPaths } from './paths'

interface Operation {
  operation: OperationTypeNode
  name: string | undefined
  fields: Array<string | Field>
}

interface Field {
  string: Array<string | Field>
}

export const parseGqlQueryToAst = (gqlQuery: string) => {
  const ast = parse(gqlQuery)
  return parseDocumentAST(ast)
}

export const parseDocumentAST = (document: DocumentNode) => {
  const operations: Array<Operation> = []

  visit(document, {
    OperationDefinition(node: OperationDefinitionNode) {
      const fields: any[] = []

      node.selectionSet.selections.forEach((field) => {
        fields.push(getFields(field as FieldNode))
      })

      operations.push({
        operation: node.operation,
        name: node.name?.value,
        fields,
      })
    },
  })

  return operations
}

const getFields = (field: FieldNode): any => {
  // base
  if (!field.selectionSet) {
    return field.name.value
  } else {
    const obj: Record<string, FieldNode[]> = {
      [field.name.value]: [],
    }

    const lookAtFieldNode = (node: FieldNode | InlineFragmentNode): void => {
      node.selectionSet?.selections.forEach((subField) => {
        switch (subField.kind) {
          case 'Field':
            obj[field.name.value].push(getFields(subField as FieldNode))
            break
          case 'FragmentSpread':
            // TODO: Maybe this will also be needed, right now it's accounted for to not crash in the tests
            break
          case 'InlineFragment':
            lookAtFieldNode(subField)
        }
      })
    }

    lookAtFieldNode(field)

    return obj
  }
}

export const listQueryTypeFieldsFromGeneratedSchema = async () => {
  const schemaPath = getPaths().generated.schema

  if (fs.existsSync(schemaPath)) {
    const schema = await loadSchema(schemaPath, {
      loaders: [new GraphQLFileLoader()],
    })

    const queryTypeFields = schema.getQueryType()?.getFields()

    if (queryTypeFields) {
      return Object.keys(queryTypeFields)
    }
  }

  // Return empty array if no schema found
  return []
}
