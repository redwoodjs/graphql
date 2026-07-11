import type { FileInfo, API } from 'jscodeshift'

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift
  const root = j(file.source)

  root
    .find(j.Identifier, {
      type: 'Identifier',
      name: 'validateWith',
    })
    .replaceWith({ type: 'Identifier', name: 'validateWithSync' })

  return root.toSource()
}
