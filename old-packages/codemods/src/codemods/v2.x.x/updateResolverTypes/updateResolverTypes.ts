import type { API, FileInfo, TSTypeAnnotation } from 'jscodeshift'
import { Identifier, TSTypeReference } from 'jscodeshift'

const isTypeReference = (
  typeAnnotation: TSTypeAnnotation['typeAnnotation'],
): typeAnnotation is TSTypeReference => TSTypeReference.check(typeAnnotation)

const getTypeName = (node: TSTypeReference) => {
  return Identifier.check(node.typeName) ? node.typeName.name : null
}

const isWrappedInPartial = (node: TSTypeAnnotation) => {
  const typeAnnotation = node.typeAnnotation

  return (
    isTypeReference(typeAnnotation) && getTypeName(typeAnnotation) === 'Partial'
  )
}

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift
  const ast = j(file.source)

  const findImportFromGqlTypes = (importName: string) => {
    return ast
      .find(j.ImportDeclaration, {
        source: { value: 'types/graphql' },
      })
      .find(j.ImportSpecifier, { imported: { name: importName } })
  }

  const addToGqlTypesImports = (importName: string) => {
    ast
      .find(j.ImportDeclaration, {
        source: { value: 'types/graphql' },
      })
      .forEach((importStatement) => {
        importStatement.node.specifiers?.push(
          j.importSpecifier(j.identifier(importName)),
        )
      })
  }

  ast.find(j.TSTypeAnnotation).forEach((path) => {
    const typeAnnotationNode = path.node

    if (
      // If it's a MutationResolvers['x'] or QueryResolvers['x']
      j.TSIndexedAccessType.check(typeAnnotationNode.typeAnnotation)
    ) {
      return
    }

    if (
      !isWrappedInPartial(typeAnnotationNode) &&
      isTypeReference(typeAnnotationNode.typeAnnotation)
    ) {
      const originalTypeName = getTypeName(typeAnnotationNode.typeAnnotation)

      if (
        !originalTypeName ||
        !originalTypeName.includes('Resolvers') ||
        findImportFromGqlTypes(originalTypeName).length === 0 || // check if it was imported from types/graphql
        originalTypeName.includes('RelationResolvers') // check if it's already a RelationResolver
      ) {
        // Skip other type annotations!
        return
      }

      const newTypeName = originalTypeName.replace(
        'Resolvers',
        'RelationResolvers',
      )

      console.log(`Converting ${originalTypeName} to ${newTypeName}....`)

      path.replace(
        j.tsTypeAnnotation(j.tsTypeReference(j.identifier(newTypeName))),
      )

      findImportFromGqlTypes(originalTypeName)?.remove()
      addToGqlTypesImports(newTypeName)
    }
  })

  return ast.toSource()
}
