import gql from 'graphql-tag'
import { describe, expect, it } from 'vitest'

import { makeSubscriptions } from '../subscriptions/makeSubscriptions'
const countdownSchema = gql`
  type Subscription {
    countdown(from: Int!, interval: Int!): Int!
  }
`

const newMessageSchema = gql`
  type Message {
    from: String
    body: String
  }

  type Subscription {
    newMessage(roomId: ID!): Message!
  }
`
describe('Should map subscription globs to defined structure correctly', () => {
  it('Should map a subscribe correctly', async () => {
    // Mocking what our import-dir plugin would do
    const subscriptionFiles: Parameters<typeof makeSubscriptions>['0'] = {
      countdown_subscription: {
        schema: countdownSchema,
        countdown: {
          async *subscribe(_parent: unknown, { from, interval }) {
            for (let i = from; i >= 0; i--) {
              await new Promise((resolve) =>
                setTimeout(resolve, interval ?? 1000),
              )
              yield { countdown: i }
            }
          },
        },
      },
    }

    const [countdownSubscription] = makeSubscriptions(subscriptionFiles)

    expect(countdownSubscription.schema.kind).toBe('Document')
    expect(countdownSubscription.name).toBe('countdown')
    expect(countdownSubscription.resolvers.subscribe).toBeDefined()
    expect(countdownSubscription.resolvers.resolve).not.toBeDefined()
  })

  it('Should map a subscribe and resolve correctly', async () => {
    // Mocking what our import-dir plugin would do
    const subscriptionFiles: Parameters<typeof makeSubscriptions>[0] = {
      newMessage_subscription: {
        schema: newMessageSchema,
        newMessage: {
          subscribe: (_parent: unknown, { roomId }) => {
            return roomId
          },
          resolve: (payload: string) => {
            return payload
          },
        },
      },
    }

    const [newMessageSubscription] = makeSubscriptions(subscriptionFiles)

    expect(newMessageSubscription.schema.kind).toBe('Document')
    expect(newMessageSubscription.name).toBe('newMessage')
    expect(newMessageSubscription.resolvers.subscribe).toBeDefined()
    expect(newMessageSubscription.resolvers.resolve).toBeDefined()
  })
})
