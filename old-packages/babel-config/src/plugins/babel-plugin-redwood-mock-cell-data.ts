import fs from 'fs'
import path from 'path'

import type { types } from '@babel/core'
import type { PluginObj } from '@babel/core'
import { parse as babelParse } from '@babel/parser'
import type { ParserPlugin } from '@babel/parser'
import traverse from '@babel/traverse'
import fg from 'fast-glob'
import { parse as graphqlParse, Kind } from 'graphql'

export default function ({ types: t }: { types: typeof types }): PluginObj {
  let nodesToRemove: any[] = []
  let nodesToInsert: any[] = []

  // export const standard = ${ex}
  const createExportStandard = (
    ex: types.CallExpression | types.ArrowFunctionExpression,
  ) =>
    t.exportNamedDeclaration(
      t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier('standard'), ex),
      ]),
    )

  return {
    name: 'babel-plugin-redwood-mock-cell-data',

    visitor: {
      Program: {
        enter() {
          nodesToRemove = []
          nodesToInsert = []
        },
        exit(p) {
          for (const n of nodesToRemove) {
            n.remove()
          }
          // Insert at the top of the file
          p.node.body.unshift(...nodesToInsert)
        },
      },
      ExportNamedDeclaration(p, state: { file?: any }) {
        // This converts a standard export into a "mockGraphQLQuery" by automatically:
        // Determining the query operation name for `QUERY` and,
        // wrapping the exported data in `afterQuery`
        //
        // Rules:
        // 1. Must be a *.mock.[ts,js] file.
        // 2. That has a named export called "standard".
        // 3. That are adjacent to a Cell.
        // 4. The Cell has a operation name for the QUERY export.

        const d = p.node.declaration

        let mockFunction

        // Only auto-mock the standard export

        switch (d?.type) {
          case 'VariableDeclaration':
            // If its an arrow function
            // or export standard = function()
            {
              const standardMockExport = d.declarations[0]
              const id = standardMockExport.id as types.Identifier
              const exportName = id?.name

              if (exportName !== 'standard') {
                return
              }

              const mockFunctionMaybe = standardMockExport?.init
              if (!mockFunctionMaybe) {
                return
              }

              // If they're not exporting a function, blow up
              if (
                mockFunctionMaybe.type !== 'ArrowFunctionExpression' &&
                mockFunctionMaybe.type !== 'FunctionExpression'
              ) {
                throw new Error(
                  `\n \n Mock Error: You must export your standard mock as a function \n \n`,
                )
              }

              mockFunction = mockFunctionMaybe
            }
            break

          case 'FunctionDeclaration':
            {
              const exportName = d.id?.name

              if (exportName !== 'standard') {
                return
              }

              // if its a normal function export e.g. export function standard()
              // convert the named FunctionDeclaration to an arrow func i.e. (..args)=>{//originalbody here}
              mockFunction = t.arrowFunctionExpression(d.params, d.body)
            }
            break

          default:
            // If it isn't a mock function called standard, ignore it
            return
        }

        // Find the model of the Cell that is in the same directory.
        const dirname = path.dirname(state.file.opts.filename)
        const cellName = path.basename(dirname)

        const [cellPath] = fg.sync(`${cellName}.{js,jsx,ts,tsx}`, {
          cwd: dirname,
          absolute: true,
          ignore: ['node_modules'],
        })

        if (!cellPath) {
          return
        }

        const cellMetadata = getCellMetadata(cellPath)

        if (cellMetadata.hasDefaultExport || !cellMetadata.hasQueryExport) {
          return
        }

        // mockGraphQLQuery(<operationName>, <mockFunction>)
        const mockGraphQLCall = t.callExpression(
          t.identifier('mockGraphQLQuery'),
          [t.stringLiteral(cellMetadata.operationName), mockFunction],
        )

        // Delete original "export const standard"
        nodesToRemove = [...nodesToRemove, p]

        // + import { afterQuery } from './${cellFileName}'
        // + export const standard = () => afterQuery(...)
        if (cellMetadata.hasAfterQueryExport) {
          const importAfterQuery = t.importDeclaration(
            [
              t.importSpecifier(
                t.identifier('afterQuery'),
                t.identifier('afterQuery'),
              ),
            ],
            t.stringLiteral(`./${path.basename(cellPath)}`),
          )

          nodesToInsert = [
            ...nodesToInsert,
            importAfterQuery,
            createExportStandard(
              t.arrowFunctionExpression(
                [],
                t.callExpression(t.identifier('afterQuery'), [
                  t.callExpression(mockGraphQLCall, []),
                ]),
              ),
            ),
          ]
        } else {
          // + export const standard = mo
          nodesToInsert = [
            ...nodesToInsert,
            createExportStandard(mockGraphQLCall),
          ]
        }
      },
    },
  }
}

export const getCellMetadata = (p: string) => {
  const ast = getCellAst(p)

  let hasDefaultExport = false
  const namedExports: NamedExports[] = []
  let operation

  traverse(ast, {
    ExportDefaultDeclaration() {
      hasDefaultExport = true
      return
    },
    ExportNamedDeclaration(path) {
      // Re-exports from other modules
      // Eg: export { a, b } from './module'
      const specifiers = path.node?.specifiers

      if (specifiers.length) {
        for (const s of specifiers) {
          const id = s.exported as types.Identifier
          namedExports.push({
            name: id.name,
            type: 're-export',
          })
        }
        return
      }

      const declaration = path.node.declaration

      if (!declaration) {
        return
      }

      if (declaration.type === 'VariableDeclaration') {
        const id = declaration.declarations[0].id as types.Identifier

        namedExports.push({
          name: id.name,
          type: 'variable',
        })
      } else if (declaration.type === 'FunctionDeclaration') {
        namedExports.push({
          name: declaration?.id?.name as string,
          type: 'function',
        })
      } else if (declaration.type === 'ClassDeclaration') {
        namedExports.push({
          name: declaration?.id?.name as string,
          type: 'class',
        })
      }
    },
    TaggedTemplateExpression(path) {
      // @ts-expect-error wip
      if (path.parent?.id?.name !== 'QUERY') {
        return
      }

      operation = path.node.quasi.quasis[0].value.raw
    },
  })

  const hasQueryExport = namedExports.find(({ name }) => name === 'QUERY')
  const hasAfterQueryExport = namedExports.find(
    ({ name }) => name === 'afterQuery',
  )

  let operationName = ''

  if (operation) {
    const document = graphqlParse(operation)

    for (const definition of document.definitions) {
      if (
        definition.kind === Kind.OPERATION_DEFINITION &&
        definition.name?.value
      ) {
        operationName = definition.name.value
      }
    }
  }

  return {
    hasDefaultExport,
    namedExports,
    hasQueryExport,
    hasAfterQueryExport,
    operationName,
  }
}

function getCellAst(filePath: string): types.Node {
  const code = fs.readFileSync(filePath, 'utf-8')
  const plugins = ['typescript', 'jsx'].filter(Boolean) as ParserPlugin[]

  try {
    return babelParse(code, {
      sourceType: 'module',
      plugins,
    })
  } catch (e: any) {
    console.error(`Error parsing: ${filePath}`)
    console.error(e)
    throw new Error(e?.message) // we throw, so typescript doesn't complain about returning
  }
}

interface NamedExports {
  name: string
  type: 're-export' | 'variable' | 'function' | 'class'
}
