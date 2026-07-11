import type { TSESTree } from '@typescript-eslint/utils'
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils'
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint'

const createRule = ESLintUtils.RuleCreator.withoutDocs

function isAllowedElement(name: string) {
  const allowedElements = ['Router', 'Route', 'Set', 'PrivateSet', 'Private']
  return allowedElements.includes(name)
}

function checkNodes(
  nodesToCheck: TSESTree.JSXElement | TSESTree.JSXChild,
  context: RuleContext<'unexpected', []>,
) {
  if (nodesToCheck.type === AST_NODE_TYPES.JSXElement) {
    const name =
      nodesToCheck.openingElement.name.type === AST_NODE_TYPES.JSXIdentifier
        ? nodesToCheck.openingElement.name.name
        : null
    if (name && !isAllowedElement(name)) {
      context.report({
        node: nodesToCheck,
        messageId: 'unexpected',
        data: { name },
      })
    }

    if (nodesToCheck.children) {
      nodesToCheck.children.forEach((node) => checkNodes(node, context))
    }
  }
}

export const unsupportedRouteComponents = createRule({
  meta: {
    type: 'problem',
    docs: {
      description: 'Find unsupported route components',
    },
    messages: {
      unexpected:
        'Unexpected JSX element <{{name}}>. Only <Router>, <Route>, <Set>, <PrivateSet> and <Private> are allowed in the Routes component.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      VariableDeclaration(node) {
        if (isRoutesRenderBlock(node.declarations[0])) {
          const routesDeclaration = node.declarations[0].init

          if (
            routesDeclaration?.type === AST_NODE_TYPES.ArrowFunctionExpression
          ) {
            if (routesDeclaration.body.type === AST_NODE_TYPES.JSXElement) {
              // Routes = () => <Router>...</Router>
              checkNodes(routesDeclaration.body, context)
            } else if (
              routesDeclaration.body.type === AST_NODE_TYPES.BlockStatement
            ) {
              // For when  Routes = () => { return (<Router>...</Router>) }
              if (
                routesDeclaration.body.body[0].type ===
                  AST_NODE_TYPES.ReturnStatement &&
                routesDeclaration.body.body[0].argument?.type ===
                  AST_NODE_TYPES.JSXElement
              ) {
                const routesReturnStatement =
                  routesDeclaration.body.body[0].argument

                checkNodes(routesReturnStatement, context)
              }
            }
          }
        }
      },
    }
  },
})

function isRoutesRenderBlock(node?: TSESTree.VariableDeclarator) {
  return (
    node?.type === AST_NODE_TYPES.VariableDeclarator &&
    node?.id.type === AST_NODE_TYPES.Identifier &&
    node?.id.name === 'Routes'
  )
}
