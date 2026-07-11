import { parse, traverse } from '@babel/core'
import generate from '@babel/generator'
import { VISITOR_KEYS } from '@babel/types'
import { partition, forEachRight } from 'lodash'
import prettier from 'prettier'

import { forEachFunctionOn, nodeIs } from './algorithms'
import { semanticIdentity } from './semanticIdentity'
import { isOpaque } from './strategy'

function extractProperty(property, fromObject) {
  if (property === undefined) {
    return undefined
  }
  const tmp = fromObject[property]
  delete fromObject[property]
  return tmp
}

// This feels like a weird way to achieve something so simple in Babel, but I can't find a better
// alternative.
function getProgramPath(ast) {
  let programPath
  traverse(ast, {
    Program(path) {
      programPath = path
      return
    },
  })
  if (programPath === undefined) {
    throw new Error('Unable to find Program node in AST')
  }
  return programPath
}

// See https://github.com/babel/babel/issues/14480
function skipChildren(path) {
  for (const key of VISITOR_KEYS[path.type]) {
    path.skipKey(key)
  }
}

/**
 * We can make merge strategies more terse and intuitive if we pass a Babel Node, rather than a
 * NodePath, to the reducer. This would allow us to write:
 *
 * ArrayExpression: (lhs, rhs) => { lhs.elements.push(...rhs.elements) }
 * instead of
 * ArrayExpression: (lhs, rhs) => { lhs.node.elements.push(...rhs.node.elements) }
 *
 * It may seem like a small difference, but the code is much more intuitive if you don't have to
 * think about Babel nodes vs paths when writing reducers.
 *
 * We could just pass the node directly to the reducer, but there are reasonable (though rare) cases
 * where you do want access to the NodePath. To solve this, we create a proxy object that appears as
 * a Babel Node with an additional `path` property that points back to the NodePath.
 */
function makeProxy(path) {
  return new Proxy(path, {
    get(target, property) {
      if (property === 'path') {
        return target
      } else {
        return target.node[property]
      }
    },
    set(target, property, value) {
      if (property === 'path') {
        throw new Error("You can't set a path on a proxy!")
      } else {
        target.node[property] = value
        return true
      }
    },
    has(target, property) {
      return property in target.node
    },
  })
}

function expressionUses(exp, ...ids) {
  let result = false
  exp.traverse({
    Identifier(path) {
      if (
        !path.parentPath.isNodeType('VariableDeclarator') &&
        ids.includes(path.node.name)
      ) {
        result = true
        return
      }
    },
  })
  return result
}

// Insert the given expression before the first usage of its name in 'path', or at the end of the
// program body if no such usage exists.
function insertBeforeFirstUsage(expression, program) {
  const body = program.get('body')
  const pos = body.findIndex((exp) =>
    expressionUses(exp, ...Object.keys(expression.getBindingIdentifiers())),
  )
  return pos !== -1
    ? body[pos].insertBefore(expression.node)
    : program.pushContainer('body', expression.node)
}

function insertAfterLastImport(expression, program) {
  const body = program.get('body')
  return body[
    body.findLastIndex((bodyExpr) => bodyExpr.isNodeType('ImportDeclaration'))
  ].insertAfter(expression.node)
}

function prune(path) {
  switch (path.parentPath.type) {
    // If pruning 'path' would yield an ill-formed parent (e.g, '{foo:}' or 'const x;'), prune it.
    case 'ObjectProperty':
    case 'VariableDeclarator':
      return path.parentPath.remove()
    default:
      console.log(`Warning: default prune strategy for ${path.parentPath.type}`)
    // eslint-disable-next-line no-fallthrough
    case 'Program':
    case 'ArrayExpression':
      return path.remove()
  }
}

// When merging, trailing comments are a bit nasty. A comment can be parsed as a leading comment
// of one expression, and a trailing comment of a subsequent expression. This is sort of an open
// issue for Babel: https://github.com/babel/babel/issues/7002, but we can work around it pretty
// easily with the following:
function stripTrailingCommentsStrategy() {
  return {
    enter(path) {
      path.node.trailingComments = []
    },
  }
}

/**
 * The node types specified in the strategy are copied from extAST into baseAST.
 *
 * @param { import("@babel/core").ParseResult } baseAST
 * @param { import("@babel/core").ParseResult } extAST
 * @param { Object } strategy
 *
 * 1. Traverse extAST and track the semantic IDs of all of the nodes for which we have a merge
 *    strategy.
 * 2. Traverse baseAST. On node exit, attempt to merge semantically-equivalent ext nodes.
 *     a. When a semantically equivalent ext node is merged, it is pruned from ext.
 * 3. Traverse extAST's body (if any nodes remain) and attempt to put top-level declarations at
 *    their latest-possible positions.
 *     a. Latest-possible is defined as the position immediately preceeding the first use of the
 *     node's binding, if it exists.
 */
function mergeAST(baseAST, extAST, strategy = {}) {
  const identity = extractProperty('identity', strategy) ?? semanticIdentity
  const identities = {}
  const baseVisitor = { ...stripTrailingCommentsStrategy() }
  const extVisitor = { ...stripTrailingCommentsStrategy() }

  forEachFunctionOn(strategy, (typename, strat) => {
    extVisitor[typename] = {
      enter(path) {
        const id = identity(path)
        id && (identities[id] ||= []).push(path)
      },
    }
    baseVisitor[typename] = {
      enter(path) {
        if (isOpaque(strat)) {
          skipChildren(path)
        }
      },
      exit(path) {
        const exts = extractProperty(identity(path), identities)
        if (exts) {
          const proxyPath = makeProxy(path)
          exts.map(makeProxy).forEach((ext) => {
            strat(proxyPath, ext)
            prune(ext.path)
          })
        }
      },
    }
  })

  traverse(extAST, extVisitor)
  traverse(baseAST, baseVisitor)

  const baseProgram = getProgramPath(baseAST)
  const [imports, others] = partition(
    getProgramPath(extAST).get('body'),
    nodeIs('ImportDeclaration'),
  )

  imports.forEach((exp) => insertAfterLastImport(exp, baseProgram))
  forEachRight(others, (exp) => insertBeforeFirstUsage(exp, baseProgram))
}

/**
 * Copy specified AST nodes from extension into base. Use reducer functions specified in strategy to
 * recursively merge from leaf to root.
 * @param {string} base - a string of JavaScript code. Must be well-formed.
 * @param {string} extension - a string of JavaScript code. May refer to bindings only defined in base.
 * @param {Object} strategy - Mapping of AST node name to reducer functions.
 * @returns
 */
export async function merge(base, extension, strategy) {
  function parseReact(code) {
    return parse(code, {
      filename: 'merged.tsx', // required to prevent babel error. The .tsx is relevant
      presets: ['@babel/preset-typescript'],
    })
  }

  const baseAST = parseReact(base)
  const extAST = parseReact(extension)

  mergeAST(baseAST, extAST, strategy)
  const { code } = generate(baseAST)

  // When testing, use prettier here to produce predictable outputs.
  // Otherwise, leave formatting to the caller.
  return process.env.VITEST_POOL_ID
    ? await prettier.format(code, {
        parser: 'babel-ts',
        bracketSpacing: true,
        tabWidth: 2,
        semi: false,
        singleQuote: true,
      })
    : code
}
