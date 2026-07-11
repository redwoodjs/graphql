#!/usr/bin/env node

// Coordinates the worker processes: running attached in [work] mode or
// detaching in [start] mode.

import type { ChildProcess } from 'node:child_process'
import { fork, exec } from 'node:child_process'
import console from 'node:console'
import path from 'node:path'
import process from 'node:process'
import { setTimeout } from 'node:timers'

import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'

import { DEFAULT_LOGGER, PROCESS_TITLE_PREFIX } from '../consts.js'
import { loadJobsManager } from '../loaders.js'
import { setupEnv } from '../setupEnv.js'
import type {
  Adapters,
  BasicLogger,
  WorkerConfig,
  QueueNames,
} from '../types.js'

export type NumWorkersConfig = [number, number][]

setupEnv()

process.title = 'rw-jobs'

const WORKER_PATH = path.join(__dirname, 'rw-jobs-worker.js')

const parseArgs = (argv: string[]) => {
  const commandString = hideBin(argv)

  if (commandString.length === 1 && commandString[0] === 'jobs') {
    commandString.shift()
  }

  const parsed: Record<string, any> = yargs(commandString)
    .usage(
      'Starts the RedwoodJob runner to process background jobs\n\nUsage: rw jobs <command> [options]',
    )
    .command('work', 'Start a worker and process jobs')
    .command('workoff', 'Start a worker and exit after all jobs processed')
    .command('start', 'Start workers in daemon mode')
    .command('stop', 'Stop any daemonized job workers')
    .command('restart', 'Stop and start any daemonized job workers')
    .command('clear', 'Clear the job queue')
    .demandCommand(1, 'You must specify a mode to start in')
    .example(
      'rw jobs work',
      'Start the job workers using the job config and work on jobs until manually stopped',
    )
    .example(
      'rw jobs start',
      'Start the job workers using the job config and detach, running in daemon mode',
    )
    .help()
    .parse(commandString, (_err: any, _argv: any, output: any) => {
      if (output) {
        const newOutput = output.replaceAll('rw-jobs.js', 'rw jobs')
        console.log(newOutput)
      }
    })

  return { command: parsed._[0] }
}

// Builds up an array of arrays, with the worker config index and id based on
// how many workers should use this config. For the following config:
//
// {
//   workers: [
//     {
//       adapter: 'prisma',
//       count: 2,
//       queue: 'default',
//     },
//     {
//       adapter: 'prisma',
//       count: 1,
//       queue: 'email',
//     },
//   ]
// }
//
// The output would be:
//
// [
//   [0, 0], // first array element, first worker
//   [0, 1], // first array element, second worker
//   [1, 0], // second array element, first worker
// ]
export const buildNumWorkers = (config: any) => {
  const workers: NumWorkersConfig = []

  config.map((worker: any, index: number) => {
    for (let id = 0; id < worker.count; id++) {
      workers.push([index, id])
    }
  })

  return workers
}

export const startWorkers = ({
  numWorkers,
  detach = false,
  workoff = false,
  logger,
}: {
  numWorkers: NumWorkersConfig
  detach?: boolean
  workoff?: boolean
  logger: BasicLogger
}) => {
  logger.warn(`Starting ${numWorkers.length} worker(s)...`)

  return numWorkers.map(([index, id]) => {
    // list of args to send to the forked worker script
    const workerArgs = ['--index', index.toString(), '--id', id.toString()]

    if (workoff) {
      workerArgs.push('--workoff')
    }

    // fork the worker process
    const worker = fork(WORKER_PATH, workerArgs, {
      detached: detach,
      stdio: detach ? 'ignore' : 'inherit',
      env: process.env,
    })

    if (detach) {
      worker.unref()
    } else {
      // children stay attached so watch for their exit before exiting parent
      worker.on('exit', (_code) => {})
    }

    return worker
  })
}

// TODO add support for stopping with SIGTERM or SIGKILL?
export const stopWorkers = async ({
  numWorkers,
  signal = 'SIGINT',
  logger,
}: {
  numWorkers: NumWorkersConfig
  signal: string
  logger: BasicLogger
}) => {
  logger.warn(
    `Stopping ${numWorkers.length} worker(s) gracefully (${signal})...`,
  )

  const processIds = await findWorkerProcesses()

  if (processIds.length === 0) {
    logger.warn(`No running workers found.`)
    return
  }

  for (const processId of processIds) {
    logger.info(`Stopping process id ${processId}...`)
    process.kill(processId, signal)

    // wait for the process to actually exit before going to next iteration
    while ((await findWorkerProcesses(processId)).length) {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }
}

export const clearQueue = ({ logger }: { logger: BasicLogger }) => {
  logger.warn(`Starting worker to clear job queue...`)
  fork(WORKER_PATH, ['--clear', '--index', '0', '--id', '0'])
}

const signalSetup = ({
  workers,
  logger,
}: {
  workers: ChildProcess[]
  logger: BasicLogger
}) => {
  // Keep track of how many times the user has pressed ctrl-c
  let sigtermCount = 0

  // If the parent receives a ctrl-c, tell each worker to gracefully exit.
  // If the parent receives a second ctrl-c, exit immediately.
  process.on('SIGINT', () => {
    sigtermCount++
    let message =
      'SIGINT received: shutting down workers gracefully (press Ctrl-C again to exit immediately)...'

    if (sigtermCount > 1) {
      message = 'SIGINT received again, exiting immediately...'
    }

    logger.info(message)

    workers.forEach((worker) => {
      if (sigtermCount > 1) {
        worker.kill('SIGTERM')
      } else {
        worker.kill('SIGINT')
      }
    })
  })
}

// Find the process id of a worker by its title
const findWorkerProcesses = async (id?: number): Promise<number[]> => {
  return new Promise(function (resolve, reject) {
    const platform = process.platform
    const cmd =
      platform === 'win32'
        ? 'tasklist'
        : platform === 'darwin'
          ? 'ps -ax | grep ' + PROCESS_TITLE_PREFIX
          : platform === 'linux'
            ? 'ps -A'
            : ''
    if (cmd === '') {
      resolve([])
    }
    exec(cmd, function (err, stdout) {
      if (err) {
        reject(err)
      }

      const list = stdout.trim().split('\n')
      const matches = list.filter((line) => {
        if (platform == 'darwin' || platform == 'linux') {
          return !line.match('grep')
        }
        return true
      })

      // no job workers running
      if (matches.length === 0) {
        resolve([])
      }

      const pids = matches.map((line) => parseInt(line.split(' ')[0]))

      if (id) {
        // will return the single job worker process ID if still running
        resolve(pids.filter((pid) => pid === id))
      } else {
        // return all job worker process IDs
        resolve(pids)
      }
    })
  })
}

const main = async () => {
  const { command } = parseArgs(process.argv)
  let jobsConfig

  try {
    jobsConfig = await loadJobsManager()
  } catch (e) {
    console.error(e)
    process.exit(1)
  }

  const workerConfig: WorkerConfig<Adapters, QueueNames>[] = jobsConfig.workers
  const numWorkers = buildNumWorkers(workerConfig)
  const logger = jobsConfig.logger ?? DEFAULT_LOGGER

  logger.warn(`Starting RedwoodJob Runner at ${new Date().toISOString()}...`)

  switch (command) {
    case 'start':
      startWorkers({
        numWorkers,
        detach: true,
        logger,
      })
      return process.exit(0)
    case 'stop':
      return await stopWorkers({
        numWorkers,
        signal: 'SIGINT',
        logger,
      })
    case 'restart':
      await stopWorkers({ numWorkers, signal: 'SIGINT', logger })
      startWorkers({
        numWorkers,
        detach: true,
        logger,
      })
      return process.exit(0)
    case 'work':
      return signalSetup({
        workers: startWorkers({
          numWorkers,
          logger,
        }),
        logger,
      })
    case 'workoff':
      return signalSetup({
        workers: startWorkers({
          numWorkers,
          workoff: true,
          logger,
        }),
        logger,
      })
    case 'clear':
      return clearQueue({ logger })
  }
}

// Don't actaully run the worker if we're in a test environment
if (process.env.NODE_ENV !== 'test') {
  main()
}
