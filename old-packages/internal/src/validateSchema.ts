import { CodeFileLoader } from '@graphql-tools/code-file-loader'
import { loadTypedefs } from '@graphql-tools/load'
import { mergeTypeDefs } from '@graphql-tools/merge'
import type { DocumentNode, ObjectTypeDefinitionNode } from 'graphql'
import { Kind, visit } from 'graphql'

import { rootSchema } from '@redwoodjs/graphql-server'
import { getPaths } from '@redwoodjs/project-config'

import { isServerFileSetup, isRealtimeSetup } from './project'

export const DIRECTIVE_REQUIRED_ERROR_MESSAGE =
  'You must specify one of @requireAuth, @skipAuth or a custom directive'

export const DIRECTIVE_INVALID_ROLE_TYPES_ERROR_MESSAGE =
  'Please check that the requireAuth roles is a string or an array of strings.'

/**
 * These are names that are commonly used in GraphQL schemas as scalars
 * and would cause a conflict if used as a type name.
 *
 * Note: Query, Mutation, and Subscription are not included here because
 * they are checked for separately.
 */
export const RESERVED_TYPES = [
  'Int',
  'Float',
  'Boolean',
  'String',
  'DateTime',
  'ID',
  'uid',
  'as',
]

export function validateSchema(
  schemaDocumentNode: DocumentNode,
  typesToCheck: string[] = ['Query', 'Mutation'],
) {
  const validationOutput: string[] = []
  const reservedNameValidationOutput: Record<string, any> = []
  const directiveRoleValidationOutput: Record<string, any> = []

  // Is Subscriptions are enabled with Redwood Realtime, then enforce a rule
  // that a Subscription type needs to have a authentication directive applied,
  // just as Query and Mutation requires
  if (isServerFileSetup() && isRealtimeSetup()) {
    typesToCheck.push('Subscription')
  }

  visit(schemaDocumentNode, {
    InterfaceTypeDefinition(typeNode) {
      // Warn that an interface definition in the SDL is using a reserved GraphQL type
      if (RESERVED_TYPES.includes(typeNode.name.value)) {
        reservedNameValidationOutput.push({
          objectType: 'interface',
          name: typeNode.name.value,
        })
      }
    },
    InputObjectTypeDefinition(typeNode) {
      // Warn that an input definition in the SDL is using a reserved GraphQL type
      if (RESERVED_TYPES.includes(typeNode.name.value)) {
        reservedNameValidationOutput.push({
          objectType: 'input type',
          name: typeNode.name.value,
        })
      }
    },
    ObjectTypeDefinition(typeNode) {
      // Warn that a type definition in the SDL is using a reserved GraphQL type
      if (RESERVED_TYPES.includes(typeNode.name.value)) {
        reservedNameValidationOutput.push({
          objectType: 'type',
          name: typeNode.name.value,
        })
      }
      if (typesToCheck.includes(typeNode.name.value)) {
        for (const field of typeNode.fields ||
          ([] as ObjectTypeDefinitionNode[])) {
          const fieldName = field.name.value
          const fieldTypeName = typeNode.name.value

          const isRedwoodQuery =
            fieldName === 'redwood' && fieldTypeName === 'Query'
          const isCurrentUserQuery =
            fieldName === 'currentUser' && fieldTypeName === 'Query'
          // skip validation for redwood query and currentUser
          if (!(isRedwoodQuery || isCurrentUserQuery)) {
            const hasDirective = field.directives?.length

            if (!hasDirective) {
              validationOutput.push(`${fieldName} ${fieldTypeName}`)
            }

            // we want to check that the requireAuth directive roles argument value
            // is a string or an array of strings
            field.directives?.forEach((directive) => {
              if (directive.name.value === 'requireAuth') {
                directive.arguments?.forEach((arg) => {
                  if (arg.name.value === 'roles') {
                    if (
                      arg.value.kind !== Kind.STRING &&
                      arg.value.kind !== Kind.LIST
                    ) {
                      directiveRoleValidationOutput.push({
                        fieldName: fieldName,
                        invalid: arg.value.kind,
                      })
                    }

                    // check list (array)
                    if (arg.value.kind === Kind.LIST) {
                      const invalidValues = arg.value.values?.filter(
                        (val) => val.kind !== Kind.STRING,
                      )
                      if (invalidValues.length > 0) {
                        invalidValues.forEach((invalid) => {
                          directiveRoleValidationOutput.push({
                            fieldName: fieldName,
                            invalid: invalid.kind,
                          })
                        })
                      }
                    }
                  }
                })
              }
            })
          }
        }
      }
    },
  })

  if (validationOutput.length > 0) {
    const fieldsWithoutDirectives = validationOutput.map(
      (field) => `- ${field}`,
    )

    throw new Error(
      `${DIRECTIVE_REQUIRED_ERROR_MESSAGE} for\n${fieldsWithoutDirectives.join(
        '\n',
      )} \n`,
    )
  }

  if (directiveRoleValidationOutput.length > 0) {
    const fieldWithInvalidRoleValues = directiveRoleValidationOutput.map(
      (field: Record<string, any>) =>
        `- ${field.fieldName} has an invalid ${field.invalid}`,
    )

    throw new RangeError(
      `${DIRECTIVE_INVALID_ROLE_TYPES_ERROR_MESSAGE}\n\n${fieldWithInvalidRoleValues.join(
        '\n',
      )} \n\nFor example: @requireAuth(roles: "admin") or @requireAuth(roles: ["admin", "editor"])`,
    )
  }

  if (reservedNameValidationOutput.length > 0) {
    const reservedNameMsg = reservedNameValidationOutput.map(
      (output: Record<string, any>) => {
        return `The ${output.objectType} named '${output.name}' is a reserved GraphQL name.\nPlease rename it to something more specific, like: Application${output.name}.\n`
      },
    )
    throw new TypeError(reservedNameMsg.join('\n'))
  }
}

export const loadAndValidateSdls = async () => {
  const projectTypeSrc = await loadTypedefs(
    [
      'graphql/**/*.sdl.{js,ts}',
      'directives/**/*.{js,ts}',
      'subscriptions/**/*.{js,ts}',
    ],
    {
      loaders: [
        new CodeFileLoader({
          noRequire: true,
          pluckConfig: {
            globalGqlIdentifierName: 'gql',
          },
        }),
      ],
      cwd: getPaths().api.src,
    },
  )

  // The output of the above function doesn't give us the documents directly
  const projectDocumentNodes = Object.values(projectTypeSrc)
    .map(({ document }) => document)
    .filter((documentNode): documentNode is DocumentNode => {
      return !!documentNode
    })

  // Merge in the rootSchema with JSON scalars, etc.
  const mergedDocumentNode = mergeTypeDefs([
    rootSchema.schema,
    projectDocumentNodes,
  ])

  validateSchema(mergedDocumentNode)
}
