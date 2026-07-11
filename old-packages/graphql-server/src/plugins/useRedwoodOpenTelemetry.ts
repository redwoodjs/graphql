import type { Plugin, OnExecuteHookResult } from '@envelop/core'
import { isAsyncIterable } from '@envelop/core'
import { useOnResolve } from '@envelop/on-resolve'
import type { Attributes } from '@opentelemetry/api'
import { SpanKind } from '@opentelemetry/api'
import * as opentelemetry from '@opentelemetry/api'
import { print } from 'graphql'

import type { RedwoodOpenTelemetryConfig } from '../types'

export enum AttributeName {
  EXECUTION_ERROR = 'graphql.execute.error',
  EXECUTION_RESULT = 'graphql.execute.result',
  RESOLVER_EXCEPTION = 'graphql.resolver.exception',
  RESOLVER_FIELD_NAME = 'graphql.resolver.fieldName',
  RESOLVER_TYPE_NAME = 'graphql.resolver.typeName',
  RESOLVER_RESULT_TYPE = 'graphql.resolver.resultType',
  RESOLVER_ARGS = 'graphql.resolver.args',
  EXECUTION_OPERATION_NAME = 'graphql.execute.operationName',
  EXECUTION_OPERATION_DOCUMENT = 'graphql.execute.document',
  EXECUTION_VARIABLES = 'graphql.execute.variables',
}

// const tracingSpanSymbol = Symbol('OPEN_TELEMETRY_GRAPHQL')
const tracingSpanSymbol = 'OPEN_TELEMETRY_GRAPHQL'

type PluginContext = {
  [tracingSpanSymbol]: opentelemetry.Span
}

export const useRedwoodOpenTelemetry = (
  options: RedwoodOpenTelemetryConfig,
): Plugin<PluginContext> => {
  const spanKind: SpanKind = SpanKind.SERVER
  const spanAdditionalAttributes: Attributes = {}

  const tracer = opentelemetry.trace.getTracer('redwoodjs')

  return {
    onPluginInit({ addPlugin }) {
      if (options.resolvers) {
        addPlugin(
          useOnResolve(({ info, context, args }) => {
            if (
              context &&
              typeof context === 'object' &&
              context[tracingSpanSymbol]
            ) {
              const ctx = opentelemetry.trace.setSpan(
                opentelemetry.context.active(),
                context[tracingSpanSymbol],
              )
              const { fieldName, returnType, parentType } = info
              return tracer.startActiveSpan(
                `${parentType.name}.${fieldName}`,
                {
                  attributes: {
                    [AttributeName.RESOLVER_FIELD_NAME]: fieldName,
                    [AttributeName.RESOLVER_TYPE_NAME]: parentType.toString(),
                    [AttributeName.RESOLVER_RESULT_TYPE]: returnType.toString(),
                    [AttributeName.RESOLVER_ARGS]: JSON.stringify(args || {}),
                  },
                },
                ctx,
                (resolverSpan) => {
                  resolverSpan.spanContext()

                  return ({ result }: { result: unknown }) => {
                    if (result instanceof Error) {
                      resolverSpan.recordException({
                        name: AttributeName.RESOLVER_EXCEPTION,
                        message: JSON.stringify(result),
                      })
                    }
                    resolverSpan.end()
                  }
                },
              )
            }
            return () => {}
          }),
        )
      }
    },
    onExecute({ args, extendContext }) {
      return tracer.startActiveSpan(
        `${args.operationName || 'Anonymous Operation'}`,
        {
          kind: spanKind,
          attributes: {
            ...spanAdditionalAttributes,
            [AttributeName.EXECUTION_OPERATION_NAME]:
              args.operationName ?? undefined,
            [AttributeName.EXECUTION_OPERATION_DOCUMENT]: print(args.document),
            ...(options.variables
              ? {
                  [AttributeName.EXECUTION_VARIABLES]: JSON.stringify(
                    args.variableValues ?? {},
                  ),
                }
              : {}),
          },
        },
        (executionSpan) => {
          const resultCbs: OnExecuteHookResult<PluginContext> = {
            onExecuteDone({ result }) {
              if (isAsyncIterable(result)) {
                executionSpan.end()

                console.warn(
                  `Plugin "RedwoodOpenTelemetry" encountered an AsyncIterator which is not supported yet, so tracing data is not available for the operation.`,
                )
                return
              }

              if (result.data && options.result) {
                executionSpan.setAttribute(
                  AttributeName.EXECUTION_RESULT,
                  JSON.stringify(result),
                )
              }

              if (result.errors && result.errors.length > 0) {
                executionSpan.recordException({
                  name: AttributeName.EXECUTION_ERROR,
                  message: JSON.stringify(result.errors),
                })
              }

              executionSpan.end()
            },
          }

          if (options.resolvers) {
            extendContext({
              [tracingSpanSymbol]: executionSpan,
            })
          }

          return resultCbs
        },
      )
    },
  }
}
