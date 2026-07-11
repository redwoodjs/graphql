import type { FileInfo, API } from 'jscodeshift'

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift
  const ast = j(file.source)

  // Within createGraphQLHandler, look for the `depthLimitOptions` option and replace it with `armorConfig`
  // and the original value of `maxDepth`
  ast
    .find(j.CallExpression, { callee: { name: 'createGraphQLHandler' } })
    .forEach((path) => {
      const depthLimitOptionsProp = j(path.node).find(j.ObjectProperty, {
        key: {
          name: 'depthLimitOptions',
        },
      })

      if (depthLimitOptionsProp.length > 0) {
        console.info(`Updating createGraphQLHandler config in ${file.path} ...`)
        const maxDepthProp = depthLimitOptionsProp.find(j.ObjectProperty, {
          key: {
            name: 'maxDepth',
          },
        })

        const depthLimitOption = maxDepthProp.find(j.Literal)

        if (depthLimitOption.length > 0) {
          const depthLimitOptionValue = depthLimitOption.at(0).get().value.value

          depthLimitOptionsProp.replaceWith([
            j.identifier(
              `armorConfig: { maxDepth: { n: ${depthLimitOptionValue || 11} } }`,
            ),
          ])

          console.info(
            `useArmor configured to use existing maxDepth of ${
              depthLimitOptionValue || 11
            }.`,
          )
        }
      } else {
        console.info(
          `No mods needed to createGraphQLHandler config in ${file.path}. Skipping...`,
        )
      }
    })

  return ast.toSource({
    trailingComma: true,
    quote: 'single',
    lineTerminator: '\n',
  })
}
