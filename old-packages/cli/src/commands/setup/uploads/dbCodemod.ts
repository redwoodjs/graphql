import j from 'jscodeshift'

module.exports = function transform(fileInfo: j.FileInfo) {
  const root = j(fileInfo.source)

  // Add the import statement for storagePrismaExtension
  const imports = root.find(j.ImportDeclaration)

  imports
    .at(-1) // add it after the last one
    .insertAfter(
      j.importDeclaration(
        [j.importSpecifier(j.identifier('storagePrismaExtension'))],
        j.literal('./uploads'),
      ),
    )

  // Find the export statement for db and modify it
  root
    .find(j.VariableDeclaration, { declarations: [{ id: { name: 'db' } }] })
    .forEach((path) => {
      const dbDeclaration = path.node.declarations[0]

      if (
        j.VariableDeclarator.check(dbDeclaration) &&
        j.NewExpression.check(dbDeclaration.init)
      ) {
        throw new Error('RW_CODEMOD_ERR_OLD_FORMAT')
      }

      if (
        j.VariableDeclarator.check(dbDeclaration) &&
        j.Expression.check(dbDeclaration.init)
      ) {
        const newInit = j.callExpression(
          j.memberExpression(dbDeclaration.init, j.identifier('$extends')),
          [j.identifier('storagePrismaExtension')],
        )
        dbDeclaration.init = newInit
      }
    })

  return root.toSource()
}
