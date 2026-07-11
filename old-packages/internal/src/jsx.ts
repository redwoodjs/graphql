import type { types } from '@babel/core'
import traverse from '@babel/traverse'

import { getJsxAttributeValue } from './jsxAttributeValue'

interface JsxElement {
  name: string
  props: Record<string, any>
  children?: JsxElement[]
  location: {
    line: number
    column: number
  }
}
/**
 * Extract JSX elements, children and props from static code.
 */
export const getJsxElements = (ast: types.Node, name: string) => {
  let elements: JsxElement[] = []
  traverse(ast, {
    JSXIdentifier(path) {
      if (
        path.node.name === name &&
        path.parentPath.type === 'JSXOpeningElement'
      ) {
        if (path?.parentPath?.parentPath?.type === 'JSXElement') {
          const element = reduceJsxElement([], path.parentPath.parentPath.node)
          elements = elements.concat(element)
        }
      }
    },
  })
  return elements
}

/**
 * Extract attributes (props) from a JSX element.
 */
const getJsxAttributes = (jsxElement: types.JSXElement) => {
  return jsxElement.openingElement.attributes.filter(
    ({ type }) => type === 'JSXAttribute',
  ) as types.JSXAttribute[]
}

/**
 * Extract and format props (attributes) from a JSX element.
 */
const getJsxProps = (jsxElement: types.JSXElement) => {
  const attributes = getJsxAttributes(jsxElement)

  const props: Record<string, any> = {}
  for (const a of attributes) {
    if (typeof a.name.name === 'string') {
      props[a.name.name] = getJsxAttributeValue(a.value)
    }
  }
  return props
}

/**
 * Traverse a JSX element tree and place it into a simple JSON format.
 */
const reduceJsxElement = (oldNode: JsxElement[], currentNode: types.Node) => {
  let element = {
    name: '',
    props: {},
    children: [],
    location: {
      line: 1,
      column: 0,
    },
  }

  if (currentNode.type === 'JSXElement') {
    const props = getJsxProps(currentNode)

    if (currentNode.openingElement.name.type === 'JSXIdentifier') {
      element = {
        name: currentNode.openingElement.name.name,
        props,
        children: [],
        location: {
          line: currentNode.openingElement.loc?.start.line ?? 1,
          column: currentNode.openingElement.loc?.start.column ?? 0,
        },
      }
      oldNode.push(element)
    }
  }

  if ('children' in currentNode) {
    currentNode.children.forEach((node) =>
      oldNode.length > 0
        ? reduceJsxElement(element.children, node)
        : reduceJsxElement(oldNode, node),
    )
  }

  return oldNode
}
