// This file is copied from https://github.com/n1ru4l/envelop/blob/2f29f79726905c3899835c48967bd34acac91249/packages/testing/src/index.ts
// and then changed to use vitest instead of jest

import { inspect } from 'node:util'

import {
  envelop,
  getDocumentString,
  isAsyncIterable,
  useEngine,
  useSchema,
} from '@envelop/core'
import type { GetEnvelopedFn, Plugin } from '@envelop/types'
import { mapSchema as cloneSchema, isDocumentNode } from '@graphql-tools/utils'
import { handleMaybePromise } from '@whatwg-node/promise-helpers'
import * as GraphQLJS from 'graphql'
import { getOperationAST, print, GraphQLError } from 'graphql'
import type { DocumentNode, ExecutionResult, GraphQLSchema } from 'graphql'
import { vi } from 'vitest'

export const useGraphQLJSEngine = () => {
  return useEngine(GraphQLJS)
}

export type ModifyPluginsFn = (plugins: Plugin<any>[]) => Plugin<any>[]
export type PhaseReplacementParams =
  | {
      phase: 'parse'
      fn: ReturnType<GetEnvelopedFn<any>>['parse']
    }
  | {
      phase: 'validate'
      fn: ReturnType<GetEnvelopedFn<any>>['validate']
    }
  | {
      phase: 'execute'
      fn: ReturnType<GetEnvelopedFn<any>>['execute']
    }
  | {
      phase: 'subscribe'
      fn: ReturnType<GetEnvelopedFn<any>>['subscribe']
    }
  | {
      phase: 'contextFactory'
      fn: () => any | Promise<any>
    }

export function createSpiedPlugin() {
  const afterResolver = vi.fn()

  const baseSpies = {
    onSchemaChange: vi.fn(),
    afterParse: vi.fn(),
    afterValidate: vi.fn(),
    afterContextBuilding: vi.fn(),
    afterExecute: vi.fn(),
    afterResolver,
    beforeResolver: vi.fn(() => afterResolver),
  }

  const spies = {
    ...baseSpies,
    beforeParse: vi.fn(() => baseSpies.afterParse),
    beforeValidate: vi.fn(() => baseSpies.afterValidate),
    beforeContextBuilding: vi.fn(() => baseSpies.afterContextBuilding),
    beforeExecute: vi.fn(() => ({
      onExecuteDone: baseSpies.afterExecute,
    })),
  }

  return {
    reset: () => {
      for (const [, value] of Object.entries(spies)) {
        value.mockReset()
      }
    },
    spies,
    plugin: {
      onSchemaChange: spies.onSchemaChange,
      onParse: spies.beforeParse,
      onValidate: spies.beforeValidate,
      onExecute: spies.beforeExecute,
      onContextBuilding: spies.beforeContextBuilding,
    } as Plugin,
  }
}

type MaybePromise<T> = T | Promise<T>
type MaybeAsyncIterableIterator<T> = T | AsyncIterableIterator<T>

type ExecutionReturn<
  TData = any,
  TExtensions = any,
> = MaybeAsyncIterableIterator<ExecutionResult<TData, TExtensions>>

export type TestkitInstance = {
  execute: (
    operation: DocumentNode | string,
    variables?: Record<string, any>,
    initialContext?: any,
    operationName?: string,
  ) => MaybePromise<ExecutionReturn>
  modifyPlugins: (modifyPluginsFn: ModifyPluginsFn) => void
  mockPhase: (phaseReplacement: PhaseReplacementParams) => void
  wait: (ms: number) => Promise<void>
}

export function createTestkit(
  pluginsOrEnvelop:
    | GetEnvelopedFn<any>
    | Parameters<typeof envelop>['0']['plugins'],
  schema?: GraphQLSchema,
): TestkitInstance {
  const toGraphQLErrorOrThrow = (thrownThing: unknown): GraphQLError => {
    if (thrownThing instanceof GraphQLError) {
      return thrownThing
    }

    throw thrownThing
  }

  const phasesReplacements: PhaseReplacementParams[] = []
  let getEnveloped = Array.isArray(pluginsOrEnvelop)
    ? envelop({
        plugins: [
          ...(schema
            ? [useGraphQLJSEngine(), useSchema(cloneSchema(schema))]
            : [useGraphQLJSEngine()]),
          ...pluginsOrEnvelop,
        ],
      })
    : pluginsOrEnvelop

  return {
    modifyPlugins(modifyPluginsFn: ModifyPluginsFn) {
      getEnveloped = envelop({
        plugins: [
          ...(schema
            ? [useGraphQLJSEngine(), useSchema(cloneSchema(schema))]
            : [useGraphQLJSEngine()]),
          ...modifyPluginsFn(getEnveloped._plugins),
        ],
      })
    },
    mockPhase(phaseReplacement: PhaseReplacementParams) {
      phasesReplacements.push(phaseReplacement)
    },
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    execute: (
      operation,
      variableValues = {},
      initialContext = {},
      operationName?: string,
    ) => {
      const proxy = getEnveloped(initialContext)

      for (const replacement of phasesReplacements) {
        switch (replacement.phase) {
          case 'parse':
            proxy.parse = replacement.fn
            break
          case 'validate':
            proxy.validate = replacement.fn
            break
          case 'subscribe':
            proxy.subscribe = replacement.fn
            break
          case 'execute':
            proxy.execute = replacement.fn
            break
          case 'contextFactory':
            proxy.contextFactory = replacement.fn
            break
        }
      }

      let document: DocumentNode
      try {
        document = isDocumentNode(operation)
          ? operation
          : proxy.parse(operation)
      } catch (err: unknown) {
        return {
          errors: [toGraphQLErrorOrThrow(err)],
        }
      }

      let validationErrors: readonly GraphQLError[]
      try {
        validationErrors = proxy.validate(proxy.schema, document)
      } catch (err: unknown) {
        return {
          errors: [toGraphQLErrorOrThrow(err)],
        }
      }

      if (validationErrors.length > 0) {
        return {
          errors: validationErrors,
        }
      }

      const mainOperation = getOperationAST(document, operationName)

      if (mainOperation == null) {
        return {
          errors: [new GraphQLError('Could not identify main operation.')],
        }
      }

      return handleMaybePromise(
        () =>
          proxy.contextFactory({
            request: {
              headers: {},
              method: 'POST',
              query: '',
              body: {
                query: getDocumentString(document, print),
                variables: variableValues,
              },
            },
            document,
            operation: getDocumentString(document, print),
            variables: variableValues,
            operationName,
            ...initialContext,
          }),
        (contextValue) => {
          if (
            mainOperation.operation === GraphQLJS.OperationTypeNode.SUBSCRIPTION
          ) {
            return proxy.subscribe({
              variableValues,
              contextValue,
              schema: proxy.schema,
              document,
              rootValue: {},
              operationName,
            })
          }

          return proxy.execute({
            variableValues,
            contextValue,
            schema: proxy.schema,
            document,
            rootValue: {},
            operationName,
          })
        },
      )
    },
  }
}

export function assertSingleExecutionValue<TData = any, TExtensions = any>(
  input: ExecutionReturn<TData, TExtensions>,
): asserts input is ExecutionResult<TData, TExtensions> {
  if (isAsyncIterable(input)) {
    throw new Error('Received stream but expected single result')
  }
}

export function assertStreamExecutionValue<TData = any, TExtensions = any>(
  input: ExecutionReturn<TData, TExtensions>,
): asserts input is AsyncIterableIterator<ExecutionResult<TData, TExtensions>> {
  if (!isAsyncIterable(input)) {
    throw new Error(
      'Received single result but expected stream.' + inspect(input),
    )
  }
}

export const collectAsyncIteratorValues = async <TType>(
  asyncIterable: AsyncIterableIterator<TType>,
): Promise<TType[]> => {
  const values: TType[] = []

  for await (const value of asyncIterable) {
    values.push(value)
  }

  return values
}
