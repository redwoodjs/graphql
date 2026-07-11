import { parse, traverse } from '@babel/core'
import { describe, it, expect } from 'vitest'

import { semanticIdentity } from '../merge/semanticIdentity'

function expectSemanticId(rootPath, type, predicate, expectedIdentity) {
  const state = { result: undefined }
  const visitor = {}
  visitor[type] = (path, state) => {
    if (predicate(path)) {
      state.result = path
      return
    }
  }
  traverse(rootPath, visitor, undefined, state)
  expect(state.result).toBeDefined()
  expect(semanticIdentity(state.result)).toBe(expectedIdentity)
}

function expectSemanticIdForRoot(root) {
  return (type, predicate, expectedIdentity) => {
    return expectSemanticId(root, type, predicate, expectedIdentity)
  }
}

const getProgramNode = (code) => {
  let result = undefined
  traverse(parse(code), {
    Program(path) {
      result = path.node
    },
  })
  expect(result).toBeDefined()
  return result
}

describe('Basic behavior', () => {
  const code = `\
    import { foo } from 'src'

    export const globalTypes = {
      locale: {
        name: 'Locale',
        description: 'Internationalization locale',
        defaultValue: 'en',
        toolbar: {
          icon: 'globe',
          items: [
            { value: 'en', right: '🇺🇸', title: 'English' },
            { value: 'fr', right: '🇫🇷', title: 'Français' },
          ],
        },
      },
    }

    const nestedArray = [1, 2, 3, [4, 5, 6, [7, 8, 9]]]

    const func = (param1, param2) => {
        const hello = "Hello"
        return param1 + param2
    }`

  const expId = expectSemanticIdForRoot(getProgramNode(code))

  it('Identifies import statements', () => {
    expId(
      'ImportDeclaration',
      (i) => i.node.source.value === 'src',
      'Program.ImportDeclaration.source.src',
    )
  })

  it('Identifies export declarations', () => {
    expId(
      'VariableDeclarator',
      (e) => e.node.id.name === 'globalTypes',
      'Program.ExportNamedDeclaration.VariableDeclaration.globalTypes',
    )
  })

  it('Identifies top-level object properties', () => {
    expId(
      'ObjectProperty',
      (p) => p.node.key.name === 'locale',
      'Program.ExportNamedDeclaration.VariableDeclaration.globalTypes.ObjectExpression.locale',
    )
  })

  it('Identifies nested object properties', () => {
    expId(
      'ObjectProperty',
      (p) => p.node.key.name === 'items',
      'Program.ExportNamedDeclaration.VariableDeclaration.globalTypes.ObjectExpression.locale.ObjectExpression.toolbar.ObjectExpression.items',
    )
  })

  it('identifies nested arrays', () => {
    expId(
      'ArrayExpression',
      (p) => p.node.elements[0].value === 7,
      'Program.VariableDeclaration.nestedArray.ArrayExpression.ArrayExpression.ArrayExpression',
    )
  })

  it('identifies function objects', () => {
    expId(
      'ArrowFunctionExpression',
      (p) => p.parentPath.node.id.name === 'func',
      'Program.VariableDeclaration.func.ArrowFunctionExpression',
    )
  })

  it('identifies expressions inside functions', () => {
    expId(
      'VariableDeclarator',
      (p) => p.node.id.name === 'hello',
      'Program.VariableDeclaration.func.ArrowFunctionExpression.BlockStatement.VariableDeclaration.hello',
    )
  })

  it('identifies anonymous expressions', () => {
    expId(
      'ObjectExpression',
      (p) =>
        p.node.properties[0].key.name === 'value' &&
        p.node.properties[0].value.value === 'en',
      'Program.ExportNamedDeclaration.VariableDeclaration.globalTypes.ObjectExpression.locale.ObjectExpression.toolbar.ObjectExpression.items.ArrayExpression.ObjectExpression',
    )
  })
})
