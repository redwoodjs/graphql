import { parse } from 'path'

import type { PluginObj, types } from '@babel/core'

// This wraps a file that has a suffix of `Cell` in Redwood's `createCell` higher
// order component. The HOC deals with the lifecycle methods during a GraphQL query.
//
// ```js
// import { createCell } from '@redwoodjs/web'
// <YOUR CODE>
// export default createCell({ QUERY, Loading, Success, Failure, isEmpty, Empty, beforeQuery, afterQuery, displayName })
// ```
//
// To debug the output of the plugin, you can use the following:
// ```
// import generate from '@babel/generator'
// // ...
// console.log(generate(path.node).code)
// ```

// A cell can export the declarations below.
const EXPECTED_EXPORTS_FROM_CELL = [
  'beforeQuery',
  'QUERY',
  'data',
  'isEmpty',
  'afterQuery',
  'Loading',
  'Success',
  'Failure',
  'Empty',
]

export default function ({ types: t }: { types: typeof types }): PluginObj {
  // This array will collect exports from the Cell file during
  // ExportNamedDeclaration
  // - collected exports will then be passed to `createCell`
  // - The array is reset every time we `enter` a new Program
  let exportNames: string[] = []
  let hasDefaultExport = false

  return {
    name: 'babel-plugin-redwood-cell',
    visitor: {
      ExportDefaultDeclaration() {
        hasDefaultExport = true
      },
      ExportNamedDeclaration(path) {
        const declaration = path.node.declaration

        if (!declaration) {
          return
        }

        let name
        if (declaration.type === 'VariableDeclaration') {
          const id = declaration.declarations[0].id as types.Identifier
          name = id.name
        }
        if (declaration.type === 'FunctionDeclaration') {
          name = declaration?.id?.name
        }

        if (name && EXPECTED_EXPORTS_FROM_CELL.includes(name)) {
          exportNames.push(name)
        }
      },
      Program: {
        enter() {
          // Reset variables as they're still in scope from the previous file
          // babel transformed in the same process
          exportNames = []
          hasDefaultExport = false
        },
        exit(path) {
          const hasQueryOrDataExport =
            exportNames.includes('QUERY') || exportNames.includes('data')

          // If the file already has a default export then
          //   1. It's likely not a cell, or it's a cell that's already been
          //      wrapped in `createCell`
          //   2. If we added another default export we'd be breaking JS module
          //      rules. There can only be one default export.
          // If there's no `QUERY` or `data` export it's not a valid cell
          if (hasDefaultExport || !hasQueryOrDataExport) {
            return
          }

          // TODO (RSC): When we want to support `data = async () => {}` in
          // client cells as well, we'll need a different heuristic here
          // If we want to support `QUERY` (gql) cells on the server we'll
          // also need a different heuristic
          const createCellHookName = exportNames.includes('data')
            ? 'createServerCell'
            : 'createCell'
          const importFrom = exportNames.includes('data')
            ? '@redwoodjs/web/dist/components/cell/createServerCell'
            : '@redwoodjs/web'

          // Insert at the top of the file:
          // + import { createCell } from '@redwoodjs/web'
          path.node.body.unshift(
            t.importDeclaration(
              [
                t.importSpecifier(
                  t.identifier(createCellHookName),
                  t.identifier(createCellHookName),
                ),
              ],
              t.stringLiteral(importFrom),
            ),
          )

          // Insert at the bottom of the file:
          // + export default createCell({ QUERY?, Loading?, Success?, Failure?, Empty?, beforeQuery?, isEmpty, afterQuery?, displayName? })
          path.node.body.push(
            t.exportDefaultDeclaration(
              t.callExpression(t.identifier(createCellHookName), [
                t.objectExpression([
                  ...exportNames.map((name) =>
                    t.objectProperty(
                      t.identifier(name),
                      t.identifier(name),
                      false,
                      true,
                    ),
                  ),
                  // Add the `displayName` property so we can name the Cell
                  // after the filename.
                  t.objectProperty(
                    t.identifier('displayName'),
                    t.stringLiteral(
                      parse(this.file.opts.filename as string).name,
                    ),
                    false,
                    true,
                  ),
                ]),
              ]),
            ),
          )
        },
      },
    },
  }
}
