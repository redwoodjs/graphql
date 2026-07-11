import { Repeater } from '@redwoodjs/realtime'

import { logger } from 'src/lib/logger'

export const alphabet = async () => {
  return new Repeater<string>(async (push, stop) => {
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('')

    const publish = () => {
      const letter = letters.shift()

      if (letter) {
        logger.debug({ letter }, 'publishing letter...')
        push(letter)
      }

      if (letters.length === 0) {
        stop()
      }
    }

    const interval = setInterval(publish, 1000)

    stop.then(() => {
      logger.debug('cancel')
      clearInterval(interval)
    })

    publish()
  })
}
