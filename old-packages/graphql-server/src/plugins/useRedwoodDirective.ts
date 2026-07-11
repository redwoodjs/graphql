import { mapSchema, MapperKind } from '@graphql-tools/utils'
import type {
  DirectiveNode,
  DocumentNode,
  GraphQLFieldConfig,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLSchema,
} from 'graphql'
import { defaultFieldResolver, getDirectiveValues } from 'graphql'
import type { Plugin } from 'graphql-yoga'

import type { GlobalContext } from '@redwoodjs/context'

export interface DirectiveParams<
  FieldType = any,
  DirectiveArgs = Record<string, any>,
> {
  root: unknown
  args: Record<string, unknown>
  context: GlobalContext
  info: GraphQLResolveInfo
  directiveNode?: DirectiveNode
  directiveArgs: DirectiveArgs
  resolvedValue: FieldType
}

/**
 * Generic Type for the arguments/parameters passed to the validate function for validator directives
 *
 * You have to pass in the type of directiveArgs
 * @example ValidateArgs<{ roles?: string[] }>
 */
export declare type ValidateArgs<DirectiveArgs = Record<string, any>> = Omit<
  DirectiveParams<never, DirectiveArgs>, // we remove resolvedValue anyway in this type
  'resolvedValue'
>

/**
 * Write your validation logic inside this function.
 * Validator directives do not have access to the field value, i.e. they are called before resolving the value
 *
 * - Throw an error, if you want to stop executing e.g. not sufficient permissions
 * - Validator directives can be async or sync
 * - Returned value will be ignored
 *
 * You have to pass in the type of directiveArgs
 * @example ValidatorDirectiveFunc<{ roles?: string[] }>
 *
 */
export type ValidatorDirectiveFunc<TDirectiveArgs = Record<string, any>> = (
  args: ValidateArgs<TDirectiveArgs>,
) => Promise<void> | void

/**
 * Generic Type for the arguments/parameters passed to the transform function for transformer directives
 *
 * You have to pass in the type of directiveArgs, and the resolverValue (i.e. the type of the field you are transforming)
 * @example TransformArgs<Post, { allowedRoles: string[] }>
 */
export declare type TransformArgs<
  TField = any,
  TDirectiveArgs = Record<string, any>,
> = DirectiveParams<TField, TDirectiveArgs>

/**
 * Write your transformation logic inside this function.
 * Transformer directives run **after** resolving the value
 *
 * - You can also throw an error, if you want to stop executing, but note that the value has already been resolved
 * - Transformer directives **must** be synchronous, and return a value
 *
 * You have to pass in the type of directiveArgs, and the resolverValue (i.e. the type of the field you are transforming)
 * @example TransformerDirectiveFunc<Post, { allowedRoles: string[] }>
 *
 */
export type TransformerDirectiveFunc<
  TField = any,
  TDirectiveArgs = Record<string, any>,
> = (args: TransformArgs<TField, TDirectiveArgs>) => TField

// @NOTE don't use unspecified enums, because !type would === true
export enum DirectiveType {
  VALIDATOR = 'VALIDATOR_DIRECTIVE',
  TRANSFORMER = 'TRANSFORMER_DIRECTIVE',
}

export type RedwoodDirective = ValidatorDirective | TransformerDirective

export interface ValidatorDirective extends ValidatorDirectiveOptions {
  schema: DocumentNode
}

export interface TransformerDirective extends TransformerDirectiveOptions {
  schema: DocumentNode
}

interface ValidatorDirectiveOptions {
  onResolvedValue: ValidatorDirectiveFunc
  type: DirectiveType.VALIDATOR
  name: string
}

interface TransformerDirectiveOptions {
  onResolvedValue: TransformerDirectiveFunc
  type: DirectiveType.TRANSFORMER
  name: string
}

export type DirectivePluginOptions =
  | ValidatorDirectiveOptions
  | TransformerDirectiveOptions

export function hasDirective(info: GraphQLResolveInfo): boolean {
  try {
    const { parentType, fieldName, schema } = info
    const schemaType = schema.getType(parentType.name) as GraphQLObjectType
    const field = schemaType.getFields()[fieldName]
    const astNode = field.astNode
    // if directives array exists, we check the length
    // other wise false
    return !!astNode?.directives?.length
  } catch (error) {
    console.error(error)
    return false
  }
}

export function getDirectiveByName(
  fieldConfig: GraphQLFieldConfig<any, any, any>,
  directiveName: string,
): null | DirectiveNode {
  const associatedDirective = fieldConfig.astNode?.directives?.find(
    (directive) => directive.name.value === directiveName,
  )
  return associatedDirective ?? null
}

export function isPromise(value: any): value is Promise<unknown> {
  return typeof value?.then === 'function'
}

function wrapAffectedResolvers(
  schema: GraphQLSchema,
  options: DirectivePluginOptions,
): GraphQLSchema {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD](fieldConfig, _, __, schema) {
      const directiveNode = getDirectiveByName(fieldConfig, options.name)
      const directive = directiveNode
        ? schema.getDirective(directiveNode.name.value)
        : null
      if (directiveNode && directive) {
        const directiveArgs =
          getDirectiveValues(directive, { directives: [directiveNode] }) || {}

        const originalResolve = fieldConfig.resolve ?? defaultFieldResolver
        // Only validator directives handle a subscribe function
        const originalSubscribe = fieldConfig.subscribe ?? defaultFieldResolver

        if (_isValidator(options)) {
          return {
            ...fieldConfig,
            resolve: function useRedwoodDirectiveValidatorResolver(
              root,
              args,
              context,
              info,
            ) {
              const result = options.onResolvedValue({
                root,
                args,
                context,
                info,
                directiveNode,
                directiveArgs,
              })

              if (isPromise(result)) {
                return result.then(() =>
                  originalResolve(root, args, context, info),
                )
              }
              return originalResolve(root, args, context, info)
            },
            subscribe: function useRedwoodDirectiveValidatorResolver(
              root,
              args,
              context,
              info,
            ) {
              const result = options.onResolvedValue({
                root,
                args,
                context,
                info,
                directiveNode,
                directiveArgs,
              })

              if (isPromise(result)) {
                return result.then(() =>
                  originalSubscribe(root, args, context, info),
                )
              }
              return originalSubscribe(root, args, context, info)
            },
          }
        }
        if (_isTransformer(options)) {
          return {
            ...fieldConfig,
            resolve: function useRedwoodDirectiveTransformerResolver(
              root,
              args,
              context,
              info,
            ) {
              const resolvedValue = originalResolve(root, args, context, info)
              if (isPromise(resolvedValue)) {
                return resolvedValue.then((resolvedValue) =>
                  options.onResolvedValue({
                    root,
                    args,
                    context,
                    info,
                    directiveNode,
                    directiveArgs,
                    resolvedValue,
                  }),
                )
              }
              return options.onResolvedValue({
                root,
                args,
                context,
                info,
                directiveNode,
                directiveArgs,
                resolvedValue,
              })
            },
          }
        }
      }
      return fieldConfig
    },
  })
}

export type useRedwoodDirectiveReturn = Plugin<{
  onResolvedValue: ValidatorDirectiveFunc | TransformerDirectiveFunc
}>

export const useRedwoodDirective = (
  options: DirectivePluginOptions,
): useRedwoodDirectiveReturn => {
  /**
   * This symbol is added to the schema extensions for checking whether the transform got already applied.
   */
  const wasDirectiveApplied = Symbol.for(`useRedwoodDirective.${options.name}}`)

  return {
    onSchemaChange({ schema, replaceSchema }) {
      /**
       * Currently graphql-js extensions typings are limited to string keys.
       * We are using symbols as each useRedwoodDirective plugin instance should use its own unique symbol.
       */
      if (schema.extensions?.[wasDirectiveApplied] === true) {
        return
      }
      const transformedSchema = wrapAffectedResolvers(schema, options)
      transformedSchema.extensions = {
        ...schema.extensions,
        [wasDirectiveApplied]: true,
      }

      replaceSchema(transformedSchema)
    },
  }
}

// For narrowing types
const _isValidator = (
  options: DirectivePluginOptions,
): options is ValidatorDirectiveOptions => {
  return options.type === DirectiveType.VALIDATOR
}

const _isTransformer = (
  options: DirectivePluginOptions,
): options is TransformerDirectiveOptions => {
  return options.type === DirectiveType.TRANSFORMER
}
