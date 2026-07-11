import { files as functionFiles } from '../../generate/function/function'
import { createYargsForComponentDestroy } from '../helpers'

export const description = 'Destroy a Function'

export const builder = (yargs) => {
  yargs.positional('name', {
    description: 'Name of the Function',
    type: 'string',
  })
}

export const { command, handler, tasks } = createYargsForComponentDestroy({
  componentName: 'function',
  filesFn: functionFiles,
})
