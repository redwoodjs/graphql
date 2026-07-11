import type { Plugin } from '@envelop/core'
import { useLiveQuery } from '@envelop/live-query'
import { mergeSchemas } from '@graphql-tools/schema'
import { astFromDirective } from '@graphql-tools/utils'
import { useDeferStream } from '@graphql-yoga/plugin-defer-stream'
import { useGraphQLSSE } from '@graphql-yoga/plugin-graphql-sse'
import { createRedisEventTarget } from '@graphql-yoga/redis-event-target'
import type { CreateRedisEventTargetArgs } from '@graphql-yoga/redis-event-target'
import type { PubSub } from '@graphql-yoga/subscription'
import { createPubSub } from '@graphql-yoga/subscription'
import { GraphQLLiveDirective } from '@n1ru4l/graphql-live-query'
import { InMemoryLiveQueryStore } from '@n1ru4l/in-memory-live-query-store'
import type { execute as defaultExecute } from 'graphql'
import { print } from 'graphql'

export { Repeater } from 'graphql-yoga'

/**
 * We want SubscriptionsGlobs type to be an object with this shape:
 *
 * But not fully supported in TS
 * {
 *   schema: DocumentNode // <-- required
 *   [string]: RedwoodSubscription
 * }
 *
 * Note: This type is duplicated from packages/graphql-server/src/subscriptions/makeSubscriptions
 * so there is no dependency on graphql-server from realtime and vice versa.
 */
export type SubscriptionGlobImports = Record<string, any>

export type { PubSub }

export { createPubSub, InMemoryLiveQueryStore }

export const liveDirectiveTypeDefs = print(
  astFromDirective(GraphQLLiveDirective),
)

export type LiveQueryStorageMechanism =
  | RedisLiveQueryStore
  | InMemoryLiveQueryStore

export type PublishClientType = CreateRedisEventTargetArgs['publishClient']
export type SubscribeClientType = CreateRedisEventTargetArgs['subscribeClient']

/**
 * Configure RedwoodJS Realtime
 *
 * Realtime supports Live Queries and Subscriptions over GraphQL SSE.
 *
 * Live Queries are GraphQL queries that are automatically re-run when the data they depend on changes.
 *
 * Subscriptions are GraphQL queries that are run when a client subscribes to a channel.
 *
 * Redwood Realtime
 *  - uses a publish/subscribe model to broadcast data to clients.
 *  - uses a store to persist Live Query and Subscription data.
 *
 * Redwood Realtime supports in-memory and Redis stores:
 * - In-memory stores are useful for development and testing.
 * - Redis stores are useful for production.
 *
 */
export type RedwoodRealtimeOptions = {
  enableDeferStream?: boolean
  liveQueries?: {
    /**
     * @description Redwood Realtime supports in-memory and Redis stores.
     * @default 'in-memory'
     */
    store:
      | 'in-memory'
      | {
          redis: {
            /**
             * @description The channel to publish invalidations to.
             * @default 'live-query-invalidations'
             */
            channel?: string
            publishClient: PublishClientType
            subscribeClient: SubscribeClientType
          }
        }
  }
  subscriptions?: {
    /**
     * @description Redwood Realtime supports in-memory and Redis stores.
     * @default 'in-memory'
     */
    store:
      | 'in-memory'
      | {
          redis: {
            publishClient: PublishClientType
            subscribeClient: SubscribeClientType
          }
        }
    /**
     * @description Subscriptions passed from the glob import:
     * import subscriptions from 'src/subscriptions/**\/*.{js,ts}'
     */
    subscriptions: SubscriptionGlobImports
  }
}

export class RedisLiveQueryStore {
  pub: PublishClientType
  sub: SubscribeClientType
  channel: string
  liveQueryStore: InMemoryLiveQueryStore

  constructor(
    pub: PublishClientType,
    sub: SubscribeClientType,
    channel: string,
    liveQueryStore: InMemoryLiveQueryStore,
  ) {
    this.pub = pub
    this.sub = sub
    this.liveQueryStore = liveQueryStore
    this.channel = channel

    this.sub.subscribe(this.channel, (err) => {
      if (err) {
        throw err
      }
    })

    this.sub.on('message', (channel, resourceIdentifier) => {
      if (channel === this.channel && resourceIdentifier) {
        this.liveQueryStore.invalidate(resourceIdentifier)
      }
    })
  }

  async invalidate(identifiers: string[] | string) {
    if (typeof identifiers === 'string') {
      identifiers = [identifiers]
    }
    for (const identifier of identifiers) {
      this.pub.publish(this.channel, identifier)
    }
  }

  makeExecute(execute: typeof defaultExecute) {
    return this.liveQueryStore.makeExecute(execute)
  }
}

// These are exported to allow access to the store and pubsub outside of graphql execution
export let liveQueryStore: LiveQueryStorageMechanism | undefined = undefined
export let pubSub: ReturnType<typeof createPubSub> | undefined = undefined

export const useRedwoodRealtime = (options: RedwoodRealtimeOptions): Plugin => {
  let liveQueriesEnabled = false
  let subscriptionsEnabled = false

  let liveQueryPlugin = {} as Plugin
  const inMemoryLiveQueryStore = new InMemoryLiveQueryStore()

  liveQueryStore = {} as LiveQueryStorageMechanism
  pubSub = {} as ReturnType<typeof createPubSub>

  /**
   * This symbol is added to the schema extensions for checking whether the live query was added to the schema only once.
   */
  const wasLiveQueryAdded = Symbol.for('useRedwoodRealtime.wasLiveQueryAdded')

  if (options.liveQueries?.store) {
    if (options.liveQueries.store === 'in-memory') {
      liveQueriesEnabled = true

      liveQueryStore = inMemoryLiveQueryStore
      liveQueryPlugin = useLiveQuery({
        liveQueryStore,
      })
    } else if (options.liveQueries.store.redis) {
      liveQueriesEnabled = true

      liveQueryStore = new RedisLiveQueryStore(
        options.liveQueries.store.redis.publishClient,
        options.liveQueries.store.redis.subscribeClient,
        options.liveQueries.store.redis.channel || 'live-query-invalidations',
        inMemoryLiveQueryStore,
      ) as unknown as InMemoryLiveQueryStore
      liveQueryPlugin = useLiveQuery({
        liveQueryStore,
      })
    } else {
      throw new Error('Invalid live query store configuration.')
    }
  }

  if (options.subscriptions) {
    if (options.subscriptions.store === 'in-memory') {
      subscriptionsEnabled = true

      pubSub = createPubSub()
    } else if (options.subscriptions.store.redis) {
      subscriptionsEnabled = true

      const eventTarget = createRedisEventTarget({
        publishClient: options.subscriptions.store.redis.publishClient,
        subscribeClient: options.subscriptions.store.redis.subscribeClient,
      })

      pubSub = createPubSub({ eventTarget })
    }
  }

  return {
    onSchemaChange({ replaceSchema, schema }) {
      if (schema.extensions?.[wasLiveQueryAdded] === true) {
        return
      }

      if (liveQueriesEnabled) {
        const liveSchema = mergeSchemas({
          schemas: [schema],
          typeDefs: [liveDirectiveTypeDefs],
        })

        liveSchema.extensions = {
          ...schema.extensions,
          [wasLiveQueryAdded]: true,
        }

        replaceSchema(liveSchema)
      }
    },
    onPluginInit({ addPlugin }) {
      if (liveQueriesEnabled) {
        addPlugin(liveQueryPlugin)
      }
      if (subscriptionsEnabled) {
        addPlugin(useGraphQLSSE() as Plugin<object>)
      }
      if (options.enableDeferStream) {
        addPlugin(useDeferStream() as Plugin<object>)
      }
    },
    onContextBuilding() {
      return ({ extendContext }) => {
        extendContext({
          liveQueryStore: liveQueriesEnabled && liveQueryStore,
          pubSub: subscriptionsEnabled && pubSub,
        })
      }
    },
  }
}
