import fs from 'fs'
import path from 'path'

import { types } from '@babel/core'
import type { ParserPlugin } from '@babel/parser'
import { parse as babelParse } from '@babel/parser'
import traverse from '@babel/traverse'
import fg from 'fast-glob'
import type {
  DocumentNode,
  FieldNode,
  InlineFragmentNode,
  OperationDefinitionNode,
  OperationTypeNode,
} from 'graphql'
import { Kind, parse, visit } from 'graphql'

import { getPaths } from '@redwoodjs/project-config'

export const findCells = (cwd: string = getPaths().web.src) => {
  const modules = fg.sync('**/*Cell.{js,jsx,ts,tsx}', {
    cwd,
    absolute: true,
    ignore: ['node_modules'],
  })
  return modules.filter(isCellFile)
}

export const isCellFile = (p: string) => {
  const { dir, name } = path.parse(p)

  // If the path isn't on the web side it cannot be a cell
  if (!isFileInsideFolder(p, getPaths().web.src)) {
    return false
  }

  // A Cell must be a directory named module.
  if (!dir.endsWith(name)) {
    return false
  }

  const ast = fileToAst(p)

  // A Cell should not have a default export.
  if (hasDefaultExport(ast)) {
    return false
  }

  // A Cell must export QUERY and Success.
  const exports = getNamedExports(ast)
  const exportedQUERY = exports.findIndex((v) => v.name === 'QUERY') !== -1
  const exportedSuccess = exports.findIndex((v) => v.name === 'Success') !== -1
  if (!exportedQUERY && !exportedSuccess) {
    return false
  }

  return true
}

export const isFileInsideFolder = (filePath: string, folderPath: string) => {
  const { dir } = path.parse(filePath)
  const relativePathFromFolder = path.relative(folderPath, dir)
  if (
    !relativePathFromFolder ||
    relativePathFromFolder.startsWith('..') ||
    path.isAbsolute(relativePathFromFolder)
  ) {
    return false
  } else {
    return true
  }
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

interface NamedExports {
  name: string
  type: 're-export' | 'variable' | 'function' | 'class'
}

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
          name: declaration?.id?.name || '',
          type: 'class',
        })
      }
    },
  })

  return namedExports
}

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
    // console.error(chalk.red(`Error parsing: ${filePath}`))
    console.error(e)
    throw new Error(e?.message) // we throw, so typescript doesn't complain about returning
  }
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

export const parseGqlQueryToAst = (gqlQuery: string) => {
  const ast = parse(gqlQuery)
  return parseDocumentAST(ast)
}

export const parseDocumentAST = (document: DocumentNode) => {
  const operations: Operation[] = []

  visit(document, {
    OperationDefinition(node: OperationDefinitionNode) {
      const fields: any[] = []

      node.selectionSet.selections.forEach((field) => {
        fields.push(getFields(field as FieldNode))
      })

      operations.push({
        operation: node.operation,
        name: node.name?.value,
        fields,
      })
    },
  })

  return operations
}

interface Operation {
  operation: OperationTypeNode
  name: string | undefined
  fields: (string | Field)[]
}

interface Field {
  string: (string | Field)[]
}

const getFields = (field: FieldNode): any => {
  // base
  if (!field.selectionSet) {
    return field.name.value
  } else {
    const obj: Record<string, FieldNode[]> = {
      [field.name.value]: [],
    }

    const lookAtFieldNode = (node: FieldNode | InlineFragmentNode): void => {
      node.selectionSet?.selections.forEach((subField) => {
        switch (subField.kind) {
          case Kind.FIELD:
            obj[field.name.value].push(getFields(subField))
            break
          case Kind.FRAGMENT_SPREAD:
            // TODO: Maybe this will also be needed, right now it's accounted for to not crash in the tests
            break
          case Kind.INLINE_FRAGMENT:
            lookAtFieldNode(subField)
        }
      })
    }

    lookAtFieldNode(field)

    return obj
  }
}
