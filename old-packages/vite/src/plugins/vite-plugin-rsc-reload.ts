import path from 'node:path'

import * as swc from '@swc/core'
import type { Plugin } from 'vite'

export function rscReloadPlugin(fn: (type: 'full-reload') => void): Plugin {
  let enabled = false
  const isClientEntry = (id: string, code: string) => {
    const ext = path.extname(id)
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      // @MARK: We're using swc here, because that's what the code that I
      // copy/pasted used. It works, but it's another dependency, and a
      // slightly different syntax to get used to compared to babel or other
      // AST parsing libraries we use. So maybe, in the future, we change this
      // to something else that we use in other places in this package.
      const mod = swc.parseSync(code, {
        syntax: ext === '.ts' || ext === '.tsx' ? 'typescript' : 'ecmascript',
        tsx: ext === '.tsx',
      })

      for (const item of mod.body) {
        if (
          item.type === 'ExpressionStatement' &&
          item.expression.type === 'StringLiteral' &&
          item.expression.value === 'use client'
        ) {
          return true
        }
      }
    }

    return false
  }

  return {
    name: 'reload-plugin',
    configResolved(config) {
      if (config.mode === 'development') {
        enabled = true
      }
    },
    async handleHotUpdate(ctx) {
      if (!enabled) {
        return []
      }

      if (ctx.modules.length && !isClientEntry(ctx.file, await ctx.read())) {
        return fn('full-reload')
      } else {
        return []
      }
    },
  }
}
