import type { NodePath, PluginObj, PluginPass, types } from '@babel/core'

// This extracts the options passed to the graphql function and stores them in an exported variable so they can be imported elsewhere.

const exportVariableName = '__rw_graphqlOptions'

function optionsConstNode(
  t: typeof types,
  value:
    | types.ArgumentPlaceholder
    | types.JSXNamespacedName
    | types.SpreadElement
    | types.Expression,
  state: PluginPass,
) {
  if (
    t.isIdentifier(value) ||
    t.isObjectExpression(value) ||
    t.isCallExpression(value) ||
    t.isConditionalExpression(value)
  ) {
    return t.exportNamedDeclaration(
      t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier(exportVariableName), value),
      ]),
    )
  } else {
    throw new Error(
      `Unable to parse graphql function options in '${state.file.opts.filename}'`,
    )
  }
}

export default function ({ types: t }: { types: typeof types }): PluginObj {
  return {
    name: 'babel-plugin-redwood-graphql-options-extract',
    visitor: {
      Program(path, state) {
        // Find all imports of the 'createGraphQLHandler' function from '@redwoodjs/graphql-server'
        const importNames = new Set<string>()
        path.traverse({
          ImportDeclaration(p) {
            if (
              t.isStringLiteral(p.node.source, {
                value: '@redwoodjs/graphql-server',
              })
            ) {
              for (const specifier of p.node.specifiers) {
                if (
                  t.isImportSpecifier(specifier) &&
                  t.isIdentifier(specifier.imported) &&
                  specifier.imported.name === 'createGraphQLHandler'
                ) {
                  importNames.add(specifier.local.name)
                }
              }
            }
          },
        })

        // Find all calls to the 'createGraphQLHandler' function
        const callExpressionPaths: NodePath<types.CallExpression>[] = []
        path.traverse({
          CallExpression(p) {
            if (
              t.isIdentifier(p.node.callee) &&
              importNames.has(p.node.callee.name)
            ) {
              callExpressionPaths.push(p)
            }
          },
        })
        if (callExpressionPaths.length > 1) {
          console.log(
            `There are ${callExpressionPaths.length} calls to 'createGraphQLHandler' in '${state.file.opts.filename}'. The automatic extraction of graphql options will fallback to the first usage.`,
          )
          return
        }
        const callExpressionPath = callExpressionPaths[0]
        if (!callExpressionPath) {
          return
        }

        // Extract the options into a new exported variable
        const options = callExpressionPath.node.arguments[0]

        // Insert the new variable declaration
        const optionsConst = optionsConstNode(t, options, state)
        const statementParent = callExpressionPath.getStatementParent()
        if (!statementParent) {
          throw new Error(
            `Unable to find statement parent for graphql function in '${state.file.opts.filename}'`,
          )
        }
        statementParent.insertBefore(optionsConst)

        // Replace the first argument with the new variable identifier
        callExpressionPath.node.arguments[0] = t.identifier(exportVariableName)
      },
    },
  }
}
