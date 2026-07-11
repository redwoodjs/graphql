import * as t from '@babel/types'
import _ from 'lodash'

import { nodeIs, sieve } from './algorithms'

const OPAQUE_UID_TAG =
  'RW_MERGE_OPAQUE_UID_Q2xldmVyIHlvdSEgSGF2ZSBhIGNvb2tpZS4='

function requireSameType(base, ext) {
  if (base.path.type !== ext.path.type) {
    throw new Error(
      'Attempting to merge nodes with different types. This is not yet supported.',
    )
  }
}

function requireStrategyExists(base, _ext, strategy, strategyName) {
  if (!(base.path.type in strategy)) {
    throw new Error(
      `Attempting to ${strategyName} nodes that do not have an ${strategyName} strategy.`,
    )
  }
}

const strictEquality = (lhs, rhs) => lhs === rhs
const byName = (lhs, rhs) => lhs.name === rhs.name
const byKeyName = (lhs, rhs) => lhs.key.name === rhs.key.name
const byValue = (lhs, rhs) => lhs.value === rhs.value

function defaultEquality(baseContainer, extContainer) {
  const sample =
    (baseContainer.length && baseContainer[0]) ||
    (extContainer.length && extContainer[0])

  const defaults = {
    BigIntLiteral: byValue,
    BooleanLiteral: byValue,
    Identifier: byName,
    NumericLiteral: byValue,
    ObjectProperty: byKeyName,
    StringLiteral: byValue,
  }

  return sample && sample.type in defaults
    ? defaults[sample.type]
    : strictEquality
}

export function opaquely(strategy) {
  strategy[OPAQUE_UID_TAG] = true
  return strategy
}

export function isOpaque(strategy) {
  return strategy[OPAQUE_UID_TAG] === true
}

export const keepBase = opaquely(() => {})

export const keepBoth = opaquely((base, ext) => {
  base.path.insertAfter(ext.path.node)
})

export const keepExtension = opaquely((base, ext) => {
  base.path.replaceWith(ext.path)
})

export const keepBothStatementParents = opaquely((base, ext) => {
  // This creates an ambiguity. How do we treat nodes "between" base and its statement parent? Do we
  // recursively merge those, or not? In other words, are we opaque starting from base, or starting
  // from base.getStatementParent()? If it's the former, this currently works - the node reducer of
  // keepBothStatementParents marks the node as opaque. If it's the latter, this is wrong - again,
  // the node marked is opaque, but nodes which are children of base.getStatementParent(), but
  // parents of base will still be recursively merged by other strategies. I'm not sure what to do.
  base.path.getStatementParent().insertAfter(ext.path.getStatementParent().node)
})

const interleaveStrategy = {
  ImportDeclaration(baseImport, extImport) {
    const baseSpecs = baseImport.specifiers
    const extSpecs = extImport.specifiers

    const importSpecifierEquality = (lhs, rhs) =>
      lhs.type === rhs.type &&
      lhs.imported?.name === rhs.imported?.name &&
      lhs.local?.name == rhs.local?.name

    const uniqueSpecifiersOfType = (type) =>
      _.uniqWith(
        [...baseSpecs, ...extSpecs].filter(nodeIs(type)),
        importSpecifierEquality,
      )

    // Rule 1: If there's exactly 1 import with 0 specifiers, it's a side-effect import and should
    // not be merged, because adding specifiers would change its meaning.
    if (!baseSpecs.length !== !extSpecs.length) {
      return keepBothStatementParents(baseImport, extImport)
    }

    // Rule 2: Default specifiers must appear first, and be unique in a statement.
    const defaultPosition = (specs) =>
      specs.some(nodeIs('ImportDefaultSpecifier')) ? -1 : 0

    // Rule 3: There can only be one wildcard import per statement, and wildcard imports cannot
    // mix with import specifiers.
    const namespacePosition = (specs) =>
      specs.some(nodeIs('ImportNamespaceSpecifier')) ||
      specs.some(nodeIs('ImportSpecifier'))
        ? -1
        : specs.length
    const importPosition = (specs) =>
      specs.some(nodeIs('ImportNamespaceIdentifier')) ? -1 : specs.length

    const [firstSpecifierList, ...rest] = sieve(
      [uniqueSpecifiersOfType('ImportDefaultSpecifier'), defaultPosition],
      [uniqueSpecifiersOfType('ImportNamespaceSpecifier'), namespacePosition],
      [uniqueSpecifiersOfType('ImportSpecifier'), importPosition],
    )

    baseImport.specifiers = firstSpecifierList
    if (rest.length) {
      baseImport.path.insertAfter(
        rest.map((specs) => t.importDeclaration(specs, baseImport.source)),
      )
    }
  },
}
export function interleave(base, ext) {
  requireSameType(base, ext)
  requireStrategyExists(base, ext, interleaveStrategy, 'interleave')
  return interleaveStrategy[base.path.type](base, ext)
}

const concatStrategy = {
  ArrayExpression(base, ext) {
    base.elements = [...base.elements, ...ext.elements]
  },
  ObjectExpression(base, ext) {
    base.properties = [...base.properties, ...ext.properties]
  },
  StringLiteral(base, ext) {
    base.value = base.value.concat(ext.value)
  },
}
export function concat(base, ext) {
  requireSameType(base, ext)
  requireStrategyExists(base, ext, concatStrategy, 'concat')
  return concatStrategy[base.path.type](base, ext)
}

const concatUniqueStrategy = {
  ArrayExpression(base, ext, eq) {
    eq ||= defaultEquality(base.elements, ext.elements)
    base.elements = _.uniqWith([...base.elements, ...ext.elements], eq)
  },
  ObjectExpression(base, ext, eq) {
    eq ||= defaultEquality(base.properties, ext.properties)
    base.properties = _.uniqWith([...base.properties, ...ext.properties], eq)
  },
}
export function concatUnique(baseOrEq, ext) {
  // This function can be used directly as a node reducer, or to return a node reducer.
  // If it's used as a node reducer, it will receive two arguments like any other node reducer.
  //    1) the base to merge into
  //    2) the extension to merge into the base
  // If it's used to return a node reducer, it will receive one argument:
  //    1) the equality operator to use in the returned node reducer
  // So, we call the first argument baseOrEq to represent this duality.

  if (arguments.length === 1) {
    return (base, ext) => {
      requireSameType(base, ext)
      requireStrategyExists(base, ext, concatUniqueStrategy, 'concatUnique')
      return concatUniqueStrategy[base.path.type](base, ext, baseOrEq)
    }
  }

  if (arguments.length === 2) {
    requireSameType(baseOrEq, ext)
    requireStrategyExists(baseOrEq, ext, concatUniqueStrategy, 'concatUnique')
    // The type-specific concatUnique implementations will provide an appropriate equality operator.
    return concatUniqueStrategy[baseOrEq.path.type](baseOrEq, ext)
  }
}
