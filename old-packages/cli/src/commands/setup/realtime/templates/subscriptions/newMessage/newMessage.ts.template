import gql from 'graphql-tag'

import type { PubSub } from '@redwoodjs/realtime'

import { logger } from 'src/lib/logger'

export const schema = gql`
  type Subscription {
    newMessage(roomId: ID!): Message! @requireAuth
  }
`
export type NewMessageChannel = {
  newMessage: [roomId: string, payload: { from: string; body: string }]
}

export type NewMessageChannelType = PubSub<NewMessageChannel>

/**
 * To test this NewMessage subscription, run the following in one GraphQL Playground to subscribe:
 *
 * subscription ListenForNewMessagesInRoom {
 *   newMessage(roomId: "1") {
 *     body
 *     from
 *   }
 * }
 *
 *
 * And run the following in another GraphQL Playground to publish and send a message to the room:
 *
 * mutation SendMessageToRoom {
 *   sendMessage(input: {roomId: "1", from: "hello", body: "bob"}) {
 *     body
 *     from
 *   }
 * }
 */
const newMessage = {
  newMessage: {
    subscribe: (
      _,
      { roomId },
      { pubSub }: { pubSub: NewMessageChannelType }
    ) => {
      logger.debug({ roomId }, 'newMessage subscription')

      return pubSub.subscribe('newMessage', roomId)
    },
    resolve: (payload) => {
      logger.debug({ payload }, 'newMessage subscription resolve')

      return payload
    },
  },
}

export default newMessage
