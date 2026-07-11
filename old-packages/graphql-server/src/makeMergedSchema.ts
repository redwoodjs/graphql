import { mergeTypeDefs } from '@graphql-tools/merge'
import type { IExecutableSchemaDefinition } from '@graphql-tools/schema'
import {
  addResolversToSchema,
  makeExecutableSchema,
} from '@graphql-tools/schema'
import type {
  IResolvers,
  IResolverValidationOptions,
} from '@graphql-tools/utils'
import * as opentelemetry from '@opentelemetry/api'
import type {
  GraphQLSchema,
  GraphQLFieldMap,
  DocumentNode,
  GraphQLUnionType,
  GraphQLObjectType,
} from 'graphql'
import { merge, omitBy } from 'lodash'

import type { RedwoodDirective } from './plugins/useRedwoodDirective'
import * as rootGqlSchema from './rootSchema'
import type { RedwoodSubscription } from './subscriptions/makeSubscriptions'
import type {
  Services,
  ServicesGlobImports,
  GraphQLTypeWithFields,
  SdlGlobImports,
  RedwoodScalarConfig,
} from './types'

const wrapWithOpenTelemetry = async (
  func: any,
  args: any,
  root: any,
  context: any,
  info: any,
  name: string,
) => {
  const tracer = opentelemetry.trace.getTracer('redwoodjs')
  const parentSpan =
    context !== null &&
    (context['OPEN_TELEMETRY_GRAPHQL'] as opentelemetry.Span | undefined)
  const parentContext = parentSpan
    ? opentelemetry.trace.setSpan(opentelemetry.context.active(), parentSpan)
    : opentelemetry.context.active()

  return await tracer.startActiveSpan(
    `redwoodjs:graphql:resolver:${name}`,
    {},
    parentContext,
    async (span) => {
      span.setAttribute(
        'graphql.execute.operationName',
        `${args.operationName || 'Anonymous Operation'}`,
      )
      try {
        const result: any = await func(args, {
          root,
          context,
          info,
        })
        span.end()
        return result
      } catch (ex) {
        span.recordException(ex as Error)
        span.setStatus({ code: opentelemetry.SpanStatusCode.ERROR })
        span.end()
        throw ex
      }
    },
  )
}

const mapFieldsToService = ({
  fields = {},
  resolvers: unmappedResolvers,
  services,
}: {
  fields: GraphQLFieldMap<any, any>
  resolvers: {
    [key: string]: (
      root: unknown,
      args: unknown,
      context: unknown,
      info: unknown,
    ) => any
  }
  services: Services
}) =>
  Object.keys(fields).reduce((resolvers, name) => {
    // Does the function already exist in the resolvers from the schema definition?
    if (resolvers?.[name]) {
      return resolvers
    }

    // Does a function exist in the service?
    if (services?.[name]) {
      return {
        ...resolvers,
        // Map the arguments from GraphQL to an ordinary function a service would
        // expect.
        [name]: async (
          root: unknown,
          args: unknown,
          context: unknown,
          info: unknown,
        ) => {
          const captureResolvers =
            // @ts-expect-error context is unknown
            context && context['OPEN_TELEMETRY_GRAPHQL'] !== undefined

          if (captureResolvers) {
            return wrapWithOpenTelemetry(
              services[name],
              args,
              root,
              context,
              info,
              name,
            )
          }
          return services[name](args, { root, context, info })
        },
      }
    }

    return resolvers
  }, unmappedResolvers)
/**
 *
 * @param types on Union type: i.e for union Media =  Book | Movie, parameter = [Book, Movie]
 * @returns null | string: Type name of the union's type that is returned.
 * If null or invalid value is returned, will trigger a GQL error
 */
const resolveUnionType = (types: readonly GraphQLObjectType[]) => ({
  __resolveType(obj: Record<string, unknown>) {
    // if obj has __typename, check that first to resolve type, otherwise, look for largest intersection
    if (Object.hasOwn(obj, '__typename')) {
      for (const type of types) {
        if (type.name === obj['__typename']) {
          return type.name
        }
      }
    }

    const fieldIntersections = new Array(types.length).fill(0)
    let maxIntersectionFields = 0
    let maxIntersectionType
    let maxIntersectionIdx = 0

    for (let i = 0; i < types.length; i++) {
      const type = types[i]
      const fieldIntersection = Object.keys(type.getFields()).filter(
        (field) => field in obj,
      )
      fieldIntersections[i] = fieldIntersection.length
      // update max intersection fields, type and index
      if (fieldIntersection.length > maxIntersectionFields) {
        maxIntersectionFields = fieldIntersection.length
        maxIntersectionType = type
        maxIntersectionIdx = i
      }
    }

    // If the maxIntersection fields is not unique, we are unable to determine type
    if (
      fieldIntersections.includes(maxIntersectionFields, maxIntersectionIdx + 1)
    ) {
      throw Error(
        'Unable to resolve correct type for union. Try adding unique fields to each type or __typename to each resolver',
      )
    }

    return maxIntersectionType?.name ?? null
  },
})

/**
 * This iterates over all the schemas definitions and figures out which resolvers
 * are missing, it then tries to add the missing resolvers from the corresponding
 * service.
 */
const mergeResolversWithServices = ({
  schema,
  resolvers,
  services,
}: {
  schema: GraphQLSchema
  resolvers: { [key: string]: any }
  services: ServicesGlobImports
}): IResolvers => {
  const mergedServices = merge(
    {},
    ...Object.keys(services).map((name) => services[name]),
  )

  // Get a list of types that have fields.
  // TODO: Figure out if this would interfere with other types: Interface types, etc.`
  const typesWithFields = Object.keys(schema.getTypeMap())
    .filter((name) => !name.startsWith('_'))
    .filter(
      (name) =>
        typeof (schema.getType(name) as GraphQLTypeWithFields).getFields !==
        'undefined',
    )
    .map((name) => {
      return schema.getType(name)
    })
    .filter(
      (type): type is GraphQLTypeWithFields =>
        type !== undefined && type !== null,
    )
  // gets union types, which does not have fields but has types. i.e union Media = Book | Movie
  const unionTypes = Object.keys(schema.getTypeMap())
    .filter(
      (name) =>
        typeof (schema.getType(name) as GraphQLUnionType).getTypes !==
        'undefined',
    )
    .map((name) => {
      return schema.getType(name)
    })
    .filter(
      (type): type is GraphQLUnionType => type !== undefined && type !== null,
    )

  const mappedResolvers = typesWithFields.reduce((acc, type) => {
    // Services export Query and Mutation field resolvers as named exports,
    // but other GraphQLObjectTypes are exported as an object that are named
    // after the type.
    // Example: export const MyType = { field: () => {} }
    let servicesForType = mergedServices
    if (!['Query', 'Mutation', 'Subscription'].includes(type.name)) {
      servicesForType = mergedServices?.[type.name]
    }

    return {
      ...acc,
      [type.name]: mapFieldsToService({
        fields: type.getFields(),
        resolvers: resolvers?.[type.name],
        services: servicesForType,
      }),
    }
  }, {})

  const mappedUnionResolvers = unionTypes.reduce((acc, type) => {
    return {
      ...acc,
      [type.name]: resolveUnionType(type.getTypes()),
    }
  }, {})

  return omitBy(
    {
      ...resolvers,
      ...mappedResolvers,
      ...mappedUnionResolvers,
    },
    (v) => typeof v === 'undefined',
  )
}

const mergeResolvers = (schemas: {
  [key: string]: {
    schema: DocumentNode
    resolvers: Record<string, unknown>
  }
}) =>
  omitBy(
    merge(
      {},
      ...[
        rootGqlSchema.resolvers,
        ...Object.values(schemas).map(({ resolvers }) => resolvers),
      ],
    ),
    (v) => typeof v === 'undefined',
  )

/**
 * Merge GraphQL typeDefs and resolvers into a single schema.
 *
 * @example
 * ```js
 * const schemas = importAll('api', 'graphql')
 * const services = importAll('api', 'services')
 *
 * const schema = makeMergedSchema({
 *  schema,
 *  services,
 * })
 * ```
 */

/**
 * Update January 2021
 * Merge GraphQL Schemas has been replaced by @graphql-toolkit/schema-merging
 * The following code proxies the original mergeTypes to the new mergeTypeDefs
 * https://www.graphql-tools.com/docs/migration-from-merge-graphql-schemas/
 **/

type Config = Parameters<typeof mergeTypeDefs>[1]

const mergeTypes = (
  types: any[],
  options?: { schemaDefinition?: boolean; all?: boolean } & Partial<Config>,
) => {
  const schemaDefinition =
    options && typeof options.schemaDefinition === 'boolean'
      ? options.schemaDefinition
      : true

  return mergeTypeDefs(types, {
    useSchemaDefinition: schemaDefinition,
    forceSchemaDefinition: schemaDefinition,
    throwOnConflict: true,
    commentDescriptions: true,
    reverseDirectives: true,
    ...options,
  })
}

const mergeResolversWithSubscriptions = ({
  schema,
  subscriptions,
  resolverValidationOptions,
  inheritResolversFromInterfaces,
}: {
  schema: GraphQLSchema
  subscriptions: RedwoodSubscription[]
  resolverValidationOptions?: IResolverValidationOptions | undefined
  inheritResolversFromInterfaces?: boolean | undefined
}) => {
  if (subscriptions && subscriptions.length > 0) {
    const subscriptionResolvers = { Subscription: {} } as IResolvers

    subscriptions?.forEach((subscription) => {
      subscriptionResolvers['Subscription'] = {
        ...subscriptionResolvers['Subscription'],
        ...subscription.resolvers,
      }
    })

    return addResolversToSchema({
      schema,
      resolvers: subscriptionResolvers,
      resolverValidationOptions,
      inheritResolversFromInterfaces,
    })
  }
  return schema
}

export const makeMergedSchema = ({
  sdls,
  services,
  schemaOptions = {},
  directives,
  subscriptions = [],
  includeScalars,
}: {
  sdls: SdlGlobImports
  services: ServicesGlobImports
  directives: RedwoodDirective[]
  subscriptions: RedwoodSubscription[]
  includeScalars?: RedwoodScalarConfig

  /**
   * A list of options passed to [makeExecutableSchema](https://www.graphql-tools.com/docs/generate-schema/#makeexecutableschemaoptions).
   */
  schemaOptions?: Partial<IExecutableSchemaDefinition>
}) => {
  const sdlSchemas = Object.values(sdls).map(({ schema }) => schema)

  const rootEntries = [rootGqlSchema.schema]

  // We cannot access the getConfig from project-config here so the user must supply it via a config option
  if (includeScalars?.File !== false) {
    rootEntries.push(rootGqlSchema.scalarSchemas.File)
  }

  const typeDefs = mergeTypes(
    [
      ...rootEntries,
      ...directives.map((directive) => directive.schema), // pick out schemas from directives
      ...subscriptions.map((subscription) => subscription.schema), // pick out schemas from subscriptions
      ...sdlSchemas, // pick out the schemas from sdls
    ],
    { all: true },
  )

  const { typeDefs: schemaOptionsTypeDefs = [], ...otherSchemaOptions } =
    schemaOptions
  const schema = makeExecutableSchema({
    typeDefs: [typeDefs, schemaOptionsTypeDefs],
    ...otherSchemaOptions,
  })

  const resolvers: IResolvers = mergeResolversWithServices({
    schema,
    resolvers: mergeResolvers(sdls),
    services,
  })

  const schemaWithSubscriptions = mergeResolversWithSubscriptions({
    schema,
    subscriptions,
  })

  const { resolverValidationOptions, inheritResolversFromInterfaces } =
    schemaOptions || {}

  return addResolversToSchema({
    schema: schemaWithSubscriptions,
    resolvers,
    resolverValidationOptions,
    inheritResolversFromInterfaces,
  })
}
