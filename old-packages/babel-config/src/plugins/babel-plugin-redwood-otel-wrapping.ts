import * as nodejsPath from 'path'

import type { NodePath, PluginObj, PluginPass, types } from '@babel/core'

import { getBaseDirFromFile } from '@redwoodjs/project-config'

// This wraps user code within opentelemetry spans to provide automatic tracing in your redwood API.

function addOpenTelemetryImport(
  path: NodePath<types.Program>,
  t: typeof types,
) {
  // We need to have access to the `trace` from `@opentelemetry/api` in order to add the
  // automatic instrumentation. We will import it and alias it to something highly specific
  // to avoid any potential naming conflicts with user code.
  path.node.body.unshift(
    t.importDeclaration(
      [
        t.importSpecifier(
          t.identifier('RW_OTEL_WRAPPER_TRACE'),
          t.identifier('trace'),
        ),
      ],
      t.stringLiteral('@opentelemetry/api'),
    ),
  )
}

function getRedwoodPaths(state: PluginPass): {
  filename: string | null | undefined
  apiFolder: string
} {
  // NOTE: Unable to get 'babel-plugin-tester' to mock the filename so we have specific
  // testing logic here. Not ideal but it works for now.
  if (process.env.NODE_ENV === 'test') {
    return {
      filename: '__MOCKED_FILENAME__',
      apiFolder: '__MOCKED_API_FOLDER__',
    }
  }

  const filename = state.file.opts.filename
  const filenameOffset = filename
    ? getBaseDirFromFile(filename).length + 9 // 9 is the length of '/api/src/'
    : 0
  const apiFolder = filename
    ? filename.substring(
        filenameOffset,
        filename.substring(filenameOffset).indexOf(nodejsPath.sep) +
          filenameOffset,
      )
    : '?'

  return {
    filename,
    apiFolder,
  }
}

function wrapExportNamedDeclaration(
  path: NodePath<types.ExportNamedDeclaration>,
  state: PluginPass,
  t: typeof types,
) {
  const declaration = path.node.declaration
  const declarationIsSupported =
    declaration != null &&
    declaration.type === 'VariableDeclaration' &&
    declaration.declarations[0].init?.type === 'ArrowFunctionExpression'
  if (!declarationIsSupported) {
    return
  }

  const originalFunction = declaration.declarations[0]
    .init as types.ArrowFunctionExpression
  if (!originalFunction) {
    return
  }

  const originalFunctionName =
    declaration.declarations[0].id.type === 'Identifier'
      ? declaration.declarations[0].id.name
      : '?'
  const wrappedFunctionName = `__${
    originalFunctionName === '?'
      ? 'RW_OTEL_WRAPPER_UNKNOWN_FUNCTION'
      : originalFunctionName
  }`

  const originalFunctionArgumentsWithoutDefaults: (
    | types.ArgumentPlaceholder
    | types.SpreadElement
    | types.Expression
  )[] = []
  for (const param of originalFunction.params) {
    if (param.type === 'Identifier') {
      originalFunctionArgumentsWithoutDefaults.push(param)
      continue
    }

    if (param.type === 'ObjectPattern') {
      const objectProperties = param.properties.filter(
        (p) => p.type === 'ObjectProperty',
      )
      originalFunctionArgumentsWithoutDefaults.push(
        t.objectExpression(
          objectProperties.map((p) => {
            if (p.value.type === 'AssignmentPattern') {
              return t.objectProperty(p.key, p.value.left)
            }
            return p
          }),
        ),
      )

      continue
    }

    if (param.type === 'AssignmentPattern') {
      if (param.left.type === 'Identifier') {
        originalFunctionArgumentsWithoutDefaults.push(param.left)
      } else if (param.left.type === 'ObjectPattern') {
        const objectProperties = param.left.properties.filter(
          (p) => p.type === 'ObjectProperty',
        )
        originalFunctionArgumentsWithoutDefaults.push(
          t.objectExpression(
            objectProperties.map((p) => {
              if (p.value.type === 'AssignmentPattern') {
                return t.objectProperty(p.key, p.value.left)
              }
              return p
            }),
          ),
        )
      } else {
        // TODO: Implement others, bail out for now
        return
      }
    }

    if (param.type === 'ArrayPattern' || param.type === 'RestElement') {
      // TODO: Implement, bail out for now
      return
    }
  }

  const { filename, apiFolder } = getRedwoodPaths(state)

  const activeSpanBlock = t.callExpression(
    t.memberExpression(
      t.identifier('RW_OTEL_WRAPPER_TRACER'),
      t.identifier('startActiveSpan'),
    ),
    [
      t.stringLiteral(`redwoodjs:api:${apiFolder}:${originalFunctionName}`),
      t.arrowFunctionExpression(
        [t.identifier('span')],
        t.blockStatement([
          t.expressionStatement(
            t.callExpression(
              t.memberExpression(
                t.identifier('span'),
                t.identifier('setAttribute'),
              ),
              [
                t.stringLiteral('code.function'),
                t.stringLiteral(originalFunctionName),
              ],
            ),
          ),
          t.expressionStatement(
            t.callExpression(
              t.memberExpression(
                t.identifier('span'),
                t.identifier('setAttribute'),
              ),
              [
                t.stringLiteral('code.filepath'),
                t.stringLiteral(filename || '?'),
              ],
            ),
          ),
          t.tryStatement(
            t.blockStatement([
              t.variableDeclaration('const', [
                t.variableDeclarator(
                  t.identifier('RW_OTEL_WRAPPER_INNER_RESULT'),
                  originalFunction.async
                    ? t.awaitExpression(
                        t.callExpression(
                          t.identifier(wrappedFunctionName),
                          originalFunctionArgumentsWithoutDefaults,
                        ),
                      )
                    : t.callExpression(
                        t.identifier(wrappedFunctionName),
                        originalFunctionArgumentsWithoutDefaults,
                      ),
                ),
              ]),
              t.expressionStatement(
                t.callExpression(
                  t.memberExpression(t.identifier('span'), t.identifier('end')),
                  [],
                ),
              ),
              t.returnStatement(t.identifier('RW_OTEL_WRAPPER_INNER_RESULT')),
            ]),
            t.catchClause(
              t.identifier('error'),
              t.blockStatement([
                t.expressionStatement(
                  t.callExpression(
                    t.memberExpression(
                      t.identifier('span'),
                      t.identifier('recordException'),
                    ),
                    [t.identifier('error')],
                  ),
                ),
                t.expressionStatement(
                  t.callExpression(
                    t.memberExpression(
                      t.identifier('span'),
                      t.identifier('setStatus'),
                    ),
                    [
                      t.objectExpression([
                        t.objectProperty(
                          t.identifier('code'),
                          t.numericLiteral(2),
                        ),
                        t.objectProperty(
                          t.identifier('message'),
                          t.logicalExpression(
                            '??',
                            t.optionalMemberExpression(
                              t.optionalCallExpression(
                                t.optionalMemberExpression(
                                  t.optionalMemberExpression(
                                    t.identifier('error'),
                                    t.identifier('message'),
                                    false,
                                    true,
                                  ),
                                  t.identifier('split'),
                                  false,
                                  true,
                                ),
                                [t.stringLiteral('\n')],
                                false,
                              ),
                              t.numericLiteral(0),
                              true,
                              false,
                            ),
                            t.optionalMemberExpression(
                              t.optionalCallExpression(
                                t.optionalMemberExpression(
                                  t.optionalCallExpression(
                                    t.optionalMemberExpression(
                                      t.identifier('error'),
                                      t.identifier('toString'),
                                      false,
                                      true,
                                    ),
                                    [],
                                    false,
                                  ),
                                  t.identifier('split'),
                                  false,
                                  true,
                                ),
                                [t.stringLiteral('\n')],
                                false,
                              ),
                              t.numericLiteral(0),
                              true,
                              false,
                            ),
                          ),
                        ),
                      ]),
                    ],
                  ),
                ),
                t.expressionStatement(
                  t.callExpression(
                    t.memberExpression(
                      t.identifier('span'),
                      t.identifier('end'),
                    ),
                    [],
                  ),
                ),
                t.throwStatement(t.identifier('error')),
              ]),
            ),
          ),
        ]),
        originalFunction.async,
      ),
    ],
  )

  const wrapper = t.arrowFunctionExpression(
    originalFunction.params,
    t.blockStatement(
      [
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier(wrappedFunctionName),
            originalFunction,
          ),
        ]),
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('RW_OTEL_WRAPPER_TRACER'),
            t.callExpression(
              t.memberExpression(
                t.identifier('RW_OTEL_WRAPPER_TRACE'),
                t.identifier('getTracer'),
              ),
              [t.stringLiteral('redwoodjs')],
            ),
          ),
        ]),
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('RW_OTEL_WRAPPER_RESULT'),
            originalFunction.async
              ? t.awaitExpression(activeSpanBlock)
              : activeSpanBlock,
          ),
        ]),
        t.returnStatement(t.identifier('RW_OTEL_WRAPPER_RESULT')),
      ],
      originalFunction.body.type === 'BlockStatement'
        ? originalFunction.body.directives
        : undefined,
    ),
    originalFunction.async,
  )

  // Replace the original function with the wrapped version
  declaration.declarations[0].init = wrapper
}

export default function ({ types: t }: { types: typeof types }): PluginObj {
  return {
    name: 'babel-plugin-redwood-otel-wrapping',
    visitor: {
      Program(path) {
        addOpenTelemetryImport(path, t)
      },
      ExportNamedDeclaration(path, state) {
        wrapExportNamedDeclaration(path, state, t)
      },
    },
  }
}
