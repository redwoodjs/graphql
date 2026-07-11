import fs from 'fs'
import path from 'path'

import { types } from '@babel/core'
import type { ParserPlugin } from '@babel/parser'
import { parse as babelParse } from '@babel/parser'
import traverse from '@babel/traverse'
import chalk from 'chalk'

import { getPaths } from '@redwoodjs/project-config'

import { isFileInsideFolder } from './files'

export const fileToAst = (filePath: string): types.Node => {
  const code = fs.readFileSync(filePath, 'utf-8')

  // use jsx plugin for web files, because in JS, the .jsx extension is not used
  const isJsxFile =
    path.extname(filePath).match(/[jt]sx$/) ||
    isFileInsideFolder(filePath, getPaths().web.base)

  const plugins = [
    'typescript',
    'nullishCoalescingOperator',
    'objectRestSpread',
    isJsxFile && 'jsx',
  ].filter(Boolean) as ParserPlugin[]

  try {
    return babelParse(code, {
      sourceType: 'module',
      plugins,
    })
  } catch (e: any) {
    console.error(chalk.red(`Error parsing: ${filePath}`))
    console.error(e)
    throw new Error(e?.message) // we throw, so typescript doesn't complain about returning
  }
}

interface NamedExports {
  name: string
  type: 're-export' | 'variable' | 'function' | 'class'
  location: {
    line: number
    column: number
  }
}
/**
 * get all the named exports in a given piece of code.
 */
export const getNamedExports = (ast: types.Node): NamedExports[] => {
  const namedExports: NamedExports[] = []
  traverse(ast, {
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
            location: {
              line: id.loc?.start.line ?? 1,
              column: id.loc?.start.column ?? 0,
            },
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
          location: {
            line: id.loc?.start.line ?? 1,
            column: id.loc?.start.column ?? 0,
          },
        })
      } else if (declaration.type === 'FunctionDeclaration') {
        namedExports.push({
          name: declaration?.id?.name as string,
          type: 'function',
          location: {
            line: declaration?.id?.loc?.start.line ?? 1,
            column: declaration?.id?.loc?.start.column ?? 0,
          },
        })
      } else if (declaration.type === 'ClassDeclaration') {
        namedExports.push({
          name: declaration?.id?.name as string,
          type: 'class',
          location: {
            line: declaration?.id?.loc?.start.line ?? 1,
            column: declaration?.id?.loc?.start.column ?? 0,
          },
        })
      }
    },
  })

  return namedExports
}

/**
 * get all the gql queries from the supplied code
 */
export const getGqlQueries = (ast: types.Node) => {
  const gqlQueries: string[] = []
  traverse(ast, {
    TaggedTemplateExpression(path) {
      const gqlTag = path.node.tag
      if (gqlTag.type === 'Identifier' && gqlTag.name === 'gql') {
        gqlQueries.push(path.node.quasi.quasis[0].value.raw)
      }
    },
  })

  return gqlQueries
}

export const getCellGqlQuery = (ast: types.Node) => {
  let cellQuery: string | undefined = undefined
  traverse(ast, {
    ExportNamedDeclaration({ node }) {
      if (
        node.exportKind === 'value' &&
        types.isVariableDeclaration(node.declaration)
      ) {
        const exportedQueryNode = node.declaration.declarations.find((d) => {
          return (
            types.isIdentifier(d.id) &&
            d.id.name === 'QUERY' &&
            types.isTaggedTemplateExpression(d.init)
          )
        })

        if (exportedQueryNode) {
          const templateExpression =
            exportedQueryNode.init as types.TaggedTemplateExpression

          cellQuery = templateExpression.quasi.quasis[0].value.raw
        }
      }
      return
    },
  })

  return cellQuery
}

export const hasDefaultExport = (ast: types.Node): boolean => {
  let exported = false
  traverse(ast, {
    ExportDefaultDeclaration() {
      exported = true
      return
    },
  })
  return exported
}

export const getDefaultExportLocation = (
  ast: types.Node,
): { line: number; column: number } | null => {
  // Get the default export
  let defaultExport: types.ExportDefaultDeclaration | undefined
  traverse(ast, {
    ExportDefaultDeclaration(path) {
      defaultExport = path.node
    },
  })

  if (!defaultExport) {
    return null
  }

  // Handle the case were we're exporting a variable declared elsewhere
  // as we will want to find the location of that declaration instead
  if (types.isIdentifier(defaultExport.declaration) && types.isFile(ast)) {
    // Directly search the program body for the declaration of the identifier
    // to avoid picking up other identifiers with the same name in the file
    const exportedName = defaultExport.declaration.name
    const declaration = ast.program.body.find((node) => {
      return (
        types.isVariableDeclaration(node) &&
        node.declarations.find((d) => {
          return (
            types.isVariableDeclarator(d) &&
            types.isIdentifier(d.id) &&
            d.id.name === exportedName
          )
        })
      )
    })

    return {
      line: declaration?.loc?.start.line ?? 1,
      column: declaration?.loc?.start.column ?? 0,
    }
  }

  return {
    line: defaultExport.loc?.start.line ?? 1,
    column: defaultExport.loc?.start.column ?? 0,
  }
}
