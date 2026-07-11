import type { FileInfo, API } from 'jscodeshift'

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift
  const ast = j(file.source)

  // Insert `import vitePluginOgImageGen from '@redwoodjs/ogimage-gen/plugin'` at the top of the file
  const needsImport =
    ast.find(j.ImportDeclaration, {
      specifiers: [
        {
          type: 'ImportDefaultSpecifier',
          local: {
            name: 'vitePluginOgImageGen',
          },
        },
      ],
      source: {
        value: '@redwoodjs/ogimage-gen/plugin',
        type: 'StringLiteral',
      },
    }).length === 0
  if (needsImport) {
    ast
      .find(j.ImportDeclaration)
      .at(0)
      .insertBefore(
        j.importDeclaration(
          [j.importDefaultSpecifier(j.identifier('vitePluginOgImageGen'))],
          j.stringLiteral('@redwoodjs/ogimage-gen/plugin'),
        ),
      )
  }

  // Find the `viteConfig` variable
  const viteConfigVariable = ast.find(j.VariableDeclaration, {
    declarations(value) {
      if (value.length !== 1) {
        return false
      }

      const declaration = value[0]
      if (declaration.type !== 'VariableDeclarator') {
        return false
      }

      return (
        declaration.id.type === 'Identifier' &&
        declaration.id.name === 'viteConfig'
      )
    },
  })

  if (viteConfigVariable.length === 0) {
    throw new Error('Could not find the `viteConfig` variable')
  }

  // Find the `plugins` array in the `viteConfig` variable
  const pluginsArray = viteConfigVariable.find(j.ObjectExpression, {
    properties(value) {
      if (!value) {
        return false
      }

      return value.some(
        (property) =>
          property.type === 'ObjectProperty' &&
          property.key.type === 'Identifier' &&
          property.key.name === 'plugins',
      )
    },
  })

  if (pluginsArray.length === 0) {
    throw new Error(
      'Could not find the `plugins` array in the `viteConfig` variable',
    )
  }

  // Add `vitePluginOgImageGen()` to the `plugins` array
  pluginsArray
    .find(j.ArrayExpression)
    .at(0)
    .replaceWith((nodePath) => {
      const elements = nodePath.value.elements
      elements.push(j.callExpression(j.identifier('vitePluginOgImageGen'), []))
      return nodePath.value
    })

  return ast.toSource()
}
