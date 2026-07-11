import path from 'node:path'

// Babel 7 packages are CJS, and need to be imported as such
import babelGenerator from '@babel/generator'
const { default: generate } = babelGenerator
import { parse as babelParse } from '@babel/parser/index.cjs'
import babelTraverse from '@babel/traverse'
const { default: traverse } = babelTraverse
import * as t from '@babel/types'
import type { Plugin } from 'vite'
import { normalizePath } from 'vite'

import { getPaths } from '@redwoodjs/project-config'

/**
 * Transform `import { Router } from '@redwoodjs/router/RscRouter'` to
 * `import { Router } from '@redwoodjs/router/SsrRouter'`
 */
export function rscSsrRouterImport(): Plugin {
  // Vite IDs are always normalized and so we avoid windows path issues
  // by normalizing the path here.
  const routesFileId = normalizePath(getPaths().web.routes)

  return {
    name: 'rsc-ssr-router-import',
    transform: async function (code, id, options) {
      // We only care about the routes file
      if (!options?.ssr || id !== routesFileId) {
        return null
      }

      // Parse the code as AST
      const ext = path.extname(id)
      const plugins: any[] = []

      if (ext === '.jsx') {
        plugins.push('jsx')
      }

      const ast = babelParse(code, {
        sourceType: 'unambiguous',
        plugins,
      })

      traverse(ast, {
        ImportDeclaration(path) {
          const source = path.node.source.value
          if (source === '@redwoodjs/router/RscRouter') {
            path.node.source = t.stringLiteral('@redwoodjs/router/SsrRouter')
          }
        },
      })

      return generate(ast).code
    },
  }
}
