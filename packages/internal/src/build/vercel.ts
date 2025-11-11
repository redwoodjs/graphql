import type { types } from '@babel/core'
import { parse, traverse, template } from '@babel/core'
import generate from '@babel/generator'

export const validateFluidHandler = (code: string, filePath: string): void => {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: [
      ['@babel/plugin-transform-typescript', { isTSX: true }],
      ['@babel/plugin-syntax-jsx', {}],
    ],
  })

  if (!ast) {
    return
  }

  let hasLegacyHandler = false
  let hasFluidHandlers = false

  traverse(ast, {
    ExportNamedDeclaration(path) {
      if (
        path.node.declaration?.type === 'VariableDeclaration' &&
        path.node.declaration.declarations[0].id.type === 'Identifier' &&
        path.node.declaration.declarations[0].id.name === 'handler'
      ) {
        hasLegacyHandler = true
      }

      const httpMethods = [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
        'HEAD',
      ]
      if (
        path.node.declaration?.type === 'VariableDeclaration' &&
        path.node.declaration.declarations[0].id.type === 'Identifier' &&
        httpMethods.includes(path.node.declaration.declarations[0].id.name)
      ) {
        hasFluidHandlers = true
      }
    },
    ExportDefaultDeclaration() {
      hasFluidHandlers = true
    },
  })

  if (hasLegacyHandler && !hasFluidHandlers) {
    throw new Error(
      `Vercel Fluid mode requires Request/Response handlers.\n\n` +
        `Found legacy Lambda handler in: ${filePath}\n\n` +
        `Fluid functions must export named HTTP method handlers (GET, POST, etc.) or a default handler:\n\n` +
        `  export const GET = async (request: Request) => {\n` +
        `    return new Response(JSON.stringify({ data: 'example' }), {\n` +
        `      status: 200,\n` +
        `      headers: { 'Content-Type': 'application/json' },\n` +
        `    })\n` +
        `  }\n\n` +
        `For migration guide, see: https://redwoodjs.com/docs/vercel-fluid`,
    )
  }
}

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
        const wrappedHandlerCode = `
          export const handler = async (req, context) => {
            const event = await webRequestToLambdaEvent(req, context)
            const response = await _redwoodHandler(event, context)
            return lambdaResponseToWebResponse(response)
          }
        `
        const wrappedHandler = template.ast(
          wrappedHandlerCode,
        ) as types.Statement

        // Add the new handler after the renamed one
        path.insertAfter(wrappedHandler)

        // Add the import statement at the top of the file
        const importCode = `import { webRequestToLambdaEvent, lambdaResponseToWebResponse } from '@redwoodjs/api/vercel'`
        const importStatement = template.ast(importCode) as types.Statement
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
