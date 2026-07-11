#!/usr/bin/env node

// The process that actually starts an instance of Worker to process jobs.
// Can be run independently with `yarn rw-jobs-worker` but by default is forked
// by `yarn rw-jobs` and either monitored, or detached to run independently.
import process from 'node:process'

import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'

import { PROCESS_TITLE_PREFIX } from '../consts.js'
import type { Worker } from '../core/Worker.js'
import { WorkerConfigIndexNotFoundError } from '../errors.js'
import { loadJobsManager } from '../loaders.js'
import { setupEnv } from '../setupEnv.js'

setupEnv()

const parseArgs = (argv: string[]) => {
  return yargs(hideBin(argv))
    .usage(
      'Starts a single RedwoodJob worker to process background jobs\n\nUsage: $0 [options]',
    )
    .option('index', {
      type: 'number',
      required: true,
      description:
        'The index of the `workers` array from the exported `jobs` config to use to configure this worker',
    })
    .option('id', {
      type: 'number',
      required: true,
      description:
        'The worker count id to identify this worker. ie: if you had `count: 2` in your worker config, you would have two workers with ids 0 and 1',
    })
    .option('workoff', {
      type: 'boolean',
      default: false,
      description: 'Work off all jobs in the queue(s) and exit',
    })
    .option('clear', {
      type: 'boolean',
      default: false,
      description: 'Remove all jobs in all queues and exit',
    })
    .help().argv
}

export const processName = ({
  id,
  queues,
}: {
  id: number
  queues: string | string[]
}) => {
  return `${PROCESS_TITLE_PREFIX}.${[queues].flat().join('-')}.${id}`
}

const setupSignals = ({ worker }: { worker: Worker }) => {
  // if the parent itself receives a ctrl-c it'll pass that to the workers.
  // workers will exit gracefully by setting `forever` to `false` which will tell
  // it not to pick up a new job when done with the current one
  process.on('SIGINT', () => {
    worker.logger.warn(
      `[${process.title}] SIGINT received at ${new Date().toISOString()}, finishing work...`,
    )
    worker.forever = false
  })

  // if the parent itself receives a ctrl-c more than once it'll send SIGTERM
  // instead in which case we exit immediately no matter what state the worker is
  // in
  process.on('SIGTERM', () => {
    worker.logger.warn(
      `[${process.title}] SIGTERM received at ${new Date().toISOString()}, exiting now!`,
    )
    process.exit(0)
  })
}

export const getWorker = async ({
  index,
  id,
  clear,
  workoff,
}: {
  index: number
  id: number
  clear: boolean
  workoff: boolean
}) => {
  let manager

  try {
    manager = await loadJobsManager()
  } catch (e) {
    console.error(e)
    process.exit(1)
  }

  const workerConfig = manager.workers[index]
  if (!workerConfig) {
    throw new WorkerConfigIndexNotFoundError(index)
  }

  return manager.createWorker({
    index,
    clear,
    workoff,
    processName: processName({ id, queues: workerConfig.queue }),
  })
}

const main = async () => {
  const { index, id, clear, workoff } = await parseArgs(process.argv)

  const worker = await getWorker({ index, id, clear, workoff })

  process.title = processName({ id, queues: worker.queues })

  worker.run().then(() => {
    worker.logger.info(`[${process.title}] Worker finished, shutting down.`)
    process.exit(0)
  })

  setupSignals({ worker })
}

// Don't actaully run the worker if we're in a test environment
if (process.env.NODE_ENV !== 'test') {
  main()
}
