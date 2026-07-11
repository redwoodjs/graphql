import type { FileInfo, API } from 'jscodeshift'

// We need to check all of the cell functions
const cellFunctionsToCheck = ['Success', 'Failure', 'Loading', 'Empty']

// The list of properties which are no longer being spread
// See https://www.apollographql.com/docs/react/data/queries/#result for apollo query result properties
const nonSpreadVariables = [
  'previousData',
  'variables',
  'networkStatus',
  'client',
  'called',
  'refetch',
  'fetchMore',
  'startPolling',
  'stopPolling',
  'subscribeToMore',
  'updateQuery',
]

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift
  const ast = j(file.source)

  cellFunctionsToCheck.forEach((variableName) => {
    const foundCellFunctions = ast.findVariableDeclarators(variableName)
    if (foundCellFunctions.size() === 1) {
      const foundFunction = foundCellFunctions.paths()[0]

      // We expect the variable to be a function (standard or arrow)
      if (
        foundFunction.value.init?.type === 'ArrowFunctionExpression' ||
        foundFunction.value.init?.type === 'FunctionExpression'
      ) {
        const firstParameter = foundFunction.value.init.params.at(0)

        // No parameters taken by the function
        if (!firstParameter) {
          // Do nothing...
        } else {
          // We expect the function to be destructuring the properties the cell is passed
          if (firstParameter.type === 'ObjectPattern') {
            const previouslySpreadPropertiesInUse =
              firstParameter.properties.filter((property) => {
                // skip rest params
                if (
                  property.type === 'SpreadProperty' ||
                  property.type === 'SpreadPropertyPattern' ||
                  property.type === 'RestProperty' ||
                  property.key.type !== 'Identifier'
                ) {
                  return false
                }

                return nonSpreadVariables.includes(property.key.name)
              })

            if (previouslySpreadPropertiesInUse.length > 0) {
              // Add the newly destructured properties as function parameters
              firstParameter.properties.push(
                j.property(
                  'init',
                  j.identifier('queryResult'), // Previously spead properties are now found within 'queryResult'
                  j.objectPattern(
                    // For every previously spead property in use add a destructuring
                    previouslySpreadPropertiesInUse.map((usedProperty) => {
                      if (
                        !('key' in usedProperty) ||
                        !('value' in usedProperty) ||
                        usedProperty.key.type !== 'Identifier' ||
                        usedProperty.value.type !== 'Identifier'
                      ) {
                        throw new Error(
                          'Unable to process a parameter within the cell function',
                        )
                      }

                      const prop = j.property(
                        'init',
                        j.identifier(usedProperty.key.name),
                        j.identifier(usedProperty.value.name),
                      )
                      // Use an alias if one was previously defined by the user
                      prop.shorthand = usedProperty.shorthand
                      return prop
                    }),
                  ),
                ),
              )
              // Remove the existing function parameters corresponding to previously spread variables
              firstParameter.properties = firstParameter.properties.filter(
                (property) => {
                  if (
                    !('key' in property) ||
                    property.key.type !== 'Identifier'
                  ) {
                    throw new Error('Unable to process a parameter')
                  }
                  return !nonSpreadVariables.includes(property.key.name)
                },
              )
            }
          } else {
            console.warn(
              `The first parameter to '${variableName}' was not an object and we could not process this.`,
            )
          }
        }
      } else {
        console.warn(
          `'${variableName}' is not a function and we could not process this.`,
        )
      }
    } else {
      console.warn(`Could not find a unique '${variableName}' variable`)
    }
  })

  return ast.toSource({
    trailingComma: true,
    quote: 'single',
    lineTerminator: '\n',
  })
}
