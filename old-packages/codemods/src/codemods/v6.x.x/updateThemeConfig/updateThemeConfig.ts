import type { FileInfo, API } from 'jscodeshift'

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift
  const root = j(file.source)

  // Find all module.exports assignments
  root
    .find(j.AssignmentExpression, {
      left: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'module' },
        property: { type: 'Identifier', name: 'exports' },
      },
    })
    .forEach((path) => {
      const configObject = path.value.right

      let themeObjectName = 'theme'

      if (j.Identifier.check(configObject)) {
        // If it already is an identifier, reuse it
        // modules.exports = theme -> export default theme
        // Note that export default statement is added outside this if statement
        themeObjectName = configObject.name

        // Remove module.exports assignment
        j(path).remove()
      } else {
        // Create const declaration with the exported object
        const declaration = j.variableDeclaration('const', [
          j.variableDeclarator(j.identifier(themeObjectName), configObject),
        ])

        // Replace module.exports assignment with the const declaration
        // module.exports = {...} -> const theme = {...}
        j(path).replaceWith(declaration)
      }

      // Add export default statement
      const exportDefaultStatement = j.exportDefaultDeclaration(
        j.identifier(themeObjectName),
      )

      j(path.parentPath).insertAfter(exportDefaultStatement)
    })

  return root.toSource()
}
