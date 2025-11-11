import type { types } from '@babel/core'
import { parse, traverse, template } from '@babel/core'
import generate from '@babel/generator'

export const wrapVercelHandler = (code: string) => {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: [
      ['@babel/plugin-transform-typescript', { isTSX: true }],
      ['@babel/plugin-syntax-jsx', {}],
    ],
  })

  if (!ast) {
    return code
  }

  let hasHandler = false
  traverse(ast, {
    ExportNamedDeclaration(path) {
      if (
        path.node.declaration?.type === 'VariableDeclaration' &&
        path.node.declaration.declarations[0].id.type === 'Identifier' &&
        path.node.declaration.declarations[0].id.name === 'handler'
      ) {
        hasHandler = true
        // Rename the original handler
        path.node.declaration.declarations[0].id.name = '_redwoodHandler'

        // Create the new wrapped handler
        const wrappedHandler = template.ast(`
          import { webRequestToLambdaEvent, lambdaResponseToWebResponse } from '@redwoodjs/api/vercel'
          export const handler = async (req, context) => {
            const event = await webRequestToLambdaEvent(req, context)
            const response = await _redwoodHandler(event, context)
            return lambdaResponseToWebResponse(response)
          }
        `)

        // Add the new handler after the renamed one
        path.insertAfter(wrappedHandler)

        // Add the import statement at the top of the file
        const importStatement = template.ast(`
          import { webRequestToLambdaEvent, lambdaResponseToWebResponse } from '@redwoodjs/api/vercel'
        `)
        const program = path.findParent((p) => p.isProgram())
        if (program) {
          ;(program.node as types.Program).body.unshift(importStatement)
        }
      }
    },
  })

  if (!hasHandler) {
    return code
  }

  return generate(ast).code
}
