import gql from 'graphql-tag'

import { Repeater } from '@redwoodjs/realtime'

import { logger } from 'src/lib/logger'

export const schema = gql`
  type Subscription {
    countdown(from: Int!, interval: Int!): Int! @requireAuth
  }
`

/**
 * To test this Countdown subscription, run the following in the GraphQL Playground:
 *
 * subscription CountdownFromInterval {
 *   countdown(from: 100, interval: 10)
 * }
 */
const countdown = {
  countdown: {
    subscribe: (
      _,
      {
        from = 100,
        interval = 10,
      }: {
        from: number
        interval: number
      }
    ) =>
      new Repeater((push, stop) => {
        function decrement() {
          from -= interval

          if (from < 0) {
            logger.debug({ from }, 'stopping as countdown is less than 0')
            stop()
          }

          logger.debug({ from }, 'pushing countdown value ...')
          push(from)
        }

        decrement()

        const delay = setInterval(decrement, 500)

        stop.then(() => {
          clearInterval(delay)
          logger.debug('stopping countdown')
        })
      }),
    resolve: (payload: number) => payload,
  },
}

export default countdown
