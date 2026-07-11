import type { FileInfo, API } from 'jscodeshift'

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift
  const ast = j(file.source)

  ast.find(j.AssignmentExpression).forEach((path) => {
    const lhs = path.value.left
    const rhs = path.value.right
    if (lhs && rhs.type === 'Identifier' && rhs.name === 'config') {
      j(path).replaceWith(
        j.expressionStatement(
          j.assignmentExpression(
            '=',
            j.identifier('module.exports'),
            j.identifier('{ config }'),
          ),
        ),
      )
    }
  })

  return ast.toSource()
}
