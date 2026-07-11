import type { Types, PluginFunction } from '@graphql-codegen/plugin-helpers'
import {
  getCachedDocumentNodeFromSchema,
  oldVisit,
} from '@graphql-codegen/plugin-helpers'
import {
  TypeScriptResolversPluginConfig,
  plugin as originalPlugin,
} from '@graphql-codegen/typescript-resolvers'
import type { GraphQLSchema } from 'graphql'

import { RwTypeScriptResolversVisitor } from './visitor'

export const plugin: PluginFunction<
  TypeScriptResolversPluginConfig,
  Types.ComplexPluginOutput
> = (
  schema: GraphQLSchema,
  _documents: Types.DocumentFile[],
  config: TypeScriptResolversPluginConfig,
) => {
  // This is the key change compared to the standard typescript-resolver
  // plugin implementation - we use our own Visitor here.
  const visitor = new RwTypeScriptResolversVisitor(config, schema)

  // runs visitor
  const visitorResult = oldVisit(getCachedDocumentNodeFromSchema(schema), {
    leave: visitor as any,
  })

  // `content` here is the output of the original plugin, including the
  // original visitor
  const { prepend, content } = originalPlugin(schema, [], config) as {
    prepend: string[]
    content: string
  }

  // A few types needed for our own RW-specific solution
  prepend.push(`export type OptArgsResolverFn<TResult, TParent = {}, TContext = {}, TArgs = {}> = (
      args?: TArgs,
      obj?: { root: TParent; context: TContext; info: GraphQLResolveInfo }
    ) => TResult | Promise<TResult>

    export type RequiredResolverFn<TResult, TParent = {}, TContext = {}, TArgs = {}> = (
      args: TArgs,
      obj: { root: TParent; context: TContext; info: GraphQLResolveInfo }
    ) => TResult | Promise<TResult>`)

  // `content` is constructed like this:
  //   content: [
  //     header,
  //     resolversTypeMapping,
  //     resolversParentTypeMapping,
  //                                          <--- `visitorResultStart` below
  //     ...visitorResult.definitions.filter(
  //       (d: unknown) => typeof d === 'string'
  //     ),
  //                                          <--- `visitorResultEnd` below
  //     getRootResolver(),
  //     getAllDirectiveResolvers(),
  //   ].join('\n'),
  // We want to replace `visitorResult` with our own result.
  // We assume that the original visitorResult begins with the same text as our
  // `visitorResult`. We use this to find where we should start replacing content
  // We then execute `getRootResolver()` to know what that looks like, and find
  // the first line of that output. This is where we'll end our replacement.
  // Then we just replace whatever is between those two things with our own
  // result

  const splitContent = content.split('\n')
  const visitorResultStart = splitContent.indexOf(
    visitorResult.definitions
      .filter((d: unknown) => typeof d === 'string')[0]
      .split('\n')[0],
  )

  const splitRootResolver = visitor.getRootResolver().split('\n')
  const visitorResultEnd = splitContent.findIndex(
    (line: string, index: number) =>
      line === splitRootResolver[0] &&
      splitContent[index + 1] === splitRootResolver[1],
  )

  // Building up `content` with the original visitor content replaced by our
  // visitor content
  const newContent = [
    ...splitContent.slice(0, visitorResultStart),
    ...visitorResult.definitions.filter((d: unknown) => typeof d === 'string'),
    ...splitContent.slice(visitorResultEnd),
  ]

  return {
    prepend,
    content: newContent.join('\n'),
  }
}

export { RwTypeScriptResolversVisitor, TypeScriptResolversPluginConfig }
