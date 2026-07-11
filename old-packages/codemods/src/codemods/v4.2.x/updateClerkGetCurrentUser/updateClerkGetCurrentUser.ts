import type { FileInfo, API } from 'jscodeshift'

const newReturn = `userWithoutPrivateMetadata`
const destructureStatement = `const { privateMetadata, ...${newReturn} } = decoded`

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift
  const ast = j(file.source)

  // Insert `const { privateMetadata, ...userWithoutPrivateMetadata } = decoded` after `const { roles } = parseJWT({ decoded })`
  //
  // So, before...
  //
  // ```ts
  // const { roles } = parseJWT({ decoded })
  // ```
  //
  // and after...
  //
  // ```ts
  // const { roles } = parseJWT({ decoded })
  //
  // const { privateMetadata, ...userWithoutPrivateMetadata } = decoded
  // ```
  const parseJWTStatement = ast.find(j.VariableDeclaration, {
    declarations: [
      {
        type: 'VariableDeclarator',
        init: {
          type: 'CallExpression',
          callee: {
            name: 'parseJWT',
          },
        },
      },
    ],
  })

  parseJWTStatement.insertAfter(destructureStatement)

  // Swap `decoded` with `userWithoutPrivateMetadata` in the two return statements
  ast
    .find(j.ReturnStatement, {
      argument: {
        type: 'ObjectExpression',
        properties: [
          {
            type: 'SpreadElement',
            argument: {
              name: 'decoded',
            },
          },
        ],
      },
    })
    .replaceWith((path) => {
      if (path.value.argument?.type !== 'ObjectExpression') {
        return path.value
      }

      // Filter out the spread element with 'decoded'
      const properties = path.value.argument.properties.filter((property) => {
        return !(
          property.type === 'SpreadElement' &&
          property.argument.type === 'Identifier' &&
          property.argument.name === 'decoded'
        )
      })

      // Create a new spread element with the new name
      const spreadElement = j.spreadProperty(j.identifier(newReturn))
      properties.push(spreadElement)

      return j.returnStatement(j.objectExpression(properties))
    })

  return ast.toSource({
    trailingComma: true,
    quote: 'single',
    lineTerminator: '\n',
  })
}
