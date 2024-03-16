import path from 'path'

import type { PluginObj, types } from '@babel/core'

import type { PagesDependency } from '@redwoodjs/project-config'
import {
  ensurePosixPath,
  getPaths,
  importStatementPath,
  processPagesDir,
} from '@redwoodjs/project-config'

export interface PluginOptions {
  forClient?: boolean
  forServer?: boolean
}

/**
 * When running from the CLI: Babel-plugin-module-resolver will convert
 * For dev/build/prerender (forJest == false): 'src/pages/ExamplePage' -> './pages/ExamplePage'
 * For test (forJest == true): 'src/pages/ExamplePage' -> '/Users/blah/pathToProject/web/src/pages/ExamplePage'
 */
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

export function RedwoodRSCRoutesAutoLoaderPlugin(
  { types: t }: { types: typeof types },
  { forClient = false, forServer = false }: PluginOptions,
): PluginObj {
  if ((!forClient && !forServer) || (forClient && forServer)) {
    throw new Error(
      'You must specify either forClient or forServer, but not both or neither.',
    )
  }

  // @NOTE: This var gets mutated inside the visitors
  let pages = processPagesDir().map(withRelativeImports)

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
    throw new Error(
      `Unable to find only a single file ending in 'Page.{js,jsx,ts,tsx}' in the follow page directories: ${Array.from(
        duplicatePageImportNames,
      )
        .map((name) => `'${name}'`)
        .join(', ')}`,
    )
  }

  return {
    name: 'babel-plugin-redwood-routes-auto-loader',
    visitor: {
      // Remove any pages that have been explicitly imported in the Routes file,
      // because when one is present, the user is requesting that the module be
      // included in the main bundle.
      ImportDeclaration(p) {
        if (pages.length === 0) {
          return
        }

        const userImportRelativePath = getPathRelativeToSrc(
          importStatementPath(p.node.source?.value),
        )

        const defaultSpecifier = p.node.specifiers.filter((specifiers) =>
          t.isImportDefaultSpecifier(specifiers),
        )[0]

        if (userImportRelativePath && defaultSpecifier) {
          // Remove the page from pages list, if it is already explicitly imported, so that we don't add loaders for these pages.
          // We use the path & defaultSpecifier because the const name could be anything
          pages = pages.filter(
            (page) =>
              !(
                page.relativeImport === ensurePosixPath(userImportRelativePath)
              ),
          )
        }
      },
      Program: {
        enter() {
          pages = processPagesDir().map(withRelativeImports)
        },
        exit(p) {
          if (pages.length === 0) {
            return
          }
          const nodes = []

          // Add "import {lazy} from 'react'"
          nodes.unshift(
            t.importDeclaration(
              [t.importSpecifier(t.identifier('lazy'), t.identifier('lazy'))],
              t.stringLiteral('react'),
            ),
          )

          // For RSC Client builds add
          // import { renderFromRscServer } from '@redwoodjs/vite/client'
          // This will perform a fetch request to the remote RSC server
          if (forClient) {
            nodes.unshift(
              t.importDeclaration(
                [
                  t.importSpecifier(
                    t.identifier('renderFromRscServer'),
                    t.identifier('renderFromRscServer'),
                  ),
                ],
                t.stringLiteral('@redwoodjs/vite/client'),
              ),
            )
          }

          // For RSC Server builds add
          // import { renderFromDist } from '@redwoodjs/vite/clientSsr'
          // This will directly read the component from the dist folder
          if (forServer) {
            nodes.unshift(
              t.importDeclaration(
                [
                  t.importSpecifier(
                    t.identifier('renderFromDist'),
                    t.identifier('renderFromDist'),
                  ),
                ],
                t.stringLiteral('@redwoodjs/vite/clientSsr'),
              ),
            )
          }

          // Prepend all imports to the top of the file
          for (const { importName } of pages) {
            if (forClient) {
              // RSC client wants this format
              // const AboutPage = renderFromRscServer('AboutPage')
              nodes.push(
                t.variableDeclaration('const', [
                  t.variableDeclarator(
                    t.identifier(importName),
                    t.callExpression(t.identifier('renderFromRscServer'), [
                      t.stringLiteral(importName),
                    ]),
                  ),
                ]),
              )
            }

            if (forServer) {
              // RSC server wants this format
              // const AboutPage = renderFromDist('AboutPage')
              nodes.push(
                t.variableDeclaration('const', [
                  t.variableDeclarator(
                    t.identifier(importName),
                    t.callExpression(t.identifier('renderFromDist'), [
                      t.stringLiteral(importName),
                    ]),
                  ),
                ]),
              )
            }
          }

          // Insert at the top of the file
          p.node.body.unshift(...nodes)
        },
      },
    },
  }
}
