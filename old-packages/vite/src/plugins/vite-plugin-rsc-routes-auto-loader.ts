import path from 'path'

// Babel 7 packages are CJS, and need to be imported as such
import babelGenerator from '@babel/generator'
const generate = babelGenerator.default
import { parse as babelParse } from '@babel/parser/index.cjs'
import babelTraverse from '@babel/traverse'
const traverse = babelTraverse.default
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

// TODO (RSC): Rename this. It's not auto-loading anymore. It's replacing
// imports with dummy components
export function rscRoutesAutoLoader(): Plugin {
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
    name: 'rsc-routes-auto-loader-dev',
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

      // Store a reference to all default imports so we can update Set wrapper
      // imports later
      // TODO (RSC): Make this all imports, not just default imports. But have to
      // figure out how to handle something like
      // `import { MyLayout, SomethingElse } from './myLayout'`
      // and turning it into
      // `import { SomethingElse } from './myLayout'`
      // `import { MyLayout } from '@redwoodjs/router/dist/dummyComponent'`
      // and also
      // `import MyLayout, { SomethingElse } from './myLayout'`
      const allImports = new Map<string, t.ImportDeclaration>()
      // All components used as Set wrappers
      const wrappers = new Set<string>()

      traverse(ast, {
        ImportDeclaration(path) {
          const importPath = path.node.source.value

          if (importPath === null) {
            return
          }

          const userImportRelativePath = getPathRelativeToSrc(
            importStatementPath(importPath),
          )

          const defaultSpecifier = path.node.specifiers.filter((specifier) =>
            t.isImportDefaultSpecifier(specifier),
          )[0]

          if (userImportRelativePath && defaultSpecifier) {
            importedNames.add(defaultSpecifier.local.name)
          }

          path.node.specifiers.forEach((specifier) => {
            allImports.set(specifier.local.name, path.node)
          })
        },
        JSXElement() {
          // The file is already transformed from JSX to `jsx()` and `jsxs()`
          // function calls when this plugin executes, so no JSXElement nodes
          // will be present in the AST.
        },
        CallExpression(path) {
          if (
            (t.isIdentifier(path.node.callee, { name: 'jsxs' }) ||
              t.isIdentifier(path.node.callee, { name: 'jsx' })) &&
            t.isIdentifier(path.node.arguments[0]) &&
            path.node.arguments[0].name === 'Set'
          ) {
            const jsxArgs = path.node.arguments
            if (t.isObjectExpression(jsxArgs[1])) {
              const wrapProp = jsxArgs[1].properties.find(
                (prop): prop is t.ObjectProperty =>
                  t.isObjectProperty(prop) &&
                  t.isIdentifier(prop.key, { name: 'wrap' }),
              )

              if (t.isArrayExpression(wrapProp?.value)) {
                wrapProp.value.elements.forEach((element) => {
                  if (t.isIdentifier(element)) {
                    wrappers.add(element.name)
                  }
                })
              } else if (t.isIdentifier(wrapProp?.value)) {
                wrappers.add(wrapProp.value.name)
              }
            }
          }
        },
      })

      const nonImportedPages = pages.filter(
        (page) => !importedNames.has(page.importName),
      )

      wrappers.forEach((wrapper) => {
        const wrapperImport = allImports.get(wrapper)

        if (wrapperImport) {
          // This will turn all wrapper imports into something like
          // import NavigationLayout from "@redwoodjs/router/dist/dummyComponent";
          // which is all we need for client side routing
          wrapperImport.source.value = '@redwoodjs/router/dist/dummyComponent'
        }
      })

      // All pages will just be `const NameOfPage = () => null`
      for (const page of nonImportedPages) {
        ast.program.body.unshift(
          t.variableDeclaration('const', [
            t.variableDeclarator(
              t.identifier(page.constName),
              t.arrowFunctionExpression([], t.nullLiteral()),
            ),
          ]),
        )
      }

      return generate(ast).code
    },
  }
}
