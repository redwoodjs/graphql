import path from 'node:path'

import * as babel from '@babel/core'
import type { PluginObj, types } from '@babel/core'
import * as swc from '@swc/core'
import type { Plugin } from 'vite'

export function rscTransformUseServerPlugin(
  outDir: string,
  serverEntryFiles: Record<string, string>,
): Plugin {
  return {
    name: 'rsc-transform-use-server-plugin',
    transform: async function (code, id) {
      // Do a quick check for the exact string. If it doesn't exist, don't
      // bother parsing. This check doesn't have to be perfect. It's just a
      // quick check to avoid doing a full parse to build an AST.
      // Plesae benchmark before making any changes here.
      // See https://github.com/redwoodjs/redwood/pull/11158
      if (!code.includes('use server')) {
        return code
      }

      if (
        id.includes('node_modules/.vite') ||
        id.includes('/react-server-dom-webpack/') ||
        id.includes('/react-server-dom-webpack.server')
      ) {
        console.log('vite-plugin-rsc-transform-server.ts: Skipping', id)
        return code
      }

      let mod: swc.Module

      const isTypescript = id.endsWith('.ts') || id.endsWith('.tsx')

      try {
        mod = swc.parseSync(code, {
          target: 'es2022',
          syntax: isTypescript ? 'typescript' : 'ecmascript',
          tsx: id.endsWith('.tsx'),
          jsx: id.endsWith('.jsx'),
        })
      } catch (e: any) {
        console.error('Error parsing', id, e.message)
        return code
      }

      let useClient = false
      let moduleScopedUseServer = false

      for (const node of mod.body) {
        if (
          node.type !== 'ExpressionStatement' ||
          node.expression.type !== 'StringLiteral'
        ) {
          continue
        }

        if (node.expression.value === 'use client') {
          useClient = true
        }

        if (node.expression.value === 'use server') {
          moduleScopedUseServer = true
        }
      }

      // TODO (RSC): Should also throw if there are function scoped "use server"
      // directives in the file
      if (useClient && moduleScopedUseServer) {
        throw new Error(
          'Cannot have both "use client" and "use server" directives in the same file.',
        )
      }

      // We need to handle both urls (`id`s) to files in node_modules, files
      // already built by Vite (at least for now, with our hybrid dev/prod
      // setup), and files in /src that will be built
      let builtFileName = id

      const serverEntryKey = Object.entries(serverEntryFiles).find(
        ([_key, value]) => value === id,
      )?.[0]

      if (serverEntryKey) {
        // We output server actions in the `assets` subdirectory, and add a .mjs
        // extension to the file name
        builtFileName = path.join(outDir, 'assets', serverEntryKey + '.mjs')

        if (process.platform === 'win32') {
          builtFileName = builtFileName.replaceAll('\\', '/')
        }
      }

      if (!builtFileName) {
        throw new Error(
          `Could not find ${id} in serverEntryFiles: ` +
            JSON.stringify(serverEntryFiles),
        )
      }

      let transformedCode = code

      if (moduleScopedUseServer) {
        transformedCode = transformServerModule(mod, builtFileName, code)
      } else {
        const result = babel.transformSync(code, {
          filename: id,
          presets: ['@babel/preset-typescript'],
          plugins: [[babelPluginTransformServerAction, { url: builtFileName }]],
        })

        if (!result) {
          console.error('Failed to transform code', id, code)
          throw new Error('Failed to transform code')
        }

        if (!result.code) {
          console.error('Failed to transform code', id, code)
          throw new Error("Transform didn't return any code")
        }

        transformedCode = result.code
      }

      return transformedCode
    },
  }
}

function transformServerModule(
  mod: swc.Module,
  url: string,
  code: string,
): string {
  // If the same local name is exported more than once, we only need one of the names.
  const localNames = new Map<string, string>()
  const localTypes = new Map<string, string>()

  for (const node of mod.body) {
    switch (node.type) {
      // TODO (RSC): Add code comments with examples of each type of node

      case 'ExportDeclaration':
        if (node.declaration.type === 'FunctionDeclaration') {
          const name = node.declaration.identifier.value
          localNames.set(name, name)
          localTypes.set(name, 'function')
        } else if (node.declaration.type === 'VariableDeclaration') {
          for (const declaration of node.declaration.declarations) {
            if (declaration.id.type === 'Identifier') {
              const name = declaration.id.value
              localNames.set(name, name)
            }
          }
        }

        break

      case 'ExportDefaultDeclaration':
        if (node.decl.type === 'FunctionExpression') {
          const identifier = node.decl.identifier
          if (identifier) {
            localNames.set(identifier.value, 'default')
            localTypes.set(identifier.value, 'function')
          }
        }

        break

      case 'ExportNamedDeclaration':
        for (const specifier of node.specifiers) {
          if (specifier.type === 'ExportSpecifier') {
            const name = specifier.orig.value

            if (specifier.exported?.type === 'Identifier') {
              const exportedName = specifier.exported.value
              localNames.set(name, exportedName)
            } else if (specifier.orig.type === 'Identifier') {
              localNames.set(name, name)
            }
          }
        }

        break

      case 'ExportDefaultExpression':
        if (node.expression.type === 'Identifier') {
          localNames.set(node.expression.value, 'default')
        }

        break
    }
  }

  let newSrc =
    code +
    '\n\n' +
    'import {registerServerReference} from ' +
    '"react-server-dom-webpack/server";\n'

  localNames.forEach(function (exported, local) {
    if (localTypes.get(local) !== 'function') {
      // We first check if the export is a function and if so annotate it.
      newSrc += 'if (typeof ' + local + ' === "function") '
    }

    const urlStr = JSON.stringify(url)
    const exportedStr = JSON.stringify(exported)
    newSrc += `registerServerReference(${local},${urlStr},${exportedStr});\n`
  })

  return newSrc
}

interface PluginPass {
  opts: {
    url: string
  }
  file: {
    opts: {
      filename: string
    }
  }
}

function babelPluginTransformServerAction({
  types: t,
}: {
  types: typeof types
}): PluginObj<PluginPass> {
  // If the same local name is exported more than once, we only need one of the names.
  const localNames = new Map<string, string>()
  const localTypes = new Map<string, string>()
  const serverActionNodes: types.FunctionDeclaration[] = []
  const topLevelFunctions: string[] = []

  return {
    name: 'babel-plugin-redwood-transform-server-action',
    visitor: {
      Program: {
        enter(path) {
          path.node.body.forEach((statement) => {
            if (t.isFunctionDeclaration(statement)) {
              if (hasUseServerDirective(statement)) {
                const name = statement.id?.name
                if (!name) {
                  throw new Error('Function declaration must have a name')
                }

                topLevelFunctions.push(name)
                localTypes.set(name, 'function')
              }
            }
            if (t.isVariableDeclaration(statement)) {
              statement.declarations.forEach((declarator) => {
                if (t.isFunctionExpression(declarator.init)) {
                  if (hasUseServerDirective(declarator.init)) {
                    const name =
                      declarator.id.type === 'Identifier'
                        ? declarator.id.name
                        : undefined
                    if (!name) {
                      throw new Error('Function declaration must have a name')
                    }

                    topLevelFunctions.push(name)
                    localTypes.set(name, 'function')
                  }
                } else if (t.isArrowFunctionExpression(declarator.init)) {
                  if (hasUseServerDirective(declarator.init)) {
                    const name =
                      declarator.id.type === 'Identifier'
                        ? declarator.id.name
                        : undefined
                    if (!name) {
                      throw new Error('Function declaration must have a name')
                    }

                    topLevelFunctions.push(name)
                    localTypes.set(name, 'function')
                  }
                }
              })
            }
          })
        },
        exit(path, state) {
          if (serverActionNodes.length === 0 && localTypes.size === 0) {
            return
          }

          const body = path.node.body

          body.push(
            t.importDeclaration(
              [
                t.importSpecifier(
                  t.identifier('registerServerReference'),
                  t.identifier('registerServerReference'),
                ),
              ],
              t.stringLiteral('react-server-dom-webpack/server'),
            ),
          )

          serverActionNodes.forEach((functionDeclaration) => {
            body.push(t.exportNamedDeclaration(functionDeclaration))
            const name = functionDeclaration.id?.name || ''

            body.push(registerServerRef(name, state.opts.url, name))
          })

          localNames.forEach((exportedName, localName) => {
            if (!localTypes.get(localName)) {
              return
            }

            const localType = localTypes.get(localName)
            if (localType === 'function') {
              body.push(
                registerServerRef(localName, state.opts.url, exportedName),
              )
            } else {
              body.push(
                t.ifStatement(
                  t.binaryExpression(
                    '===',
                    t.unaryExpression('typeof', t.identifier(localName)),
                    t.stringLiteral('function'),
                  ),
                  registerServerRef(localName, state.opts.url, exportedName),
                ),
              )
            }
          })
        },
      },
      ExportNamedDeclaration(path) {
        const declaration = path.node.declaration
        const specifiers = path.node.specifiers

        if (t.isFunctionDeclaration(declaration)) {
          // export async function formAction(formData: FormData) {
          if (hasUseServerDirective(declaration)) {
            // exported named function with top-level "use server"
            const identifier = declaration.id?.name

            if (identifier) {
              localNames.set(identifier, identifier)
              localTypes.set(identifier, 'function')
            }
          } else {
            const body = declaration.body

            // exported named function that might have a server action inside
            const serverActionNodeIndex = indexOfServerActionNode(body)

            if (serverActionNodeIndex >= 0) {
              const serverActionNode = body.body[serverActionNodeIndex]

              if (
                serverActionNode &&
                t.isFunctionDeclaration(serverActionNode)
              ) {
                const name = serverActionNode.id?.name
                if (!name) {
                  // TODO (RSC): Write test for this scenario and add support
                }

                serverActionNodes.push(serverActionNode)
              }
            }
          }
        } else if (t.isVariableDeclaration(declaration)) {
          // export const formAction = async (formData: FormData) => {
          for (const declarator of declaration.declarations) {
            const init = declarator.init

            if (
              !t.isArrowFunctionExpression(init) ||
              !t.isBlockStatement(init.body)
            ) {
              continue
            }

            if (hasUseServerDirective(init)) {
              // exported arrow function with top-level "use server"
              if (declarator.id.type === 'Identifier') {
                localNames.set(declarator.id.name, declarator.id.name)
                localTypes.set(declarator.id.name, 'function')
              }
            } else {
              // exported arrow function that might have a server action inside
              const serverActionNodeIndex = indexOfServerActionNode(init.body)

              if (serverActionNodeIndex >= 0) {
                const serverActionNode = init.body.body[serverActionNodeIndex]

                if (t.isFunctionDeclaration(serverActionNode)) {
                  const name = serverActionNode.id?.name
                  if (!name) {
                    // TODO (RSC): For now at least...
                    throw new Error('Server action must have a name')
                  }

                  const uniqueName = `__rwjs__rsa${serverActionNodes.length}_${name}`
                  serverActionNode.id = t.identifier(uniqueName)
                  serverActionNodes.push(serverActionNode)

                  init.body.body[serverActionNodeIndex] = t.variableDeclaration(
                    'const',
                    [
                      t.variableDeclarator(
                        t.identifier(name),
                        t.identifier(uniqueName),
                      ),
                    ],
                  )
                }
              }
            }
          }
        } else if (specifiers.length) {
          specifiers.forEach((specifier) => {
            if (t.isExportSpecifier(specifier)) {
              const exportedName = t.isStringLiteral(specifier.exported)
                ? specifier.exported.value
                : specifier.exported.name
              localNames.set(specifier.local.name, exportedName)
            }
          })
        }
      },
      ExportDefaultDeclaration(path) {
        const declaration = path.node.declaration

        if (t.isFunctionDeclaration(declaration)) {
          if (hasUseServerDirective(declaration)) {
            // Default-exported function with top-level "use server"
            const identifier = declaration.id?.name

            if (identifier) {
              localNames.set(identifier, 'default')
              localTypes.set(identifier, 'function')
            }
          } else {
            const body = declaration.body

            // Default-exported function that might have a server action inside
            const serverActionNodeIndex = indexOfServerActionNode(body)

            if (serverActionNodeIndex >= 0) {
              const serverActionNode = body.body[serverActionNodeIndex]

              if (
                serverActionNode &&
                t.isFunctionDeclaration(serverActionNode)
              ) {
                const name = serverActionNode.id?.name
                if (!name) {
                  // TODO (RSC): For now at least...
                  throw new Error('Server action must have a name')
                }

                const uniqueName = `__rwjs__rsa${serverActionNodes.length}_${name}`
                serverActionNode.id = t.identifier(uniqueName)
                serverActionNodes.push(serverActionNode)

                body.body[serverActionNodeIndex] = t.variableDeclaration(
                  'const',
                  [
                    t.variableDeclarator(
                      t.identifier(name),
                      t.identifier(uniqueName),
                    ),
                  ],
                )
              }
            }
          }
        }
      },
    },
  }

  function hasUseServerDirective(
    statement:
      | types.FunctionDeclaration
      | types.ArrowFunctionExpression
      | types.FunctionExpression,
  ) {
    return (
      'directives' in statement.body &&
      statement.body.directives.some(
        (directive) => directive.value.value === 'use server',
      )
    )
  }

  function indexOfServerActionNode(
    blockStatement: types.BlockStatement,
  ): number {
    return blockStatement.body.findIndex(
      (node): node is types.FunctionDeclaration => {
        return t.isFunctionDeclaration(node) && hasUseServerDirective(node)
      },
    )
  }

  function registerServerRef(
    localName: string,
    url: string,
    exportedName: string,
  ) {
    return t.expressionStatement(
      t.callExpression(t.identifier('registerServerReference'), [
        t.identifier(localName),
        t.stringLiteral(url),
        t.stringLiteral(exportedName),
      ]),
    )
  }
}
