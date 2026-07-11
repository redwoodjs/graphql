import type { FileInfo, API } from 'jscodeshift'

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift
  const ast = j(file.source)

  ast
    .find(j.Identifier, { name: 'global' })
    .replaceWith(j.identifier('globalThis'))

  return ast.toSource()
}
