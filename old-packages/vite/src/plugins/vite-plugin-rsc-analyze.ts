import path from 'node:path'

import * as swc from '@swc/core'
import type { Plugin } from 'vite'

export function rscAnalyzePlugin(
  clientEntryCallback: (id: string) => void,
  serverEntryCallback: (id: string) => void,
): Plugin {
  return {
    name: 'redwood-rsc-analyze-plugin',
    transform(code, id) {
      const ext = path.extname(id)

      if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        // TODO (RSC): In a larger codebase, see if we'd be any faster by doing
        // a simple code.includes('use client') || code.includes('use server')
        // check first before parsing the code

        const mod = swc.parseSync(code, {
          syntax: ext === '.ts' || ext === '.tsx' ? 'typescript' : 'ecmascript',
          tsx: ext === '.tsx',
        })

        let directiveFound = false

        // The `item`s in mod.body are the top-level statements in the file
        for (const item of mod.body) {
          if (
            item.type === 'ExpressionStatement' &&
            item.expression.type === 'StringLiteral'
          ) {
            if (item.expression.value === 'use client') {
              clientEntryCallback(id)
              directiveFound = true
            } else if (item.expression.value === 'use server') {
              serverEntryCallback(id)
              directiveFound = true
            }
          }
        }

        if (
          !directiveFound &&
          code.includes('use server') &&
          containsServerAction(mod)
        ) {
          serverEntryCallback(id)
        }
      }

      return code
    },
  }
}

function isServerAction(
  node:
    | swc.FunctionDeclaration
    | swc.FunctionExpression
    | swc.ArrowFunctionExpression,
): boolean {
  return (
    node.body?.type === 'BlockStatement' &&
    node.body.stmts.some(
      (s) =>
        s.type === 'ExpressionStatement' &&
        s.expression.type === 'StringLiteral' &&
        s.expression.value === 'use server',
    )
  )
}

function isFunctionDeclaration(
  node: swc.Node,
): node is swc.FunctionDeclaration {
  return node.type === 'FunctionDeclaration'
}

function isFunctionExpression(node: swc.Node): node is swc.FunctionExpression {
  return node.type === 'FunctionExpression'
}

function isArrowFunctionExpression(
  node: swc.Node,
): node is swc.ArrowFunctionExpression {
  return node.type === 'ArrowFunctionExpression'
}

function containsServerAction(mod: swc.Module) {
  function walk(node: swc.Node): boolean {
    if (
      isFunctionDeclaration(node) ||
      isFunctionExpression(node) ||
      isArrowFunctionExpression(node)
    ) {
      if (isServerAction(node)) {
        return true
      }
    }

    return Object.values(node).some((value) =>
      (Array.isArray(value) ? value : [value]).some((v) => {
        if (typeof v?.type === 'string') {
          return walk(v)
        }

        if (typeof v?.expression?.type === 'string') {
          return walk(v.expression)
        }

        return false
      }),
    )
  }

  return walk(mod)
}
