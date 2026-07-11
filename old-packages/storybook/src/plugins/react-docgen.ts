import path from 'path'

import { createFilter } from '@rollup/pluginutils'
import MagicString from 'magic-string'
import type { Documentation } from 'react-docgen'
import {
  ERROR_CODES,
  parse,
  builtinHandlers as docgenHandlers,
  builtinResolvers as docgenResolver,
  builtinImporters as docgenImporters,
} from 'react-docgen'
import type { PluginOption } from 'vite'

import actualNameHandler from './docgen-handlers/actualNameHandler'

type DocObj = Documentation & { actualName: string }

// TODO: None of these are able to be overridden, so `default` is aspirational here.
const defaultHandlers = Object.values(docgenHandlers).map((handler) => handler)
const defaultResolver = new docgenResolver.FindExportedDefinitionsResolver()
const defaultImporter = docgenImporters.fsImporter
const handlers = [...defaultHandlers, actualNameHandler]

type Options = {
  include?: string | RegExp | (string | RegExp)[]
  exclude?: string | RegExp | (string | RegExp)[]
}

export function reactDocgen({
  include = /\.(tsx?|jsx?)$/,
  exclude = [/node_modules\/.*/],
}: Options = {}): PluginOption {
  const cwd = process.cwd()
  const filter = createFilter(include, exclude)

  return {
    name: 'storybook:react-docgen-plugin',
    enforce: 'pre',
    async transform(src: string, id: string) {
      const relPath = path.relative(cwd, id)
      if (!filter(relPath)) {
        return
      }

      try {
        const docgenResults = parse(src, {
          resolver: defaultResolver,
          handlers,
          importer: defaultImporter,
          filename: id,
        }) as DocObj[]
        const s = new MagicString(src)

        docgenResults.forEach((info) => {
          const { actualName, ...docgenInfo } = info
          if (actualName) {
            const docNode = JSON.stringify(docgenInfo)
            s.append(`;${actualName}.__docgenInfo=${docNode}`)
          }
        })

        return {
          code: s.toString(),
          map: s.generateMap(),
        }
      } catch (e: any) {
        // Ignore the error when react-docgen cannot find a react component
        if (e.code === ERROR_CODES.MISSING_DEFINITION) {
          return
        }
        throw e
      }
    },
  }
}
