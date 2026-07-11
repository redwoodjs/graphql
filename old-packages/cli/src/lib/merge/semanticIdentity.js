export function semanticIdentity(path) {
  const identity = {
    get(path) {
      return path.type in this ? this[path.type](path) : [path.type]
    },
    ObjectProperty: (path) => [path.node.key.name],
    VariableDeclarator: (path) => [path.node.id.name],
    ImportDeclaration: (path) => [
      'ImportDeclaration',
      'source',
      path.node.source.value,
    ],
  }

  return path
    .getAncestry()
    .reduce((acc, i) => [...identity.get(i), ...acc], [])
    .join('.')
}
