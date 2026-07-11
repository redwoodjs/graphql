import path from 'path'

// Babel 7 packages are CJS, and need to be imported as such
import babelGenerator from '@babel/generator'
const { default: generate } = babelGenerator
import { parse as babelParse } from '@babel/parser/index.cjs'
import babelTraverse from '@babel/traverse'
const { default: traverse } = babelTraverse
import * as t from '@babel/types'
import type { Plugin } from 'vite'
import { normalizePath } from 'vite'

import type { PagesDependency } from '@redwoodjs/project-config'
import {
  ensurePosixPath,
  getPaths,
  importStatementPath,
  processPagesDir,
} from '@redwoodjs/project-config'

const getPathRelativeToSrc = (maybeAbsolutePath: string) => {
  // If the path is already relative
  if (!path.isAbsolute(maybeAbsolutePath)) {
    return maybeAbsolutePath
  }

  return `./${path.relative(getPaths().web.src, maybeAbsolutePath)}`
}

const withRelativeImports = (page: PagesDependency) => {
  return {
    ...page,
    relativeImport: ensurePosixPath(getPathRelativeToSrc(page.importPath)),
  }
}

export function rscRoutesImports(): Plugin {
  // Vite IDs are always normalized and so we avoid windows path issues
  // by normalizing the path here.
  const routesFileId = normalizePath(getPaths().web.routes)

  // Get the current pages
  // @NOTE: This var gets mutated inside the visitors
  const pages = processPagesDir().map(withRelativeImports)

  // Currently processPagesDir() can return duplicate entries when there are multiple files
  // ending in Page in the individual page directories. This will cause an error upstream.
  // Here we check for duplicates and throw a more helpful error message.
  const duplicatePageImportNames = new Set<string>()
  const sortedPageImportNames = pages.map((page) => page.importName).sort()
  for (let i = 0; i < sortedPageImportNames.length - 1; i++) {
    if (sortedPageImportNames[i + 1] === sortedPageImportNames[i]) {
      duplicatePageImportNames.add(sortedPageImportNames[i])
    }
  }
  if (duplicatePageImportNames.size > 0) {
    const pageNames = Array.from(duplicatePageImportNames)
      .map((name) => `'${name}'`)
      .join(', ')

    throw new Error(
      "Unable to find only a single file ending in 'Page.{js,jsx,ts,tsx}' in " +
        `the following page directories: ${pageNames}`,
    )
  }

  return {
    name: 'rsc-routes-imports',
    transform: async function (code, id) {
      // We only care about the routes file
      if (id !== routesFileId) {
        return null
      }

      // If we have no pages then we have no reason to do anything here
      if (pages.length === 0) {
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

      // We have to filter out any pages which the user has already explicitly
      // imported in the routes file otherwise there would be conflicts.
      const importedNames = new Set<string>()

      traverse(ast, {
        ImportDeclaration(path) {
          const importPath = path.node.source.value

          if (importPath === null) {
            return
          }

          const userImportRelativePath = getPathRelativeToSrc(
            importStatementPath(path.node.source?.value),
          )

          const defaultSpecifier = path.node.specifiers.filter((specifier) =>
            t.isImportDefaultSpecifier(specifier),
          )[0]

          if (userImportRelativePath && defaultSpecifier) {
            importedNames.add(defaultSpecifier.local.name)
          }
        },
      })

      const nonImportedPages = pages.filter((page) => {
        return !importedNames.has(page.importName)
      })

      // Insert the page import into the code
      for (const page of nonImportedPages) {
        ast.program.body.unshift(
          t.importDeclaration(
            [t.importDefaultSpecifier(t.identifier(page.importName))],
            t.stringLiteral(page.importPath),
          ),
        )
      }

      return generate(ast).code
    },
  }
}
