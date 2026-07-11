import type { FileInfo, API } from 'jscodeshift'

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift
  const ast = j(file.source)

  // Get the expected variable declaration
  const node = ast.find(j.VariableDeclaration, {
    declarations: [{ id: { name: 'redwoodAppElement' } }],
  })

  // If it doesn't exist, bail out and let the user know
  if (node.length === 0) {
    console.warn(
      "\nCould not find 'redwoodAppElement' variable declaration. Please make the necessary changes to your 'web/src/index.js' file manually.\n",
    )
    return file.source
  }

  // Insert the new null check
  node.insertAfter(
    j.ifStatement(
      j.unaryExpression('!', j.identifier('redwoodAppElement')),
      j.blockStatement([
        j.throwStatement(
          j.newExpression(j.identifier('Error'), [
            j.literal(
              "Could not find an element with ID 'redwood-app'. Please ensure it exists in your 'web/src/index.html' file.",
            ),
          ]),
        ),
      ]),
    ),
  )

  return ast.toSource()
}
