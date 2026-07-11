import type { TSESTree } from '@typescript-eslint/utils'
import { ESLintUtils, AST_NODE_TYPES } from '@typescript-eslint/utils'

const createRule = ESLintUtils.RuleCreator.withoutDocs

function isProcessEnv(node: TSESTree.Node) {
  return (
    node.type === AST_NODE_TYPES.MemberExpression &&
    hasName(node.object, 'process') &&
    hasName(node.property, 'env')
  )
}

function hasName(node: TSESTree.Node, name: string) {
  return node.type === AST_NODE_TYPES.Identifier && node.name === name
}

function isTestFile(filename: string) {
  return (
    filename.endsWith('.test.ts') ||
    filename.endsWith('.test.js') ||
    filename.endsWith('.test.tsx') ||
    filename.endsWith('.test.jsx') ||
    filename.endsWith('.test.mts') ||
    filename.endsWith('.test.mjs') ||
    filename.endsWith('.test.cjs') ||
    filename.endsWith('.spec.ts') ||
    filename.endsWith('.spec.js') ||
    filename.endsWith('.spec.tsx') ||
    filename.endsWith('.spec.jsx') ||
    filename.endsWith('.spec.mts') ||
    filename.endsWith('.spec.mjs') ||
    filename.endsWith('.spec.cjs') ||
    filename.includes('/__tests__/')
  )
}

export const processEnvComputedRule = createRule({
  meta: {
    type: 'problem',
    docs: {
      description: 'Find computed member access on process.env',
    },
    messages: {
      unexpected:
        'Accessing process.env via array syntax will break in production. Use dot notation e.g. process.env.MY_ENV_VAR instead',
    },
    schema: [], // No additional configuration needed
  },
  defaultOptions: [],
  create(context) {
    return {
      MemberExpression: function (node) {
        const matches =
          isProcessEnv(node.object) &&
          node.computed &&
          !isTestFile(context.filename)

        if (matches) {
          context.report({
            messageId: 'unexpected',
            node,
          })
        }
      },
    }
  },
})
