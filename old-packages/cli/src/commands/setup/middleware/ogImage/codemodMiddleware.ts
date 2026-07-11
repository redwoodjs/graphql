import type { FileInfo, API } from 'jscodeshift'

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift
  const ast = j(file.source)

  // Insert `import { OgImageMiddleware } from '@redwoodjs/ogimage-gen/middleware'` at the top of the file
  const needsImport =
    ast.find(j.ImportDeclaration, {
      specifiers: [
        {
          type: 'ImportDefaultSpecifier',
          local: {
            name: 'OgImageMiddleware',
          },
        },
      ],
      source: {
        value: '@redwoodjs/ogimage-gen/middleware',
        type: 'StringLiteral',
      },
    }).length === 0
  if (needsImport) {
    ast
      .find(j.ImportDeclaration)
      .at(0)
      .insertBefore(
        j.importDeclaration(
          [j.importDefaultSpecifier(j.identifier('OgImageMiddleware'))],
          j.stringLiteral('@redwoodjs/ogimage-gen/middleware'),
        ),
      )
  }

  // Find the `registerMiddleware` function
  const registerMiddleware = ast.find(j.ExportNamedDeclaration, {
    declaration(value) {
      if (!value) {
        return false
      }

      // Handle VariableDeclaration type
      if (value.type === 'VariableDeclaration') {
        return (
          value.declarations[0].type === 'VariableDeclarator' &&
          value.declarations[0].id.type === 'Identifier' &&
          value.declarations[0].id.name === 'registerMiddleware'
        )
      }

      // Handle FunctionDeclaration type
      if (value.type === 'FunctionDeclaration') {
        return (
          value.id?.type === 'Identifier' &&
          value.id?.name === 'registerMiddleware'
        )
      }

      return false
    },
  })

  const appObjectProperty = j.objectProperty(
    j.identifier('App'),
    j.identifier('App'),
  )
  appObjectProperty.shorthand = true
  const documentObjectProperty = j.objectProperty(
    j.identifier('Document'),
    j.identifier('Document'),
  )
  documentObjectProperty.shorthand = true
  const ogMwDeclaration = j.variableDeclaration('const', [
    j.variableDeclarator(
      j.identifier('ogMw'),
      j.newExpression(j.identifier('OgImageMiddleware'), [
        j.objectExpression([appObjectProperty, documentObjectProperty]),
      ]),
    ),
  ])
  const arrowFunc = j.arrowFunctionExpression(
    [],
    j.blockStatement([
      ogMwDeclaration,
      j.returnStatement(j.arrayExpression([j.identifier('ogMw')])),
    ]),
  )
  arrowFunc.async = true

  const needsCompleteRegisterMiddleware = registerMiddleware.length === 0
  if (needsCompleteRegisterMiddleware) {
    // If `registerMiddleware` is not defined, define it with the `OgImageMiddleware` included
    ast
      .find(j.ExportNamedDeclaration)
      .at(-1)
      .insertAfter(
        j.exportNamedDeclaration(
          j.variableDeclaration('const', [
            j.variableDeclarator(j.identifier('registerMiddleware'), arrowFunc),
          ]),
        ),
      )
  } else {
    // Add `OgImageMiddleware` to the existing `registerMiddleware` function
    const returnStatement = registerMiddleware.find(j.ReturnStatement, {
      argument: {
        type: 'ArrayExpression',
      },
    })
    if (returnStatement.length === 0) {
      throw new Error(
        'Could not find the return statement in the existing registerMiddleware function',
      )
    }

    returnStatement.insertBefore(ogMwDeclaration)

    returnStatement
      .find(j.ArrayExpression)
      .at(0)
      .replaceWith((nodePath) => {
        const elements = nodePath.value.elements
        elements.push(j.identifier('ogMw'))
        return nodePath.value
      })
  }

  return ast.toSource()
}
