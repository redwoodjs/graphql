import type { FileInfo, API } from 'jscodeshift'

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift
  const root = j(file.source)

  const possibleTypesImports = root.find(j.ImportDeclaration)

  const hasPossibleTypesImport = possibleTypesImports.some((i) => {
    return (
      i.get('source').value.value === 'src/graphql/possibleTypes' ||
      i.get('source').value.value === './graphql/possibleTypes'
    )
  })

  if (!hasPossibleTypesImport) {
    possibleTypesImports
      .at(1)
      .insertAfter(
        j.importDeclaration(
          [j.importDefaultSpecifier(j.identifier('possibleTypes'))],
          j.literal('src/graphql/possibleTypes'),
        ),
      )
  }

  return root.toSource()
}
