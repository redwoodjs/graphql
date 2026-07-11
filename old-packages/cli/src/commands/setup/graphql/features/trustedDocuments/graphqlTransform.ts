import type { FileInfo, API } from 'jscodeshift'

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift
  const root = j(file.source)

  const allImports = root.find(j.ImportDeclaration)

  const hasStoreImport = allImports.some((i) => {
    return i.get('source').value.value === 'src/lib/trustedDocumentsStore'
  })

  if (!hasStoreImport) {
    allImports
      .at(-1)
      .insertAfter(
        j.importDeclaration(
          [j.importSpecifier(j.identifier('store'))],
          j.literal('src/lib/trustedDocumentsStore'),
        ),
      )
  }

  const createGraphQLHandlerCalls = root.find(j.CallExpression, {
    callee: {
      name: 'createGraphQLHandler',
    },
  })

  if (createGraphQLHandlerCalls.length === 0) {
    throw new Error(
      "Error updating your graphql handler function. You'll have to do it manually. " +
        "(Couldn't find a call to `createGraphQLHandler`)",
    )
  }

  const existingTrustedDocumentsProperty = createGraphQLHandlerCalls.find(
    j.ObjectProperty,
    {
      key: {
        name: 'trustedDocuments',
      },
    },
  )

  if (existingTrustedDocumentsProperty.length === 0) {
    const storeProperty = j.objectProperty(
      j.identifier('store'),
      j.identifier('store'),
    )
    storeProperty.shorthand = true

    createGraphQLHandlerCalls
      .get(0)
      .node.arguments[0].properties.push(
        j.objectProperty(
          j.identifier('trustedDocuments'),
          j.objectExpression([storeProperty]),
        ),
      )
  }

  return root.toSource()
}
