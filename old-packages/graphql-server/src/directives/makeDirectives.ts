import { Kind, type DocumentNode } from 'graphql'

import type {
  RedwoodDirective,
  TransformerDirective,
  TransformerDirectiveFunc,
  ValidatorDirective,
  ValidatorDirectiveFunc,
} from '../plugins/useRedwoodDirective'
import { DirectiveType } from '../plugins/useRedwoodDirective'

/*
We want directivesGlobs type to be an object with this shape:
But not fully supported in TS
{
  schema: DocumentNode // <-- required
  [string]: RedwoodDirective
}
*/
export type DirectiveGlobImports = Record<string, any>

export const makeDirectivesForPlugin = (
  directiveGlobs: DirectiveGlobImports,
): RedwoodDirective[] => {
  return Object.entries(directiveGlobs).flatMap(
    ([importedGlobName, exports]) => {
      // In case the directives get nested, their name comes as nested_directory_filename_directive

      // directiveName is the filename without the directive extension
      // slice gives us ['fileName', 'directive'], so we take the first one
      const [directiveNameFromFile] = importedGlobName.split('_').slice(-2)

      // We support exporting both directive name and default
      // e.g. export default createValidatorDirective(schema, validationFunc)
      // or export requireAuth = createValidatorDirective(schema, checkAuth)
      const directive = (exports[directiveNameFromFile] ||
        exports.default) as RedwoodDirective

      if (!directive.type) {
        throw new Error(
          'Please use `createValidatorDirective` or `createTransformerDirective` functions to define your directive',
        )
      }

      return [directive]
    },
  )
}

export const getDirectiveName = (schema: DocumentNode) => {
  const definition = schema.definitions.find(
    (definition) => definition.kind === Kind.DIRECTIVE_DEFINITION,
  )

  return definition?.name?.value
}

export const createValidatorDirective = (
  schema: DocumentNode,
  directiveFunc: ValidatorDirectiveFunc,
): ValidatorDirective => {
  const directiveName = getDirectiveName(schema)

  if (!directiveName) {
    throw new Error('Could not parse directive schema')
  }

  if (typeof directiveFunc !== 'function') {
    throw new Error(
      `Directive validation function not implemented for @${directiveName}`,
    )
  }

  return {
    name: directiveName,
    schema,
    onResolvedValue: directiveFunc,
    type: DirectiveType.VALIDATOR,
  }
}

export const createTransformerDirective = (
  schema: DocumentNode,
  directiveFunc: TransformerDirectiveFunc,
): TransformerDirective => {
  const directiveName = getDirectiveName(schema)

  if (!directiveName) {
    throw new Error('Could not parse directive schema')
  }

  if (typeof directiveFunc !== 'function') {
    throw new Error(
      `Directive transformer function not implemented for @${directiveName}`,
    )
  }

  return {
    name: directiveName,
    schema,
    onResolvedValue: directiveFunc,
    type: DirectiveType.TRANSFORMER,
  }
}
