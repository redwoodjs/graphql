/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck This function was adapted from: https://github.com/gglnx/simplified-jsx-to-json/blob/master/index.js#L13
export const getJsxAttributeValue = (expression: any): any => {
  // If the expression is null, this is an implicitly "true" prop, such as readOnly
  if (expression === null) {
    return true
  }

  if (expression.type === 'StringLiteral') {
    return expression.value
  }

  if (expression.type === 'JSXExpressionContainer') {
    return getJsxAttributeValue(expression.expression)
  }

  if (expression.type === 'ArrayExpression') {
    return expression.elements.map((element) => getJsxAttributeValue(element))
  }

  if (expression.type === 'TemplateLiteral') {
    const expressions = expression.expressions.map((element) => ({
      ...element,
      value: {
        raw: element.value,
        cooked: getJsxAttributeValue(element),
      },
    }))

    return expressions
      .concat(expression.quasis)
      .sort((elementA, elementB) => elementA.start - elementB.start)
      .reduce(
        (string, element) => `${string}${element.value.cooked.toString()}`,
        '',
      )
  }

  if (expression.type === 'ObjectExpression') {
    const entries = expression.properties
      .map((property) => {
        const key = getJsxAttributeValue(property.key)
        const value = getJsxAttributeValue(property.value)

        if (key === undefined || value === undefined) {
          return null
        }

        return { key, value }
      })
      .filter((property) => property)
      .reduce((properties, property) => {
        return { ...properties, [property.key]: property.value }
      }, {})

    return entries
  }

  if (expression.type === 'Identifier') {
    return expression.name
  }

  if (expression.type === 'BinaryExpression') {
    switch (expression.operator) {
      case '+':
        return (
          getJsxAttributeValue(expression.left) +
          getJsxAttributeValue(expression.right)
        )
      case '-':
        return (
          getJsxAttributeValue(expression.left) -
          getJsxAttributeValue(expression.right)
        )
      case '*':
        return (
          getJsxAttributeValue(expression.left) *
          getJsxAttributeValue(expression.right)
        )
      case '**':
        return (
          getJsxAttributeValue(expression.left) **
          getJsxAttributeValue(expression.right)
        )
      case '/':
        return (
          getJsxAttributeValue(expression.left) /
          getJsxAttributeValue(expression.right)
        )
      case '%':
        return (
          getJsxAttributeValue(expression.left) %
          getJsxAttributeValue(expression.right)
        )
      case '==':
        return (
          getJsxAttributeValue(expression.left) ==
          getJsxAttributeValue(expression.right)
        )
      case '===':
        return (
          getJsxAttributeValue(expression.left) ===
          getJsxAttributeValue(expression.right)
        )
      case '!=':
        return (
          getJsxAttributeValue(expression.left) !=
          getJsxAttributeValue(expression.right)
        )
      case '!==':
        return (
          getJsxAttributeValue(expression.left) !==
          getJsxAttributeValue(expression.right)
        )
      case '<':
        return (
          getJsxAttributeValue(expression.left) <
          getJsxAttributeValue(expression.right)
        )
      case '<=':
        return (
          getJsxAttributeValue(expression.left) <=
          getJsxAttributeValue(expression.right)
        )
      case '>':
        return (
          getJsxAttributeValue(expression.left) >
          getJsxAttributeValue(expression.right)
        )
      case '>=':
        return (
          getJsxAttributeValue(expression.left) >=
          getJsxAttributeValue(expression.right)
        )
      case '<<':
        return (
          getJsxAttributeValue(expression.left) <<
          getJsxAttributeValue(expression.right)
        )
      case '>>':
        return (
          getJsxAttributeValue(expression.left) >>
          getJsxAttributeValue(expression.right)
        )
      case '>>>':
        return (
          getJsxAttributeValue(expression.left) >>>
          getJsxAttributeValue(expression.right)
        )
      case '|':
        return (
          getJsxAttributeValue(expression.left) |
          getJsxAttributeValue(expression.right)
        )
      case '&':
        return (
          getJsxAttributeValue(expression.left) &
          getJsxAttributeValue(expression.right)
        )
      case '^':
        return (
          getJsxAttributeValue(expression.left) ^
          getJsxAttributeValue(expression.right)
        )
      default:
        return `BinaryExpression with "${expression.operator}" is not supported`
    }
  }

  if (expression.type === 'UnaryExpression') {
    switch (expression.operator) {
      case '+':
        return +getJsxAttributeValue(expression.argument)
      case '-':
        return -getJsxAttributeValue(expression.argument)
      case '~':
        return ~getJsxAttributeValue(expression.argument)
      default:
        return `UnaryExpression with "${expression.operator}" is not supported`
    }
  }

  // Unsupported type
  return `${expression.type} is not supported`
}
