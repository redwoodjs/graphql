import type { FileInfo, API } from 'jscodeshift'

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift
  const root = j(file.source)

  root
    .find(j.MemberExpression, {
      object: {
        type: 'MemberExpression',
        object: { name: 'process' },
        property: { name: 'env' },
      },
    })
    .forEach((path) => {
      const envVarName = path.value.property

      // Only apply the codemod if process.env['bbb']
      // where bbb is the string literal. Otherwise it catches process.env.bbb too
      if (j.StringLiteral.check(envVarName)) {
        const dotNotation = j.memberExpression(
          j.memberExpression(j.identifier('process'), j.identifier('env')),
          j.identifier(envVarName.value),
        )
        j(path).replaceWith(dotNotation)
      }
    })

  return root.toSource()
}
