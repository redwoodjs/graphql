import type {
  FileInfo,
  API,
  JSXExpressionContainer,
  ObjectExpression,
  ObjectProperty,
  Identifier,
} from 'jscodeshift'

function isJsxExpressionContainer(node: any): node is JSXExpressionContainer {
  return node.type === 'JSXExpressionContainer'
}

function isObjectExpression(node: any): node is ObjectExpression {
  return node.type === 'ObjectExpression'
}

function isObjectProperty(node: any): node is ObjectProperty {
  return node.type === 'ObjectProperty'
}

function isIdentifier(node: any): node is Identifier {
  return node.type === 'Identifier'
}

function isPropertyWithName(node: any, name: string) {
  return (
    isObjectProperty(node) &&
    node.key.type === 'Identifier' &&
    node.key.name === name
  )
}

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift
  const root = j(file.source)

  // Find the RedwoodApolloProvider component
  const redwoodApolloProvider = root.findJSXElements('RedwoodApolloProvider')

  // Find the graphQLClientConfig prop
  const graphQLClientConfigCollection = redwoodApolloProvider.find(
    j.JSXAttribute,
    {
      name: { name: 'graphQLClientConfig' },
    },
  )

  let graphQLClientConfig: ReturnType<typeof j.jsxAttribute>

  if (graphQLClientConfigCollection.length === 0) {
    // No pre-existing graphQLClientConfig prop found
    // Creating `graphQLClientConfig={{}}`
    graphQLClientConfig = j.jsxAttribute(
      j.jsxIdentifier('graphQLClientConfig'),
      j.jsxExpressionContainer(j.objectExpression([])),
    )
  } else {
    graphQLClientConfig = graphQLClientConfigCollection.get(0).node
  }

  // We now have a graphQLClientConfig prop. Either one the user already had,
  // or one we just created.
  // Now we want to grab the value of that prop. The value can either be an
  // object, like
  // graphQLClientConfig={{ cacheConfig: { resultCaching: true } }}
  // or it can be a variable, like
  // graphQLClientConfig={graphQLClientConfig}

  const graphQLClientConfigExpression = isJsxExpressionContainer(
    graphQLClientConfig.value,
  )
    ? graphQLClientConfig.value.expression
    : j.jsxEmptyExpression()

  let graphQLClientConfigVariableName = ''

  if (isIdentifier(graphQLClientConfigExpression)) {
    // graphQLClientConfig is already something like
    // <RedwoodApolloProvider graphQLClientConfig={graphQLClientConfig} />
    // Get the variable name
    graphQLClientConfigVariableName = graphQLClientConfigExpression.name
  }

  if (
    !graphQLClientConfigVariableName &&
    !isObjectExpression(graphQLClientConfigExpression)
  ) {
    throw new Error(
      "Error configuring possibleTypes. You'll have to do it manually. " +
        "(Could not find a graphQLClientConfigExpression of the correct type, it's a " +
        graphQLClientConfigExpression.type +
        ')',
    )
  }

  if (isObjectExpression(graphQLClientConfigExpression)) {
    // graphQLClientConfig is something like
    // <RedwoodApolloProvider
    //   graphQLClientConfig={{ cacheConfig: { resultCaching: true } }}
    // >

    // Find
    // `const App = () => { ... }`
    // and insert
    // `const graphQLClientConfig = { cacheConfig: { resultCaching: true } }`
    // before it
    graphQLClientConfigVariableName = 'graphQLClientConfig'
    root
      .find(j.VariableDeclaration, {
        declarations: [
          {
            type: 'VariableDeclarator',
            id: { type: 'Identifier', name: 'App' },
          },
        ],
      })
      .insertBefore(
        j.variableDeclaration('const', [
          j.variableDeclarator(
            j.identifier(graphQLClientConfigVariableName),
            graphQLClientConfigExpression,
          ),
        ]),
      )
  }

  // Find `const graphQLClientConfig = { ... }`. It's going to either be the
  // one we just created above, or the one the user already had, with the name
  // we found in the `graphQLClientConfig prop expression.
  const configVariableDeclarators = root.findVariableDeclarators(
    graphQLClientConfigVariableName,
  )

  const configExpression = configVariableDeclarators.get(0)?.node.init

  if (!isObjectExpression(configExpression)) {
    throw new Error(
      "Error configuring possibleTypes. You'll have to do it manually. " +
        '(Could not find a graphQLClientConfig variable ObjectExpression)',
    )
  }

  // Now we have the value of the graphQLClientConfig const. And we know it's
  // an object. Let's see if the object has a `cacheConfig` property.

  let cacheConfig = configExpression.properties.find((prop) =>
    isPropertyWithName(prop, 'cacheConfig'),
  )

  if (!cacheConfig) {
    // No `cacheConfig` property. Let's insert one!
    cacheConfig = j.objectProperty(
      j.identifier('cacheConfig'),
      j.objectExpression([]),
    )
    configExpression.properties.push(cacheConfig)
  }

  if (!isObjectProperty(cacheConfig)) {
    throw new Error(
      "Error configuring possibleTypes. You'll have to do it manually. " +
        '(cacheConfig is not an ObjectProperty)',
    )
  }

  const cacheConfigValue = cacheConfig.value

  if (!isObjectExpression(cacheConfigValue)) {
    throw new Error(
      "Error configuring possibleTypes. You'll have to do it manually. " +
        '(cacheConfigValue is not an ObjectExpression)',
    )
  }

  // Now we know we have a `graphQLClientConfig` object, and that it has a
  // `cacheConfig` property. Let's check if it has a `possibleTypes` property.
  // If it doesn't we'll insert one, with the correct value

  const possibleTypes = cacheConfigValue.properties.find((prop) =>
    isPropertyWithName(prop, 'possibleTypes'),
  )

  if (!possibleTypes) {
    const property = j.property(
      'init',
      j.identifier('possibleTypes'),
      j.identifier('possibleTypes.possibleTypes'),
    )
    // property.shorthand = true
    cacheConfigValue.properties.push(property)
  }

  // Now we have a proper graphQLClientConfig object stored in a const. Now we
  // just need to tell <RedwoodApolloProvider> about it by setting the
  // `graphQLClientConfig` prop

  // Remove existing graphQLClientConfig prop (if there is one) and then add a
  // new one for the variable we created or updated
  graphQLClientConfigCollection.remove()
  redwoodApolloProvider
    .get(0)
    .node.openingElement.attributes.push(
      j.jsxAttribute(
        j.jsxIdentifier('graphQLClientConfig'),
        j.jsxExpressionContainer(j.identifier(graphQLClientConfigVariableName)),
      ),
    )

  return root.toSource()
}
