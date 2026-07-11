import { basename } from 'node:path'

import type { TSESTree } from '@typescript-eslint/utils'
import { ESLintUtils, AST_NODE_TYPES } from '@typescript-eslint/utils'

const createRule = ESLintUtils.RuleCreator.withoutDocs

const capitalizeFirstLetter = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1)

export const serviceTypeAnnotations = createRule({
  meta: {
    docs: {
      description:
        'Sets the types on a query/mutation resolver function to the correct type',
    },
    messages: {
      needsType:
        'The query/mutation function ({{name}}) needs a type annotation of {{typeName}}.',
    },
    fixable: 'code',
    type: 'suggestion',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const thisFilename = basename(context.filename)
    const sansTS = thisFilename.replace('.ts', '')
    const thisFileCorrespondingImport = `types/${sansTS}`

    let importForThisFile: TSESTree.ImportDeclaration | null = null
    return {
      // Make sure we have a reference to the import for the relative file
      // which includes definitions for this service
      ImportDeclaration(node) {
        importForThisFile ||=
          node.source.value === thisFileCorrespondingImport ? node : null
      },

      // Then start looking at every exported fn/const
      ExportNamedDeclaration(node) {
        if (
          !node.declaration ||
          node.declaration.type !== AST_NODE_TYPES.VariableDeclaration
        ) {
          return
        }

        node.declaration.declarations.forEach((vd) => {
          // VariableDeclarator means an `export const abcThing =`
          if (
            vd.type === AST_NODE_TYPES.VariableDeclarator &&
            vd.id.type === AST_NODE_TYPES.Identifier
          ) {
            // Don't add types to functions that start with _
            if (vd.id.name.startsWith('_')) {
              return
            }

            // Lowercase means something we think should be an query/mutation fn
            const isGlobalOrMutationResolver = /^[a-z]/.test(vd.id.name)

            const suffix = isGlobalOrMutationResolver
              ? 'Resolver'
              : 'TypeResolvers'
            const typeName = capitalizeFirstLetter(vd.id.name) + suffix

            // Only run for lowercase arrow funcs ATM
            if (
              isGlobalOrMutationResolver &&
              vd.init?.type !== AST_NODE_TYPES.ArrowFunctionExpression
            ) {
              return
            }

            // Switch from the estree type to the typescript-eslint type
            const tsID = vd.id

            // If there's no type annotation, then we should add one
            if (!tsID.typeAnnotation) {
              context.report({
                messageId: 'needsType',
                node: vd.id,
                data: {
                  name: vd.id.name,
                  typeName,
                },
                *fix(fixer) {
                  // Add the type after the fixer
                  yield fixer.insertTextAfter(vd.id, `: ${typeName}`)

                  // Ensure that the module is imported at the top
                  if (!importForThisFile) {
                    yield fixer.insertTextBeforeRange(
                      [0, 0],
                      `import type { ${typeName} } from "${thisFileCorrespondingImport}"\n`,
                    )
                  } else {
                    const lastImportSpecifier =
                      importForThisFile.specifiers[
                        importForThisFile.specifiers.length - 1
                      ]
                    yield fixer.insertTextAfter(
                      lastImportSpecifier,
                      `, ${typeName}`,
                    )
                  }
                },
              })

              return
            }

            // If there is one and it's wrong, edit it
            if (tsID.typeAnnotation.typeAnnotation) {
              const type = tsID.typeAnnotation.typeAnnotation
              // This is unexpected type code, skip
              if (!('typeName' in type)) {
                return
              }

              const isCorrectType =
                type.typeName?.type === AST_NODE_TYPES.Identifier &&
                type.typeName?.name === typeName

              if (isCorrectType) {
                return
              }

              context.report({
                messageId: 'needsType',
                node: vd.id,
                data: {
                  name: vd.id.name,
                  typeName,
                },
                *fix(fixer) {
                  // Remove the old type reference - does this need to include a -1 for the ':'?
                  yield fixer.removeRange([type.range[0] - 2, type.range[1]])
                  yield fixer.insertTextAfter(vd.id, `: ${typeName}`)

                  if (!importForThisFile) {
                    yield fixer.insertTextBeforeRange(
                      [0, 0],
                      `import type { ${typeName} } from "${thisFileCorrespondingImport}"\n`,
                    )
                  } else {
                    const lastImportSpecifier =
                      importForThisFile.specifiers[
                        importForThisFile.specifiers.length - 1
                      ]
                    yield fixer.insertTextAfter(
                      lastImportSpecifier,
                      `, ${typeName}`,
                    )
                  }
                },
              })
            }
          }
        })
      },
    }
  },
})
