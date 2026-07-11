import { useDisableIntrospection } from '@envelop/disable-introspection'
import { useFilterAllowedOperations } from '@envelop/filter-operation-type'
import type { GraphQLSchema } from 'graphql'
import { OperationTypeNode } from 'graphql'
import type { Plugin } from 'graphql-yoga'
import { useReadinessCheck, createYoga } from 'graphql-yoga'

import { mapRwCorsOptionsToYoga } from './cors'
import { makeDirectivesForPlugin } from './directives/makeDirectives'
import { configureGraphiQLPlayground } from './graphiql'
import { configureGraphQLIntrospection } from './introspection'
import { makeMergedSchema } from './makeMergedSchema'
import {
  useArmor,
  useRedwoodAuthContext,
  useRedwoodDirective,
  useRedwoodError,
  useRedwoodGlobalContextSetter,
  useRedwoodOpenTelemetry,
  useRedwoodLogger,
  useRedwoodPopulateContext,
  useRedwoodTrustedDocuments,
} from './plugins'
import type {
  useRedwoodDirectiveReturn,
  DirectivePluginOptions,
} from './plugins/useRedwoodDirective'
import { makeSubscriptions } from './subscriptions/makeSubscriptions'
import type { RedwoodSubscription } from './subscriptions/makeSubscriptions'
import type { GraphQLYogaOptions } from './types'

export const createGraphQLYoga = ({
  healthCheckId,
  loggerConfig,
  context,
  getCurrentUser,
  onException,
  generateGraphiQLHeader,
  extraPlugins,
  authDecoder,
  cors,
  services,
  sdls,
  directives = [],
  armorConfig,
  allowedOperations,
  allowIntrospection,
  allowGraphiQL,
  defaultError = 'Something went wrong.',
  graphiQLEndpoint = '/graphql',
  schemaOptions,
  realtime,
  trustedDocuments,
  openTelemetryOptions,
  includeScalars,
}: GraphQLYogaOptions) => {
  let schema: GraphQLSchema
  let redwoodDirectivePlugins = [] as Plugin[]
  const logger = loggerConfig.logger

  const isDevEnv = process.env.NODE_ENV === 'development'

  try {
    // @NOTE: Directives are optional
    const projectDirectives = makeDirectivesForPlugin(directives)

    if (projectDirectives.length > 0) {
      ;(redwoodDirectivePlugins as useRedwoodDirectiveReturn[]) =
        projectDirectives.map((directive) =>
          useRedwoodDirective(directive as DirectivePluginOptions),
        )
    }

    // @NOTE: Subscriptions are optional and only work in the context of a server
    let projectSubscriptions = [] as RedwoodSubscription[]

    if (realtime?.subscriptions?.subscriptions) {
      projectSubscriptions = makeSubscriptions(
        realtime.subscriptions.subscriptions,
      )
    }

    schema = makeMergedSchema({
      sdls,
      services,
      directives: projectDirectives,
      subscriptions: projectSubscriptions,
      schemaOptions,
      includeScalars,
    })
  } catch (e) {
    logger.fatal(e as Error, '\n ⚠️ GraphQL server crashed \n')

    if (onException) {
      onException()
    }

    // Forcefully crash the graphql server
    // so users know that a misconfiguration has happened
    process.exit(1)
  }

  try {
    // Important: Plugins are executed in order of their usage, and inject functionality serially,
    // so the order here matters
    const plugins: Plugin<any>[] = []

    const { disableIntrospection } = configureGraphQLIntrospection({
      allowIntrospection,
    })

    if (disableIntrospection) {
      plugins.push(useDisableIntrospection())
    }

    // Custom Redwood plugins
    plugins.push(useRedwoodAuthContext(getCurrentUser, authDecoder))
    plugins.push(useRedwoodGlobalContextSetter())

    if (context) {
      plugins.push(useRedwoodPopulateContext(context))
    }

    // Custom Redwood plugins
    plugins.push(...redwoodDirectivePlugins)

    // Custom Redwood OpenTelemetry plugin
    if (openTelemetryOptions !== undefined) {
      plugins.push(useRedwoodOpenTelemetry(openTelemetryOptions))
    }

    // Secure the GraphQL server
    plugins.push(useArmor(logger, armorConfig))

    // Only allow execution of specific operation types
    const defaultAllowedOperations = [
      OperationTypeNode.QUERY,
      OperationTypeNode.MUTATION,
    ]

    // allow subscriptions if using them (unless you override)
    if (realtime?.subscriptions?.subscriptions) {
      defaultAllowedOperations.push(OperationTypeNode.SUBSCRIPTION)
    }

    plugins.push(
      useFilterAllowedOperations(allowedOperations || defaultAllowedOperations),
    )

    if (trustedDocuments && !trustedDocuments.disabled) {
      plugins.push(useRedwoodTrustedDocuments(trustedDocuments))
    }

    // App-defined plugins
    if (extraPlugins && extraPlugins.length > 0) {
      plugins.push(...extraPlugins)
    }

    plugins.push(useRedwoodError(logger))

    plugins.push(
      useReadinessCheck({
        endpoint: graphiQLEndpoint + '/readiness',
        check: async ({ request }) => {
          try {
            // if we can reach the health check endpoint ...
            const response = await yoga.fetch(
              new URL(graphiQLEndpoint + '/health', request.url),
            )

            const expectedHealthCheckId = healthCheckId || 'yoga'

            // ... and the health check id's match the request and response's
            const status =
              response.headers.get('x-yoga-id') === expectedHealthCheckId &&
              request.headers.get('x-yoga-id') === expectedHealthCheckId

            // then we're good to go (or not)
            return status
          } catch (err) {
            logger.error(err)
            return false
          }
        },
      }),
    )

    // Must be "last" in plugin chain, but before error masking
    // so can process any data added to results and extensions
    plugins.push(useRedwoodLogger(loggerConfig))

    const yoga = createYoga({
      id: healthCheckId,
      landingPage: isDevEnv,
      schema,
      plugins,
      maskedErrors: {
        errorMessage: defaultError,
        isDev: isDevEnv,
      },
      logging: logger,
      healthCheckEndpoint: graphiQLEndpoint + '/health',
      graphqlEndpoint: graphiQLEndpoint,
      graphiql: configureGraphiQLPlayground({
        allowGraphiQL,
        generateGraphiQLHeader,
      }),
      cors: (request: Request) => {
        const requestOrigin = request.headers.get('origin')
        return mapRwCorsOptionsToYoga(cors, requestOrigin)
      },
    })

    return { yoga, logger }
  } catch (e) {
    if (onException) {
      onException()
    }
    throw e
  }
}
