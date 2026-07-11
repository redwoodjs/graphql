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
  forPrerender?: boolean
}

/**
 * When running from the CLI: Babel-plugin-module-resolver will convert
 * For dev/build/prerender (forJest == false): 'src/pages/ExamplePage' -> './pages/ExamplePage'
 * For test (forJest == true): 'src/pages/ExamplePage' -> '/Users/blah/pathToProject/web/src/pages/ExamplePage'
 */
export const getPathRelativeToSrc = (maybeAbsolutePath: string) => {
  // If the path is already relative
  if (!path.isAbsolute(maybeAbsolutePath)) {
    return maybeAbsolutePath
  }

  return `./${path.relative(getPaths().web.src, maybeAbsolutePath)}`
}

export const withRelativeImports = (page: PagesDependency) => {
  return {
    ...page,
    relativeImport: ensurePosixPath(getPathRelativeToSrc(page.importPath)),
  }
}

export default function (
  { types: t }: { types: typeof types },
  { forPrerender = false }: PluginOptions,
): PluginObj {
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
      `Unable to find only a single file ending in 'Page.{js,jsx,ts,tsx}' in the following page directories: ${Array.from(
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

        const defaultSpecifier = p.node.specifiers.find((specifiers) =>
          t.isImportDefaultSpecifier(specifiers),
        )
        if (!defaultSpecifier) {
          return
        }

        // Remove Page imports in prerender mode (see babel-preset)
        // The removed imports will be replaced further down in this file
        // with declarations like these:
        // const HomePage = {
        //   name: "HomePage",
        //   loader: () => import("./pages/HomePage/HomePage")
        //   prerenderLoader: () => require("./pages/HomePage/HomePage")
        // };
        // This is to make sure that all the imported "Page modules" are normal
        // imports and not asynchronous ones.
        // Note that jest in a user's project does not enter this block, but our tests do
        if (forPrerender) {
          // Match import paths, const name could be different

          const pageThatUserImported = pages.find((page) => {
            return (
              page.relativeImport === ensurePosixPath(userImportRelativePath)
            )
          })

          if (pageThatUserImported) {
            // Update the import name, with the user's import name
            // So that the JSX name stays consistent
            pageThatUserImported.importName = defaultSpecifier.local.name

            // Remove the default import for the page and leave all the others
            p.node.specifiers = p.node.specifiers.filter(
              (specifier) => !t.isImportDefaultSpecifier(specifier),
            )
          }

          return
        }

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

          // Prepend all imports to the top of the file
          for (const { importName, relativeImport } of pages) {
            const importArgument = t.stringLiteral(relativeImport)

            //  const <importName> = {
            //     name: <importName>,
            //     prerenderLoader: (name) => prerenderLoaderImpl
            //     LazyComponent: lazy(() => import(<relativeImportPath>)
            //   }

            //
            // Real example
            // const LoginPage = {
            //   name: "LoginPage",
            //   prerenderLoader: () => __webpack_require__(require.resolveWeak("./pages/LoginPage/LoginPage")),
            //   LazyComponent: lazy(() => import("/pages/LoginPage/LoginPage.tsx"))
            // }
            //

            nodes.push(
              t.variableDeclaration('const', [
                t.variableDeclarator(
                  t.identifier(importName),
                  t.objectExpression([
                    t.objectProperty(
                      t.identifier('name'),
                      t.stringLiteral(importName),
                    ),
                    // prerenderLoader for ssr/prerender and first load of
                    // prerendered pages in browser (csr)
                    // prerenderLoader: (name) => { prerenderLoaderImpl }
                    t.objectProperty(
                      t.identifier('prerenderLoader'),
                      t.arrowFunctionExpression(
                        [t.identifier('name')],
                        prerenderLoaderImpl(forPrerender, relativeImport, t),
                      ),
                    ),
                    t.objectProperty(
                      t.identifier('LazyComponent'),
                      t.callExpression(t.identifier('lazy'), [
                        t.arrowFunctionExpression(
                          [],
                          t.callExpression(t.identifier('import'), [
                            importArgument,
                          ]),
                        ),
                      ]),
                    ),
                  ]),
                ),
              ]),
            )
          }

          // Insert at the top of the file
          p.node.body.unshift(...nodes)
        },
      },
    },
  }
}

function prerenderLoaderImpl(
  forPrerender: boolean,
  relativeImport: string,
  t: typeof types,
) {
  if (forPrerender) {
    return t.callExpression(t.identifier('require'), [
      t.stringLiteral(relativeImport),
    ])
  }

  // This code will be output when building the web side (i.e. not when
  // prerendering)
  // active-route-loader will use this code for auto-imported pages, for the
  // first load of a prerendered page
  // Manually imported pages will be bundled in the main bundle and will be
  // loaded by the code in `normalizePage` in util.ts
  return t.objectExpression([
    t.objectProperty(
      t.identifier('default'),
      t.memberExpression(
        t.identifier('globalThis.__REDWOOD__PRERENDER_PAGES'),
        t.identifier('name'),
        true,
      ),
    ),
  ])
}
