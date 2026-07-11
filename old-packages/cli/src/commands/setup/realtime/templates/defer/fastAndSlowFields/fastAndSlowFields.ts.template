import { logger } from 'src/lib/logger'

const wait = (time: number) =>
  new Promise((resolve) => setTimeout(resolve, time))

export const fastField = async () => {
  return 'I am fast'
}

export const slowField = async (_, { waitFor = 5000 }) => {
  logger.debug('waiting on slowField')
  await wait(waitFor)
  return 'I am slow'
}
